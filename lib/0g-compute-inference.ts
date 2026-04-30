/**
 * lib/0g-compute-inference.ts
 *
 * Full 0G Compute Network inference integration.
 * Follows the official 0g-compute-skills patterns exactly:
 * - createZGComputeNetworkBroker for authenticated requests
 * - createZGComputeNetworkReadOnlyBroker for provider discovery
 * - processResponse() after every API response for fee settlement + TEE verification
 * - ZG-Res-Key header extraction for chatID
 *
 * Reference: https://github.com/0gfoundation/0g-compute-skills
 */

import { createZGComputeNetworkBroker, createZGComputeNetworkReadOnlyBroker } from '@0glabs/0g-serving-broker'
import { ethers } from 'ethers'
import { get0GNetworkConfig, getPublic0GNetworkConfig } from './0g-network'
import type { ZGComputeService, ZGInferenceResult } from './types'

// ── Authenticated broker (server-side, needs private key) ────

async function getAuthenticatedBroker() {
  const network = get0GNetworkConfig()
  if (!network.walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is missing. Add it to .env.local to use 0G Compute.')
  }
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const wallet = new ethers.Wallet(network.walletPrivateKey, provider)
  return createZGComputeNetworkBroker(wallet)
}

// ── Read-only broker (provider discovery, no key needed) ─────

async function getReadOnlyBroker() {
  const network = getPublic0GNetworkConfig()
  return createZGComputeNetworkReadOnlyBroker(network.rpcUrl, network.chainId)
}

// ── Provider Discovery ───────────────────────────────────────

export async function listComputeProviders(serviceType?: string): Promise<ZGComputeService[]> {
  try {
    const broker = await getReadOnlyBroker()
    const services = await broker.inference.listServiceWithDetail(0, 100, true)

    let filtered = services
    if (serviceType) {
      filtered = services.filter((s: any) => s.serviceType === serviceType)
    }

    return filtered.map((s: any) => ({
      provider: s.provider,
      model: s.model || 'unknown',
      serviceType: s.serviceType || 'chatbot',
      inputPrice: String(s.inputPrice || '0'),
      outputPrice: String(s.outputPrice || '0'),
      verifiability: s.verifiability || '',
      url: s.url || '',
    }))
  } catch (error) {
    console.error('Failed to list 0G Compute providers:', error)
    return []
  }
}

export async function listChatProviders(): Promise<ZGComputeService[]> {
  return listComputeProviders('chatbot')
}

// ── Chat Completion (Standard) ───────────────────────────────

export async function chatCompletion(
  providerAddress: string,
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string }
): Promise<ZGInferenceResult> {
  const broker = await getAuthenticatedBroker()

  // Acknowledge provider (safe to call multiple times)
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress)
  } catch {
    // May already be acknowledged
  }

  // Get service metadata
  const { endpoint, model: discoveredModel } = await broker.inference.getServiceMetadata(providerAddress)
  const activeModel = options?.model || discoveredModel

  // Generate auth headers
  const headers = await broker.inference.getRequestHeaders(providerAddress)

  // Make inference request
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ messages, model: activeModel }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `0G Compute HTTP ${response.status}`)
  }

  // Extract chatID — always try ZG-Res-Key header first
  let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key')
  if (!chatID) chatID = data.id // fallback: completion ID from response body

  // CRITICAL: Always call processResponse for fee settlement + TEE verification
  let verified = false
  try {
    const result = await broker.inference.processResponse(
      providerAddress,
      chatID || '',
      JSON.stringify(data.usage || {})
    )
    verified = !!result
  } catch (err) {
    console.warn('processResponse warning:', err)
  }

  const output = data.choices?.[0]?.message?.content ?? ''
  const tokensUsed = (data.usage?.total_tokens ?? 0) ||
    ((data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0))

  return {
    output,
    model: activeModel,
    tokensUsed,
    providerAddress,
    chatID: chatID || '',
    verified,
    serviceType: 'chatbot',
  }
}

// ── Chat Completion (Streaming) ──────────────────────────────

export async function* chatCompletionStream(
  providerAddress: string,
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string }
): AsyncGenerator<{ type: 'chunk' | 'done'; content?: string; result?: ZGInferenceResult }> {
  const broker = await getAuthenticatedBroker()

  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress)
  } catch {
    // May already be acknowledged
  }

  const { endpoint, model: discoveredModel } = await broker.inference.getServiceMetadata(providerAddress)
  const activeModel = options?.model || discoveredModel
  const headers = await broker.inference.getRequestHeaders(providerAddress)

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ messages, model: activeModel, stream: true }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error?.message || `0G Compute HTTP ${response.status}`)
  }

  // Extract chatID from headers
  let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key')
  let usage: any = null
  let streamChatID: string | null = null
  let fullContent = ''

  const decoder = new TextDecoder()
  const reader = response.body!.getReader()
  let rawBody = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    rawBody += chunk

    // Parse SSE lines for content deltas
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue

      try {
        const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
        const message = JSON.parse(jsonStr)

        if (!streamChatID && message.id) streamChatID = message.id
        if (message.usage) usage = message.usage

        const delta = message.choices?.[0]?.delta?.content
        if (delta) {
          fullContent += delta
          yield { type: 'chunk', content: delta }
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  // processResponse with the best chatID
  const finalChatID = chatID || streamChatID || ''
  let verified = false
  try {
    const result = await broker.inference.processResponse(
      providerAddress,
      finalChatID,
      JSON.stringify(usage || {})
    )
    verified = !!result
  } catch (err) {
    console.warn('processResponse warning:', err)
  }

  yield {
    type: 'done',
    result: {
      output: fullContent,
      model: activeModel,
      tokensUsed: usage?.total_tokens ?? 0,
      providerAddress,
      chatID: finalChatID,
      verified,
      serviceType: 'chatbot',
    },
  }
}

// ── Skill Execution via 0G Compute ───────────────────────────

export async function executeSkillWith0GCompute(
  systemPrompt: string,
  userInput: string,
  providerAddress?: string
): Promise<ZGInferenceResult> {
  // If no provider specified, auto-discover the cheapest chatbot provider
  let targetProvider = providerAddress
  if (!targetProvider) {
    targetProvider = process.env.ZG_COMPUTE_CHAT_PROVIDER || ''
  }
  if (!targetProvider) {
    const providers = await listChatProviders()
    if (providers.length === 0) {
      throw new Error(
        'No chatbot providers available on the 0G Compute Network right now. ' +
        'Try again later or set ZG_COMPUTE_CHAT_PROVIDER manually.'
      )
    }
    // Pick the cheapest one
    const sorted = [...providers].sort((a, b) => Number(a.inputPrice) - Number(b.inputPrice))
    targetProvider = sorted[0].provider
  }

  return chatCompletion(targetProvider, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ])
}

// ── User-facing error messages ───────────────────────────────

export function toUserFacingComputeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.toLowerCase().includes('insufficient')) {
    return '0G Compute account has insufficient funds. Deposit and transfer inference funds via the Dashboard → Compute Funding tab.'
  }
  if (message.toLowerCase().includes('acknowled')) {
    return '0G Compute provider is not acknowledged. The system will auto-acknowledge on next request.'
  }
  if (message.toLowerCase().includes('no chatbot provider')) {
    return message
  }
  return `0G Compute inference failed: ${message}`
}
