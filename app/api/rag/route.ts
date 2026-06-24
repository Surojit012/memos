import { NextRequest, NextResponse } from 'next/server'
import { searchMemoriesByEmbedding, searchMemories } from '@/lib/store'
import { embedTextWith0GCompute } from '@/lib/0g-compute'
import { computeInference } from '@/lib/intelligence/llm'
import { ensureHydrated } from '@/lib/hydration'
import { validatePlatformSecret, validateAgentApiKeyAsync, ensureAgentInStore } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { maxRequests: 20, windowMs: 60_000 })
    if (limited) return limited
    await ensureHydrated()
    const { agentId, query } = await req.json()
    if (!agentId || !query?.trim()) return NextResponse.json({ error: 'agentId and query required' }, { status: 400 })

    await ensureAgentInStore(agentId)

    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && await validateAgentApiKeyAsync(agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
    }

    // 1. Try to Embed query for precise search
    let memories: any[] = [];
    try {
      const result = await embedTextWith0GCompute(query.trim())
      memories = searchMemoriesByEmbedding(agentId, result.embedding, 10)
    } catch (error: any) {
      console.warn("0G Compute embedding unavailable, falling back to keyword context extraction");
      memories = searchMemories(agentId, query.trim()).slice(0, 10)
    }
    
    if (memories.length === 0) {
      return NextResponse.json({ answer: "I have no memory context relevant to that query." })
    }

    const contextStr = memories.map((m, i) => `[Memory ${i+1}] ${m.content}`).join('\n')

    // 3. Synthesize via 0G Compute
    const systemPrompt = `
      You are the Contextual RAG engine for an AI agent. 
      You are provided with a natural language query and context from the agent's 0G Storage memories.
      Synthesize an accurate, concise answer based ONLY on the provided memories.
      If the memories don't contain the answer, say so. Do not hallucinate.
    `
    const userPrompt = `
      MEMORIES EXTRACTED FROM 0G STORAGE:
      ${contextStr}

      USER QUERY:
      ${query}
    `

    const answer = await computeInference({ systemPrompt, userPrompt, temperature: 0.1 })

    return NextResponse.json({
      answer,
      contextUsed: memories.length,
      memories
    })

  } catch (e: any) {
    console.error(">>> API RAG 500 ERROR:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
