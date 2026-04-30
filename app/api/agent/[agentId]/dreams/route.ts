/**
 * app/api/agent/[agentId]/dreams/route.ts
 *
 * "Agent Dreams" — Autonomous Memory Consolidation
 *
 * This endpoint simulates human sleep consolidation:
 * 1. Reads the agent's recent episodic memories from RAM cache
 * 2. Runs semantic consolidation via 0G Compute to extract patterns
 * 3. Processes importance decay on stale memories
 * 4. Uploads new semantic facts and decayed records back to 0G Storage
 *
 * POST /api/agent/[agentId]/dreams → triggers a "sleep cycle"
 * GET  /api/agent/[agentId]/dreams → returns the dream log history
 *
 * Use case: Agents call this during idle periods to self-organize
 * their knowledge base, turning raw events into distilled intelligence.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgent, getMemories, createMemory, updateMemoryHash } from '@/lib/store'
import { upsertHydratedMemory } from '@/lib/store'
import { consolidateMemories } from '@/lib/intelligence/consolidation'
import { calculateDecay } from '@/lib/intelligence/decay'
import { uploadToStorage } from '@/lib/0g-storage'
import { upsertMemoryManifestRecord } from '@/lib/0g-manifest'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKey, validatePlatformSecret } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// In-memory dream log per agent
const dreamLog = new Map<string, Array<{
  timestamp: number
  consolidated: string[]
  decayed: number
  durationMs: number
}>>()

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const startTime = Date.now()

  try {
    await ensureHydrated()
    const agentId = params.agentId
    const agent = getAgent(agentId)

    if (!agent) {
      return NextResponse.json({ error: `Agent [${agentId}] not found.` }, { status: 404 })
    }

    // ── Security: API Key check OR platform secret (allows dashboard access) ──
    if (agent.ownerAddress) {
      const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
      const hasValidApiKey = apiKey && validateAgentApiKey(agentId, apiKey)
      const hasValidPlatformSecret = validatePlatformSecret(req)
      if (!hasValidApiKey && !hasValidPlatformSecret) {
        return NextResponse.json({ error: 'Unauthorized — Agent API Key required.' }, { status: 401 })
      }
    }

    console.log(`\n🌙 Agent [${agentId}] entering dream state...`)

    // ── Phase 1: Semantic Consolidation ──
    // Pull recent episodic memories and look for patterns
    const episodicMemories = getMemories(agentId, 'episodic', 50)
    const consolidatedFacts: string[] = []

    if (episodicMemories.length >= 3) {
      // Process in batches of 10 to find multiple patterns
      const batchSize = 10
      for (let i = 0; i < episodicMemories.length; i += batchSize) {
        const batch = episodicMemories.slice(i, i + batchSize)
        if (batch.length < 3) break

        try {
          const pattern = await consolidateMemories(batch)
          if (pattern) {
            // Create a new semantic memory from the pattern
            const semanticMemory = createMemory({
              agentId,
              type: 'semantic',
              content: pattern,
              tags: ['consolidated', 'dream', 'auto'],
              importance: 4, // Consolidated facts start at high importance
            })

            // Upload to 0G Storage
            try {
              const hash = await uploadToStorage(semanticMemory)
              updateMemoryHash(semanticMemory.id, hash)
              const hydrated = { ...semanticMemory, storageHash: hash }
              upsertHydratedMemory(hydrated)
              void upsertMemoryManifestRecord(hydrated)
              console.log(`  🧠 Consolidated: "${pattern}" → 0G:${hash.slice(0, 12)}...`)
            } catch (uploadErr: any) {
              console.warn(`  ⚠ Upload failed for consolidated memory: ${uploadErr.message}`)
            }

            consolidatedFacts.push(pattern)
          }
        } catch (err: any) {
          console.warn(`  ⚠ Consolidation batch failed: ${err.message}`)
        }
      }
    }

    // ── Phase 2: Importance Decay ──
    // Process ALL memories for this agent and decay stale ones
    const allMemories = getMemories(agentId, undefined, 10000)
    let decayedCount = 0

    for (const mem of allMemories) {
      const newImportance = calculateDecay(mem)
      if (newImportance !== null) {
        mem.importance = newImportance
        mem.updatedAt = Date.now()
        decayedCount++

        // Re-upload decayed memory to 0G to persist the change
        try {
          const hash = await uploadToStorage(mem)
          updateMemoryHash(mem.id, hash)
          upsertHydratedMemory({ ...mem, storageHash: hash })
          console.log(`  📉 Decayed memory ${mem.id} → importance ${newImportance}`)
        } catch (uploadErr: any) {
          console.warn(`  ⚠ Decay re-upload failed for ${mem.id}: ${uploadErr.message}`)
        }
      }
    }

    // ── Log the dream cycle ──
    const durationMs = Date.now() - startTime
    const log = dreamLog.get(agentId) || []
    log.unshift({
      timestamp: Date.now(),
      consolidated: consolidatedFacts,
      decayed: decayedCount,
      durationMs,
    })
    // Keep only last 50 dream logs
    if (log.length > 50) log.splice(50)
    dreamLog.set(agentId, log)

    console.log(`  ✅ Dream cycle complete: ${consolidatedFacts.length} facts consolidated, ${decayedCount} memories decayed (${durationMs}ms)\n`)

    return NextResponse.json({
      success: true,
      agentId,
      consolidated: consolidatedFacts,
      consolidatedCount: consolidatedFacts.length,
      decayedCount,
      totalMemoriesProcessed: allMemories.length,
      durationMs,
      message: consolidatedFacts.length > 0
        ? `Dream cycle complete. ${consolidatedFacts.length} new semantic facts extracted from ${episodicMemories.length} episodic memories.`
        : `Dream cycle complete. No new patterns found. ${decayedCount} memories decayed.`,
    })

  } catch (err: any) {
    console.error(`✗ Dream cycle failed for agent ${params.agentId}:`, err.message)
    return NextResponse.json({ error: `Dream cycle failed: ${err.message}` }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  await ensureHydrated()
  const agentId = params.agentId
  const agent = getAgent(agentId)

  if (!agent) {
    return NextResponse.json({ error: `Agent [${agentId}] not found.` }, { status: 404 })
  }

  const log = dreamLog.get(agentId) || []

  return NextResponse.json({
    agentId,
    agentName: agent.name,
    dreamHistory: log,
    totalDreamCycles: log.length,
    totalConsolidated: log.reduce((s, d) => s + d.consolidated.length, 0),
    totalDecayed: log.reduce((s, d) => s + d.decayed, 0),
  })
}
