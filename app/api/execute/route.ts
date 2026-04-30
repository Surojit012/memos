import { NextRequest, NextResponse } from 'next/server'
import { getPaymentVerification, getSkillById, markPaymentConsumed, markPaymentVerified, recordSkillExecution } from '@/lib/store'
import { verifySkillPaymentTransaction } from '@/lib/payments'
import { ensureHydrated } from '@/lib/hydration'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { ExecutionReceipt, ComputeProvider } from '@/lib/types'
import { executeSkillWith0GCompute, toUserFacingComputeError } from '@/lib/0g-compute-inference'
import { executeSkillWithRouter, toUserFacingRouterError } from '@/lib/0g-compute-router'
import { createHash } from 'crypto'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    await ensureHydrated()
    const { skillId, userInput, paymentProof, computeProvider: requestedProvider, zgProviderAddress } = await req.json()
    if (!skillId || !userInput) return NextResponse.json({ error: 'skillId and userInput required' }, { status: 400 })
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

      const existingVerification = getPaymentVerification(txHash)
      if (existingVerification?.consumedAt) {
        return NextResponse.json({ error: 'This payment has already been used for an execution.' }, { status: 409 })
      }

      try {
        verifiedPayment = await verifySkillPaymentTransaction(skill, txHash)
        markPaymentVerified(existingVerification || verifiedPayment)
        markPaymentConsumed(txHash)
      } catch (payErr: any) {
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
      return NextResponse.json({ error: 'Invalid compute provider selected.' }, { status: 400 })
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
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
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
