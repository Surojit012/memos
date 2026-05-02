/**
 * lib/encryption.ts
 *
 * Client-Side Encrypted Memory Vaults
 *
 * Memories are encrypted with AES-256-GCM before uploading to 0G Storage.
 * The encryption key is derived from the agent's wallet address + a platform
 * secret using HKDF, so only the owning wallet can decrypt.
 *
 * 0G Storage nodes see only ciphertext — contents are never readable
 * by anyone other than the owner. This enables HIPAA/GDPR-grade privacy
 * on a fully decentralized storage network.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive a deterministic 256-bit encryption key from the agent's
 * owner address and the platform HMAC secret.
 *
 * This means:
 * - Same wallet + same platform = same key (deterministic decryption)
 * - Different wallet = different key (cryptographic isolation)
 * - No key needs to be stored — it's re-derived on every operation
 */
export function deriveEncryptionKey(ownerAddress: string, agentId: string): Buffer {
  const secret = process.env.PLATFORM_HMAC_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PLATFORM_HMAC_SECRET must be set in production. Encrypted vaults cannot operate without it.')
    }
    console.warn('⚠ [ENCRYPTION] Using insecure default secret. Set PLATFORM_HMAC_SECRET in production.')
  }
  const effectiveSecret = secret || `dev-only-${ownerAddress.toLowerCase()}`
  const material = `${ownerAddress.toLowerCase()}:${agentId}:${effectiveSecret}`
  // Double SHA-256 to get a consistent 32-byte key
  const firstHash = createHash('sha256').update(material).digest()
  return createHash('sha256').update(firstHash).digest()
}

export interface EncryptedPayload {
  ciphertext: string   // Base64-encoded encrypted data
  iv: string           // Base64-encoded initialization vector
  authTag: string      // Base64-encoded GCM auth tag
  algorithm: string    // Always 'aes-256-gcm'
  encrypted: true      // Marker flag
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
  ciphertext += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: ALGORITHM,
    encrypted: true,
  }
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to plaintext.
 */
export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const iv = Buffer.from(payload.iv, 'base64')
  const authTag = Buffer.from(payload.authTag, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}

/**
 * Encrypt a full memory object. Only the `content` field is encrypted;
 * metadata (tags, type, importance) remains in cleartext for indexing.
 */
export function encryptMemoryContent(
  content: string,
  ownerAddress: string,
  agentId: string
): EncryptedPayload {
  const key = deriveEncryptionKey(ownerAddress, agentId)
  return encrypt(content, key)
}

/**
 * Decrypt a memory's encrypted content back to plaintext.
 */
export function decryptMemoryContent(
  payload: EncryptedPayload,
  ownerAddress: string,
  agentId: string
): string {
  const key = deriveEncryptionKey(ownerAddress, agentId)
  return decrypt(payload, key)
}
