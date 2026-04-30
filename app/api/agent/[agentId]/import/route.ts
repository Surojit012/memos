/**
 * app/api/agent/[agentId]/import/route.ts
 *
 * Batch Memory Import Pipeline
 *
 * POST: Bulk-import memories into an agent's 0G Storage.
 *       Accepts an array of memories and processes them in parallel,
 *       uploading each to 0G Storage and updating the manifest.
 *
 * Use case: Migrating agent memory from centralized providers (Pinecone,
 * DynamoDB) to decentralized 0G Storage in a single API call.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMemory, getAgent, updateMemoryHash } from '@/lib/store'
import { upsertHydratedMemory } from '@/lib/store'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { upsertMemoryManifestRecord } from '@/lib/0g-manifest'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKey } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const MAX_BATCH_SIZE = 100

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await ensureHydrated()
    const agentId = params.agentId
    const agent = getAgent(agentId)

    if (!agent) {
      return NextResponse.json({ error: `Agent [${agentId}] not found.` }, { status: 404 })
    }

    // Security: API key check
    if (agent.ownerAddress) {
      const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
      if (!apiKey || !validateAgentApiKey(agentId, apiKey)) {
        return NextResponse.json({ error: 'Unauthorized — Agent API Key required.' }, { status: 401 })
      }
    }

    const { memories } = await req.json()

    if (!Array.isArray(memories) || memories.length === 0) {
      return NextResponse.json({ error: 'memories array is required (at least 1 item).' }, { status: 400 })
    }

    if (memories.length > MAX_BATCH_SIZE) {
      return NextResponse.json({
        error: `Maximum batch size is ${MAX_BATCH_SIZE}. Got ${memories.length}. Split into multiple requests.`,
      }, { status: 400 })
    }

    const startTime = Date.now()
    console.log(`\n📦 Batch import started: ${memories.length} memories for agent ${agentId}`)

    const results: Array<{
      id: string
      status: 'success' | 'failed'
      storageHash?: string
      error?: string
    }> = []

    // Process in parallel (max 10 concurrent uploads)
    const CONCURRENCY = 10
    for (let i = 0; i < memories.length; i += CONCURRENCY) {
      const batch = memories.slice(i, i + CONCURRENCY)

      const batchResults = await Promise.allSettled(
        batch.map(async (memInput: any) => {
          // Validate each memory
          if (!memInput.content?.trim()) {
            throw new Error('content is required for each memory')
          }
          const type = memInput.type || 'semantic'
          if (!['episodic', 'semantic', 'procedural'].includes(type)) {
            throw new Error(`Invalid type: ${type}`)
          }

          // Create in store
          const memory = createMemory({
            agentId,
            type,
            content: memInput.content,
            tags: memInput.tags || [],
            importance: memInput.importance || 3,
            metadata: memInput.metadata,
          })

          // Upload to 0G
          const hash = await uploadToStorage(memory)
          updateMemoryHash(memory.id, hash)
          const hydrated = { ...memory, storageHash: hash }
          upsertHydratedMemory(hydrated)
          void upsertMemoryManifestRecord(hydrated)

          return { id: memory.id, storageHash: hash }
        })
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push({ id: result.value.id, status: 'success', storageHash: result.value.storageHash })
        } else {
          results.push({ id: 'unknown', status: 'failed', error: result.reason?.message || 'Unknown error' })
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status === 'failed').length
    const durationMs = Date.now() - startTime

    // Audit log
    recordAudit('memory.create', agentId, {
      action: 'batch_import',
      totalRequested: memories.length,
      successCount,
      failedCount,
      durationMs,
    })

    console.log(`  ✅ Batch import complete: ${successCount} success, ${failedCount} failed (${durationMs}ms)\n`)

    return NextResponse.json({
      success: true,
      agentId,
      totalImported: successCount,
      totalFailed: failedCount,
      totalRequested: memories.length,
      durationMs,
      results,
      message: `Imported ${successCount}/${memories.length} memories to 0G Storage in ${durationMs}ms.`,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
