import { ethers } from 'ethers'
import { createHmac } from 'crypto'
import { getAgent, getWalletNonce, incrementWalletNonce } from './store'

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
 * Expected message format: "Register agent <agentId> on MemoryOS | nonce: <N>"
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
    return 'memoryos-dev-secret'
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
 * Middleware-like helper to check for the MemoryOS platform secret.
 * In production, MEMORY_SERVICE_SECRET MUST be set — requests without it are rejected.
 * In development (NODE_ENV !== 'production'), access is allowed if secret is not configured.
 */
export function validatePlatformSecret(req: Request): boolean {
  const secret = req.headers.get('X-MemoryOS-Secret')
  const expected = process.env.MEMORY_SERVICE_SECRET
  if (!expected) {
    if (isDev()) return true // Dev mode without secret configured → allow
    console.error('🔒 [AUTH] MEMORY_SERVICE_SECRET is not set. All write requests are BLOCKED in production.')
    return false
  }
  return secret === expected
}
