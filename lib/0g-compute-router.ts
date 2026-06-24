/**
 * lib/0g-compute-router.ts
 *
 * 0G Compute Router — OpenAI-compatible API endpoint.
 * https://router-api.0g.ai/v1
 *
 * Advantages over Direct SDK:
 * - Single unified balance (no per-provider sub-accounts)
 * - Automatic provider failover & load balancing
 * - API key auth (no wallet signing per request)
 * - Provider routing by latency/price
 * - Built-in processResponse() / fee settlement
 *
 * Setup:
 * 1. Visit https://pc.0g.ai, connect wallet, deposit 0G tokens
 * 2. Dashboard → API Keys → create key with 'inference' permission
 * 3. Set ZG_ROUTER_API_KEY=sk-... in .env.local
 */

// Base URL differs between mainnet and testnet — they are fully separate
// environments with different keys. Mainnet: https://router-api.0g.ai/v1.
// Testnet (pc.testnet.0g.ai): the partner-hosted router below. Override with
// ZG_ROUTER_BASE_URL in .env.local to switch networks.
const ROUTER_BASE_URL =
  process.env.ZG_ROUTER_BASE_URL || 'https://router-api-testnet.integratenetwork.work/v1'

function getRouterApiKey(): string {
  const key = process.env.ZG_ROUTER_API_KEY
  if (!key || key === 'sk-your_router_key_here') {
    throw new Error(
      '0G Router API key is not configured. ' +
      'Visit https://pc.0g.ai → API Keys → create a key, then set ZG_ROUTER_API_KEY in .env.local'
    )
  }
  return key
}

// ── Chat Completion ──────────────────────────────────────────

export async function routerChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: {
    model?: string
    sortBy?: 'latency' | 'price'
    providerAddress?: string
  }
): Promise<{
  output: string
  model: string
  tokensUsed: number
  computeNode: string
}> {
  const apiKey = getRouterApiKey()
  const model = options?.model || process.env.ZG_ROUTER_MODEL || 'qwen2.5-omni'

  const body: any = {
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.4,
  }

  // Provider routing hints
  if (options?.sortBy) {
    body.provider = { sort: options.sortBy }
  }
  if (options?.providerAddress) {
    body.provider = { ...body.provider, address: options.providerAddress }
  }

  const response = await fetch(`${ROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.error?.message || data.message || `0G Router API error: HTTP ${response.status}`
    )
  }

  return {
    output: data.choices?.[0]?.message?.content ?? 'No output',
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens ?? 0,
    computeNode: '0g-router',
  }
}

// ── Skill Execution ──────────────────────────────────────────

export async function executeSkillWithRouter(
  systemPrompt: string,
  userInput: string
) {
  return routerChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ], { sortBy: 'price' })
}

// ── Account Info ─────────────────────────────────────────────

export async function getRouterBalance(): Promise<{ balance: string; currency: string }> {
  const apiKey = getRouterApiKey()
  const response = await fetch(`${ROUTER_BASE_URL}/account/balance`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch balance')
  return { balance: String(data.balance ?? '0'), currency: data.currency ?? '0G' }
}

export async function getRouterUsageStats(): Promise<any> {
  const apiKey = getRouterApiKey()
  const response = await fetch(`${ROUTER_BASE_URL}/account/usage/stats`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch usage')
  return data
}

export async function listRouterModels(): Promise<Array<{ id: string; object: string }>> {
  // /v1/models does not require auth
  const response = await fetch(`${ROUTER_BASE_URL}/models`)
  const data = await response.json().catch(() => ({}))
  return data.data || []
}

// ── Error Helper ─────────────────────────────────────────────

export function toUserFacingRouterError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('API key')) return message
  if (message.toLowerCase().includes('insufficient')) {
    return '0G Router account has insufficient balance. Visit https://pc.0g.ai to deposit more 0G tokens.'
  }
  if (message.includes('401') || message.includes('Unauthorized')) {
    return '0G Router API key is invalid. Check ZG_ROUTER_API_KEY in .env.local'
  }
  return `0G Router inference failed: ${message}`
}
