import { NextRequest, NextResponse } from 'next/server'
import { getPaymentVerification, getSkillById, markPaymentConsumed, markPaymentVerified, recordSkillExecution, reservePaymentTxHash, releasePaymentTxHash } from '@/lib/store'
import { verifySkillPaymentTransaction } from '@/lib/payments'
import { isPaymentConsumedDurable, markPaymentConsumedDurable } from '@/lib/db/payments'
import { ensureHydrated } from '@/lib/hydration'
import { validatePlatformSecret, validateAgentApiKeyAsync, ensureAgentInStore } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { ExecutionReceipt, ComputeProvider } from '@/lib/types'
import { executeSkillWith0GCompute, toUserFacingComputeError } from '@/lib/0g-compute-inference'
import { executeSkillWithRouter, toUserFacingRouterError } from '@/lib/0g-compute-router'
import { createHash } from 'crypto'
import { v4 as uuid } from 'uuid'

// Cap user input so a single call can't balloon LLM cost or memory (#6).
const MAX_USER_INPUT_CHARS = 12_000

export async function POST(req: NextRequest) {
  // Set once a paid payment is reserved-but-not-yet-consumed. Any failure path
  // (execution error or unexpected throw) releases it so the user can retry
  // with the same valid payment rather than paying twice.
  let unconsumedTxHash: string | null = null
  const releaseUnconsumed = () => {
    if (unconsumedTxHash) {
      releasePaymentTxHash(unconsumedTxHash)
      unconsumedTxHash = null
    }
  }

  try {
    // ── Rate limiting (#5): each skill execution hits a paid LLM, so cap it. ──
    const limited = rateLimit(req, { maxRequests: 20, windowMs: 60_000 })
    if (limited) return limited

    await ensureHydrated()
    const { skillId, userInput, paymentProof, computeProvider: requestedProvider, zgProviderAddress, agentId } = await req.json()
    if (!skillId || !userInput) return NextResponse.json({ error: 'skillId and userInput required' }, { status: 400 })
    if (typeof userInput !== 'string' || userInput.length > MAX_USER_INPUT_CHARS) {
      return NextResponse.json(
        { error: `userInput must be a string of at most ${MAX_USER_INPUT_CHARS} characters.` },
        { status: 400 }
      )
    }

    if (agentId) await ensureAgentInStore(agentId)
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = agentId && apiKey && await validateAgentApiKeyAsync(agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
    }
    const skill = getSkillById(skillId)
    if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    const skillPrice = parseFloat(skill.price)
    let verifiedPayment = null

    // ── Payment verification (only for paid skills) ──
    if (skillPrice > 0) {
      const txHash = paymentProof?.txHash
      if (!txHash) {
        return NextResponse.json({
          error: 'This is a paid skill. Send paymentProof.txHash with a valid on-chain payment transaction.',
          price: skill.price,
          priceUnit: 'OG',
        }, { status: 402 })
      }

      // (#3) Durable replay check — survives restarts/redeploys.
      if (await isPaymentConsumedDurable(txHash)) {
        return NextResponse.json({ error: 'This payment has already been used for an execution.' }, { status: 409 })
      }
      // Legacy in-memory record check (kept for parity).
      if (getPaymentVerification(txHash)?.consumedAt) {
        return NextResponse.json({ error: 'This payment has already been used for an execution.' }, { status: 409 })
      }

      // (#2) Atomically CLAIM the txHash BEFORE the slow on-chain verify, so two
      // concurrent requests can't both slip through the check above. The loser
      // of the race gets 409; the winner proceeds and releases on failure.
      if (!reservePaymentTxHash(txHash)) {
        return NextResponse.json({ error: 'This payment is already being processed.' }, { status: 409 })
      }
      // Reserved but not yet consumed — track for release on any failure below.
      unconsumedTxHash = txHash

      try {
        verifiedPayment = await verifySkillPaymentTransaction(skill, txHash)
        markPaymentVerified(verifiedPayment)
        // NOTE: we intentionally do NOT consume the payment yet. The txHash stays
        // RESERVED (blocking concurrent reuse) but is only marked consumed once
        // the LLM execution below actually succeeds. If execution fails, we
        // release the reservation so the user can retry with the same valid
        // payment instead of paying twice for a service-side error.
      } catch (payErr: any) {
        // Verification failed — release the reservation so a legit retry works.
        releaseUnconsumed()
        return NextResponse.json({
          error: `Payment verification failed: ${payErr.message}`,
          hint: 'Make sure the transaction confirmed on 0G Chain and matches the skill price.',
        }, { status: 402 })
      }
    }

    // ── Determine compute provider ──
    const computeProvider: ComputeProvider = resolveComputeProvider(requestedProvider)

    let output: string
    let model: string
    let tokensUsed = 0
    let computeNode: string
    let zgMeta: { providerAddress?: string; chatID?: string; verified?: boolean } = {}

    // ── LLM Execution — Hybrid Provider Selection ──
    if (computeProvider === '0g-compute') {
      // ════════════════════════════════════════════════════
      //  0G COMPUTE NETWORK (Decentralized)
      // ════════════════════════════════════════════════════
      try {
        const result = await executeSkillWith0GCompute(
          skill.prompt,
          userInput,
          zgProviderAddress
        )
        output = result.output
        model = result.model
        tokensUsed = result.tokensUsed
        computeNode = '0g-compute-decentralized'
        zgMeta = {
          providerAddress: result.providerAddress,
          chatID: result.chatID,
          verified: result.verified,
        }
      } catch (error) {
        releaseUnconsumed() // execution failed — let the paid user retry
        return NextResponse.json({
          error: toUserFacingComputeError(error),
          computeProvider: '0g-compute',
          hint: 'Ensure your 0G Compute ledger is funded and a chatbot provider is available.',
        }, { status: 500 })
      }
    } else if (computeProvider === '0g-router') {
      // ════════════════════════════════════════════════════
      //  0G ROUTER (OpenAI-compatible, auto-failover)
      // ════════════════════════════════════════════════════
      try {
        const result = await executeSkillWithRouter(skill.prompt, userInput)
        output = result.output
        model = result.model
        tokensUsed = result.tokensUsed
        computeNode = '0g-router'
      } catch (error) {
        releaseUnconsumed() // execution failed — let the paid user retry
        return NextResponse.json({
          error: toUserFacingRouterError(error),
          computeProvider: '0g-router',
          hint: 'Ensure ZG_ROUTER_API_KEY is set and your Router account is funded at https://pc.0g.ai',
        }, { status: 500 })
      }
    } else if (computeProvider === 'fireworks') {
      // ════════════════════════════════════════════════════
      //  FIREWORKS AI (Centralized)
      // ════════════════════════════════════════════════════
      const fireworksKey = process.env.FIREWORKS_API_KEY
      if (!fireworksKey || fireworksKey === 'your_fireworks_key_here') {
        releaseUnconsumed() // can't execute — let the paid user retry elsewhere
        return NextResponse.json({
          error: 'FIREWORKS_API_KEY is not configured. Add it to .env.local or choose a different compute provider.',
          computeProvider: 'fireworks',
        }, { status: 500 })
      }

      const OpenAI = (await import('openai')).default
      const client = new OpenAI({
        apiKey: fireworksKey,
        baseURL: 'https://api.fireworks.ai/inference/v1',
      })

      const fireworksModel = process.env.FIREWORKS_MODEL || 'accounts/fireworks/models/deepseek-v3'
      const response = await client.chat.completions.create({
        model: fireworksModel,
        max_tokens: 1024,
        temperature: 0.4,
        messages: [
          { role: 'system', content: skill.prompt },
          { role: 'user', content: userInput },
        ],
      })

      output = response.choices[0]?.message?.content ?? 'No output'
      model = fireworksModel
      tokensUsed = response.usage?.total_tokens ?? 0
      computeNode = 'fireworks-serverless'
    } else {
      releaseUnconsumed() // never executed — let the paid user retry
      return NextResponse.json({ error: 'Invalid compute provider selected.' }, { status: 400 })
    }

    // ── Execution succeeded — NOW consume the payment (in-memory + durable). ──
    // Past this point the user has their output, so the payment is rightfully
    // spent and must not be replayable.
    if (skillPrice > 0 && unconsumedTxHash) {
      markPaymentConsumed(unconsumedTxHash)
      await markPaymentConsumedDurable(unconsumedTxHash, skill.id)
      unconsumedTxHash = null // consumed; keep the in-memory reservation held
    }

    recordSkillExecution(skillId)

    // ── Build & Upload Execution Receipt to 0G ──
    const receipt: ExecutionReceipt = {
      receiptId: `rcpt_${uuid().slice(0, 12)}`,
      skillId: skill.id,
      skillName: skill.name,
      inputHash: createHash('sha256').update(userInput).digest('hex'),
      outputHash: createHash('sha256').update(output).digest('hex'),
      model,
      tokensUsed,
      costOg: skill.price,
      computeNode,
      timestamp: Date.now(),
      paymentTxHash: verifiedPayment?.txHash,
    }

    let receiptStorageHash: string | undefined
    try {
      receiptStorageHash = await uploadToStorage(receipt)
      receipt.storageHash = receiptStorageHash
      console.log(`📄 Execution receipt ${receipt.receiptId} → 0G: ${receiptStorageHash}`)
      console.log(`   Explorer: ${getExplorerUrl(receiptStorageHash)}`)
    } catch (err: any) {
      console.warn(`⚠ Receipt upload failed (non-blocking): ${err.message}`)
    }

    return NextResponse.json({
      output,
      skillName: skill.name,
      model,
      tokensUsed,
      fee: skillPrice > 0 ? (skillPrice * 0.05).toFixed(6) : '0',
      computeNode,
      computeProvider,
      paymentTxHash: verifiedPayment?.txHash,
      paymentVerified: !!verifiedPayment,
      freeSkill: skillPrice === 0,
      // 0G Compute specific metadata
      zgProviderAddress: zgMeta.providerAddress,
      zgChatID: zgMeta.chatID,
      zgVerified: zgMeta.verified,
      receipt: {
        receiptId: receipt.receiptId,
        storageHash: receiptStorageHash,
        explorerUrl: receiptStorageHash ? getExplorerUrl(receiptStorageHash) : undefined,
      },
    })
  } catch (e: any) {
    // Unexpected failure after a payment was reserved (e.g. provider threw):
    // release it so the user isn't charged for an execution that never landed.
    releaseUnconsumed()
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * Resolve which compute provider to use.
 * Priority: explicit request → env preference → auto-detect available.
 */
function resolveComputeProvider(requested?: string): ComputeProvider {
  const validProviders: ComputeProvider[] = ['0g-compute', '0g-router', 'fireworks']
  if (validProviders.includes(requested as ComputeProvider)) {
    return requested as ComputeProvider
  }

  // Check env-level default
  const envDefault = process.env.DEFAULT_COMPUTE_PROVIDER as ComputeProvider | undefined
  if (envDefault && validProviders.includes(envDefault)) {
    return envDefault
  }

  // Auto-detect: prefer Router → Fireworks → Direct
  const routerKey = process.env.ZG_ROUTER_API_KEY
  if (routerKey && routerKey !== 'sk-your_router_key_here') return '0g-router'

  const fireworksKey = process.env.FIREWORKS_API_KEY
  if (fireworksKey && fireworksKey !== 'your_fireworks_key_here') return 'fireworks'

  // Final fallback: try 0G direct compute if wallet is configured
  if (process.env.WALLET_PRIVATE_KEY) return '0g-compute'

  return 'fireworks'
}
