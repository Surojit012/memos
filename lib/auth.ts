import { ethers } from 'ethers'
import { createHmac } from 'crypto'
import { getAgent } from './store'
import { getWalletNonce, incrementWalletNonce } from './0g-manifest'

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
    // Backwards compatibility: allow messages without nonces
    // but log a warning
    console.warn(`⚠ Signature from ${address} has no nonce. Replay protection disabled for this request.`)
    return { valid: true }
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
  const secret = process.env.PLATFORM_HMAC_SECRET || process.env.MEMORY_SERVICE_SECRET || 'memoryos-dev-secret'
  const payload = `${agentId}:${ownerAddress.toLowerCase()}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return `mos_${hmac.slice(0, 32)}`
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
 * Used for demo-level protection on write endpoints.
 * If MEMORY_SERVICE_SECRET is not set, access is allowed (easier local dev).
 */
export function validatePlatformSecret(req: Request): boolean {
  const secret = req.headers.get('X-MemoryOS-Secret')
  const expected = process.env.MEMORY_SERVICE_SECRET
  if (!expected) return true // Not configured → allow (local dev)
  return secret === expected
}
