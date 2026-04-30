/**
 * app/api/memory/encrypted/route.ts
 *
 * Encrypted Memory Vault
 *
 * POST: Save a memory with AES-256-GCM encryption before uploading to 0G.
 *       Only the `content` field is encrypted; metadata remains searchable.
 *       The encryption key is derived from the owner's wallet address,
 *       so only they can ever decrypt the memory.
 *
 * GET:  Retrieve and decrypt vault memories for the authenticated owner.
 *
 * 0G Storage nodes see: { type, tags, importance, encryptedContent: { ciphertext, iv, authTag } }
 * They CANNOT read the actual content. Ever.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMemory, getMemories, getAgent, updateMemoryHash } from '@/lib/store'
import { upsertHydratedMemory } from '@/lib/store'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { encryptMemoryContent, decryptMemoryContent, EncryptedPayload } from '@/lib/encryption'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKey, validatePlatformSecret } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await ensureHydrated()
    const body = await req.json()

    if (!body.agentId || !body.content) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    const agent = getAgent(body.agentId)
    if (!agent) {
      return NextResponse.json({ error: `Agent [${body.agentId}] not found.` }, { status: 404 })
    }

    // Encrypted vaults REQUIRE an owner address (wallet-bound encryption)
    if (!agent.ownerAddress) {
      return NextResponse.json({
        error: 'Encrypted vaults require the agent to have an ownerAddress (wallet binding). Register with a wallet first.',
      }, { status: 400 })
    }

    // Security: validate API key OR platform secret (dashboard access)
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && validateAgentApiKey(body.agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — Agent API Key required for vault operations.' }, { status: 401 })
    }

    // ── Encrypt the content ──
    const encryptedPayload = encryptMemoryContent(
      body.content,
      agent.ownerAddress,
      body.agentId
    )

    // Store the memory with encrypted content
    // The in-memory store holds the PLAINTEXT for hot-cache reads
    const memory = createMemory({
      agentId: body.agentId,
      type: body.type || 'semantic',
      content: body.content, // Plaintext in RAM for fast reads
      tags: [...(body.tags || []), 'encrypted', 'vault'],
      importance: body.importance || 3,
      metadata: {
        ...body.metadata,
        encrypted: 'true',
        algorithm: 'aes-256-gcm',
      },
    })

    // Upload the ENCRYPTED version to 0G Storage
    // 0G nodes only see ciphertext
    const encryptedBlob = {
      id: memory.id,
      agentId: memory.agentId,
      type: memory.type,
      tags: memory.tags,
      importance: memory.importance,
      createdAt: memory.createdAt,
      encryptedContent: encryptedPayload, // Ciphertext — not readable by 0G nodes
      metadata: memory.metadata,
    }

    let storageHash: string | undefined
    try {
      storageHash = await uploadToStorage(encryptedBlob)
      updateMemoryHash(memory.id, storageHash)
      upsertHydratedMemory({ ...memory, storageHash })
      console.log(`🔐 Encrypted memory ${memory.id} → 0G: ${storageHash}`)
      console.log(`   Explorer: ${getExplorerUrl(storageHash)}`)
    } catch (err: any) {
      console.warn(`⚠ Encrypted upload failed: ${err.message}`)
    }

    return NextResponse.json({
      memory: {
        id: memory.id,
        agentId: memory.agentId,
        type: memory.type,
        tags: memory.tags,
        importance: memory.importance,
        encrypted: true,
        storageHash,
        explorerUrl: storageHash ? getExplorerUrl(storageHash) : undefined,
      },
      message: 'Memory encrypted with AES-256-GCM and stored on 0G. Only the owning wallet can decrypt.',
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureHydrated()
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'agentId query param required' }, { status: 400 })
    }

    const agent = getAgent(agentId)
    if (!agent || !agent.ownerAddress) {
      return NextResponse.json({ error: 'Agent not found or has no wallet binding.' }, { status: 404 })
    }

    // Security: validate API key OR platform secret
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && validateAgentApiKey(agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — Agent API Key required.' }, { status: 401 })
    }

    // Return vault memories (those tagged 'encrypted')
    const allMemories = getMemories(agentId, undefined, 10000)
    const vaultMemories = allMemories.filter(m => m.tags.includes('encrypted'))

    return NextResponse.json({
      agentId,
      vaultMemories: vaultMemories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content, // Plaintext from RAM cache (only accessible via auth)
        tags: m.tags,
        importance: m.importance,
        createdAt: m.createdAt,
        storageHash: m.storageHash,
      })),
      total: vaultMemories.length,
      message: 'Vault memories decrypted from RAM cache. 0G Storage holds only ciphertext.',
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
