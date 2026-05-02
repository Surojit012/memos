import { NextRequest, NextResponse } from 'next/server'
import { createMemory, getAgent, getMemories, getPlatformStats, updateMemoryEmbedding, updateMemoryHash, upsertHydratedMemory, searchMemories } from '@/lib/store'
import { embedTextWith0GCompute } from '@/lib/0g-compute'
import { upsertMemoryManifestRecord } from '@/lib/0g-manifest'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKey, validatePlatformSecret } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

// Intelligence Layer
import { detectConflict } from '@/lib/intelligence/conflicts'
import { recordAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  await ensureHydrated()
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) return NextResponse.json(getPlatformStats())

  // ── Security: HMAC API Key Validation for Wallet Isolation ──
  const agent = getAgent(agentId)
  if (agent && agent.ownerAddress) {
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && validateAgentApiKey(agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — Agent API Key is invalid or missing.' }, { status: 401 })
    }
  }

  const type  = searchParams.get('type') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const memories = getMemories(agentId, type, limit)
  return NextResponse.json({ memories, count: memories.length })
}

export async function POST(req: NextRequest) {
  try {
    // ── Rate Limiting ──
    const limited = rateLimit(req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return limited

    await ensureHydrated()
    const body = await req.json()

    // Validate inputs
    if (!body.agentId)
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })

    // ── Security: Platform secret check ──
    if (!validatePlatformSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized — Platform secret missing or invalid.' }, { status: 401 })
    }

    // ── Security: Agent must exist (prevents injection into unregistered agents) ──
    const agent = getAgent(body.agentId)
    if (!agent) {
      return NextResponse.json({
        error: `Agent [${body.agentId}] not found. Register via POST /api/identity first.`,
      }, { status: 404 })
    }

    // ── Security: Optional API key validation ──
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (apiKey && !validateAgentApiKey(body.agentId, apiKey)) {
      return NextResponse.json({ error: 'Unauthorized — Agent API Key is invalid.' }, { status: 401 })
    }

    if (!body.content?.trim())
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    if (!['episodic', 'semantic', 'procedural'].includes(body.type))
      return NextResponse.json({ error: 'type must be episodic, semantic, or procedural' }, { status: 400 })

    // ── Intelligence: Contradiction Detection ──
    // Check against up to 3 similar memories
    const similar = searchMemories(body.agentId, body.content).slice(0, 3)
    const conflictAnalysis = await detectConflict(body.content, similar)
    if (conflictAnalysis.hasConflict) {
      body.metadata = { 
        ...body.metadata, 
        _conflictDetected: 'true',
        _conflictReason: conflictAnalysis.reason 
      }
    }

    // Step 1 — create in local store first (instant response)
    const memory = createMemory(body)

    // ── Audit: record memory creation ──
    recordAudit('memory.create', body.agentId, {
      memoryId: memory.id,
      type: memory.type,
      tags: memory.tags,
      importance: memory.importance,
      contentLength: memory.content.length,
      hasConflict: conflictAnalysis.hasConflict,
    })

    // Step 2+3 — embed via 0G Compute THEN upload to 0G Storage
    // Embedding is computed BEFORE upload so the vector is permanently
    // stored inside the 0G blob (not just in RAM).
    ;(async () => {
      try {
        // 2a. Generate embedding via 0G Compute
        const { embedding, model } = await embedTextWith0GCompute(memory.content)
        updateMemoryEmbedding(memory.id, embedding, model)
        memory.embedding = embedding
        memory.embeddingModel = model
        memory.embeddingUpdatedAt = Date.now()
        console.log(`✓ Memory ${memory.id} embedded on 0G Compute: ${model} (${embedding.length}d)`)
      } catch (err: any) {
        console.error(`✗ Embedding failed for memory ${memory.id}: ${err.message}`)
        // Continue with upload even without embedding
      }

      try {
        // 2b. Upload memory + embedding vector to 0G Storage
        const hash = await uploadToStorage(memory)
        updateMemoryHash(memory.id, hash)
        const hydratedMemory = { ...memory, storageHash: hash }
        upsertHydratedMemory(hydratedMemory)
        void upsertMemoryManifestRecord(hydratedMemory)
        console.log(`✓ Memory ${memory.id} stored on 0G: ${hash}`)
        console.log(`  Explorer: ${getExplorerUrl(hash)}`)
        console.log(`  Embedding included: ${!!memory.embedding} (${memory.embedding?.length || 0}d vector)`)
      } catch (err: any) {
        console.error(`✗ 0G upload failed for memory ${memory.id}: ${err.message}`)
      }

      // ── Intelligence: Consolidation & Decay ──
      // Moved to dedicated endpoint: POST /api/agent/[agentId]/dreams
      // Agents now explicitly trigger "sleep cycles" for batch processing.
    })()

    return NextResponse.json({ memory }, { status: 201 })
  } catch (e: any) {
    console.error(">>> API MEMORY 500 ERROR:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
