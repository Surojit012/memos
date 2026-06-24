import { NextRequest, NextResponse } from 'next/server'
import { embedTextWith0GCompute } from '@/lib/0g-compute'
import { getMemoriesMissingEmbeddings, searchMemories, searchMemoriesByEmbedding, updateMemoryEmbedding } from '@/lib/store'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKeyAsync, validatePlatformSecret, ensureAgentInStore } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return limited
    await ensureHydrated()
    const { agentId, query } = await req.json()
    if (!agentId || !query?.trim()) return NextResponse.json({ error: 'agentId and query required' }, { status: 400 })

    await ensureAgentInStore(agentId)

    // ── Security: accept EITHER a valid agent API key OR the platform secret ──
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && await validateAgentApiKeyAsync(agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
    }

    // Try semantic search via 0G Compute embeddings first
    let useSemanticSearch = true
    let queryEmbedding: number[] | null = null

    try {
      // Backfill any memories missing embeddings
      const missingEmbeddings = getMemoriesMissingEmbeddings(agentId)
      if (missingEmbeddings.length > 0) {
        await Promise.allSettled(missingEmbeddings.slice(0, 10).map(async memory => {
          try {
            const { embedding, model } = await embedTextWith0GCompute(memory.content)
            updateMemoryEmbedding(memory.id, embedding, model)
          } catch { /* skip — will use keyword fallback */ }
        }))
      }

      const result = await embedTextWith0GCompute(query.trim())
      queryEmbedding = result.embedding
    } catch (error: any) {
      console.warn('⚠ 0G Compute unavailable for semantic search, falling back to keyword search:', error.message)
      useSemanticSearch = false
    }

    let memories
    let searchMethod: string

    if (useSemanticSearch && queryEmbedding) {
      memories = searchMemoriesByEmbedding(agentId, queryEmbedding)
      searchMethod = 'semantic (0G Compute embeddings)'
    } else {
      // Fallback: keyword/importance-based search
      memories = searchMemories(agentId, query.trim())
      searchMethod = 'keyword (0G Compute unavailable)'
    }

    return NextResponse.json({
      memories,
      count: memories.length,
      query,
      searchMethod,
    })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
