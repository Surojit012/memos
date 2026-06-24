import { ethers } from 'ethers'
import { createHmac } from 'crypto'
import { getAgent, upsertHydratedAgent, getWalletNonce, incrementWalletNonce } from './store'
import type { AgentIdentity } from './types'

/**
 * Verifies an Ethereum message signature.
 * Used to prove ownership of a wallet address during agent registration.
 */
export function verifyWalletSignature(address: string, message: string, signature: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

/**
 * Verifies a wallet signature WITH nonce-based replay protection.
 * The nonce is tracked in the 0G manifest (per wallet).
 *
 * Expected message format: "Register agent <agentId> on memos | nonce: <N>"
 * or any message ending with " | nonce: <N>"
 */
export function verifyWalletSignatureWithNonce(
  address: string,
  message: string,
  signature: string
): { valid: boolean; error?: string } {
  // Step 1: Verify signature
  if (!verifyWalletSignature(address, message, signature)) {
    return { valid: false, error: 'Invalid signature. Ownership of wallet address not proven.' }
  }

  // Step 2: Extract and validate nonce
  const nonceMatch = message.match(/\| nonce: (\d+)$/)
  if (!nonceMatch) {
    return {
      valid: false,
      error: 'Message must include a nonce for replay protection. Expected format: "... | nonce: <N>"',
    }
  }

  const providedNonce = parseInt(nonceMatch[1], 10)
  const expectedNonce = getWalletNonce(address)

  if (providedNonce <= expectedNonce) {
    return {
      valid: false,
      error: `Nonce ${providedNonce} has already been used. Current nonce: ${expectedNonce}. Use nonce ${expectedNonce + 1}.`,
    }
  }

  // Valid nonce — increment
  incrementWalletNonce(address)
  return { valid: true }
}

/**
 * Generate an HMAC-signed API key.
 * The key is cryptographically tied to the wallet address and agent ID.
 * This means API keys can be verified without database lookups.
 */
export function generateHmacApiKey(agentId: string, ownerAddress: string): string {
  const secret = getHmacSecret()
  const payload = `${agentId}:${ownerAddress.toLowerCase()}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return `mos_${hmac.slice(0, 32)}`
}

/**
 * Resolve the HMAC secret, failing loudly in production if not configured.
 */
function getHmacSecret(): string {
  const secret = process.env.PLATFORM_HMAC_SECRET || process.env.MEMORY_SERVICE_SECRET
  if (secret) return secret
  if (isDev()) {
    // Only allow default in development — logged so it's obvious
    console.warn('⚠ [AUTH] Using insecure default HMAC secret. Set PLATFORM_HMAC_SECRET in production.')
    return 'memos-dev-secret'
  }
  throw new Error('PLATFORM_HMAC_SECRET or MEMORY_SERVICE_SECRET must be set in production.')
}

/**
 * Check if we're running in development mode.
 */
function isDev(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Resurrect a Privy-provisioned agent from Supabase into the in-memory store.
 *
 * Privy provisioning writes the (agentId, apiKey) mapping into the `users` table
 * but never seeds the in-memory store. After a dev-server restart, or for any
 * Privy user whose `/api/auth/provision` call has been short-circuited by
 * sessionStorage caching, `getAgent()` will miss and every auth check fails.
 *
 * This is the bridge: pull the DB record, mint an AgentIdentity shell, and
 * upsert it so the rest of the app sees a valid agent.
 *
 * Safe to call when the agent already exists in RAM — it returns without I/O
 * for that case.
 */
export async function ensureAgentInStore(agentId: string): Promise<AgentIdentity | null> {
  const cached = getAgent(agentId)
  if (cached) return cached

  try {
    // Lazy import to avoid pulling Supabase into modules that never need it.
    const { getUserByAgentId } = await import('./db/client')
    const user = await getUserByAgentId(agentId)
    if (!user) return null

    const synthetic: AgentIdentity = {
      agentId: user.agent_id,
      name: user.agent_id,
      createdAt: new Date(user.created_at).getTime() || Date.now(),
      memoryCount: 0,
      skillsPublished: 0,
      totalReads: 0,
      totalEarned: 0,
      storageUsed: 0,
      openClawConnected: false,
      apiKey: user.api_key,
      ownerAddress: user.privy_user_id, // tag with the Privy identity for ownership checks
    }
    upsertHydratedAgent(synthetic)

    // Restore the agent's memories + skills from their 0G manifest pointer.
    // Privy agents aren't on-chain, so this Supabase-stored hash is how their
    // brain survives a server restart. Memories still live on 0G Storage.
    if (user.manifest_hash) {
      try {
        const { loadAgentManifest } = await import('./0g-manifest')
        const manifest = await loadAgentManifest(user.manifest_hash)
        if (manifest) {
          const { upsertHydratedMemory, upsertHydratedSkill } = await import('./store')
          manifest.memories?.forEach((m) => upsertHydratedMemory(m))
          manifest.skills?.forEach((s) => upsertHydratedSkill(s))
          console.log(
            `⚡ Restored ${manifest.memories?.length ?? 0} memories, ` +
            `${manifest.skills?.length ?? 0} skills for [${agentId}] from 0G manifest`
          )
        }
      } catch (mErr) {
        console.warn(`[auth] manifest restore failed for [${agentId}]:`, (mErr as Error).message)
      }
    }

    return synthetic
  } catch (err) {
    console.warn('[auth] ensureAgentInStore: DB lookup failed:', (err as Error).message)
    return null
  }
}

/**
 * Validate an HMAC API key.
 * Checks against both the HMAC-generated key AND the stored key (backwards compat).
 */
export function validateAgentApiKey(agentId: string, apiKey: string): boolean {
  const agent = getAgent(agentId)
  if (!agent) return false

  // Check stored key first (backwards compat)
  if (agent.apiKey && agent.apiKey === apiKey) return true

  // Check HMAC key if agent has an owner
  if (agent.ownerAddress) {
    const expectedKey = generateHmacApiKey(agentId, agent.ownerAddress)
    return expectedKey === apiKey
  }

  return false
}

/**
 * Multi-key validation (Phase 8): checks the hashed `api_keys` table first
 * (Stripe/OpenAI-style named keys), then falls back to legacy single-key
 * validation. On a hit, fire-and-forget records usage so the dashboard can
 * show last_used_at and per-key request counts without blocking the request.
 *
 * Async because the multi-key path requires a DB lookup. Legacy paths that
 * can't easily go async should keep calling the sync `validateAgentApiKey`.
 */
export async function validateAgentApiKeyAsync(agentId: string, apiKey: string): Promise<boolean> {
  if (!apiKey) return false

  // 1. Multi-key table — hashed lookup.
  try {
    const { hashApiKey, findActiveApiKeyByHash, recordApiKeyUsage } = await import('./db/api-keys')
    const hit = await findActiveApiKeyByHash(hashApiKey(apiKey))
    if (hit && hit.agent_id === agentId) {
      void recordApiKeyUsage(hit.id, hit.agent_id) // fire-and-forget; also buckets daily usage
      return true
    }
  } catch (err) {
    console.warn('[auth] multi-key lookup failed, falling back:', (err as Error).message)
  }

  // 2. Legacy single-key path (in-memory store + HMAC + Privy DB).
  if (validateAgentApiKey(agentId, apiKey)) return true

  return false
}

/**
 * Validate that a wallet address owns a specific agent.
 * Used for wallet-scoped data isolation.
 */
export function validateAgentOwnership(agentId: string, walletAddress: string): boolean {
  const agent = getAgent(agentId)
  if (!agent) return false
  if (!agent.ownerAddress) return true // Agent without owner → open access (legacy)
  return agent.ownerAddress.toLowerCase() === walletAddress.toLowerCase()
}

/**
 * Get the current nonce for a wallet address.
 * Used by clients to construct signed messages with the correct nonce.
 */
export function getNextNonce(walletAddress: string): number {
  return getWalletNonce(walletAddress) + 1
}

/**
 * Middleware-like helper to check for the memos platform secret.
 * In production, MEMORY_SERVICE_SECRET MUST be set — requests without it are rejected.
 * In development (NODE_ENV !== 'production'), access is allowed if secret is not configured.
 */
export function validatePlatformSecret(req: Request): boolean {
  const secret = req.headers.get('X-memos-Secret')
  const expected = process.env.MEMORY_SERVICE_SECRET
  if (!expected) {
    if (isDev()) return true // Dev mode without secret configured → allow
    console.error('🔒 [AUTH] MEMORY_SERVICE_SECRET is not set. All write requests are BLOCKED in production.')
    return false
  }
  return secret === expected
}
