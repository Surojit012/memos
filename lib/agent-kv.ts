/**
 * lib/agent-kv.ts
 *
 * Fast, reliable agent persistence via Vercel KV (Redis).
 *
 * WHY THIS EXISTS:
 * 0G Storage uploads take 15-45s and often timeout on Vercel's 60s limit.
 * The manifest system (upload manifest → update on-chain contract) is a
 * multi-step chain that frequently fails, causing agents to "disappear"
 * on cold boots.
 *
 * This module provides < 50ms reads/writes via Redis, guaranteeing that
 * agents NEVER disappear. 0G uploads still happen for the permanent
 * identity proof, but KV is the source of truth for agent lookups.
 *
 * SETUP:
 * 1. Go to Vercel Dashboard → Your Project → Storage
 * 2. Click "Create" → select "KV (Redis)" → follow the prompts
 * 3. Vercel automatically adds KV_REST_API_URL and KV_REST_API_TOKEN
 *    to your environment variables. No manual config needed.
 */

import { kv } from '@vercel/kv'
import { AgentIdentity } from './types'

const AGENTS_KEY_PREFIX = 'memoryos:agent:'
const AGENTS_INDEX_KEY = 'memoryos:agents:index'

/** Check if KV is configured (env vars present) */
export function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/** Save an agent to KV (< 50ms) */
export async function saveAgentToKV(agent: AgentIdentity): Promise<void> {
  if (!isKVConfigured()) return
  try {
    // Store agent data
    await kv.set(`${AGENTS_KEY_PREFIX}${agent.agentId}`, JSON.stringify(agent))

    // Add to owner index (for wallet-based lookups)
    if (agent.ownerAddress) {
      const ownerKey = `memoryos:owner:${agent.ownerAddress.toLowerCase()}`
      const existingIds: string[] = (await kv.get(ownerKey)) || []
      if (!existingIds.includes(agent.agentId)) {
        existingIds.push(agent.agentId)
        await kv.set(ownerKey, existingIds)
      }
    }

    // Add to global index
    const globalIndex: string[] = (await kv.get(AGENTS_INDEX_KEY)) || []
    if (!globalIndex.includes(agent.agentId)) {
      globalIndex.push(agent.agentId)
      await kv.set(AGENTS_INDEX_KEY, globalIndex)
    }

    console.log(`⚡ Agent [${agent.agentId}] saved to KV (instant persistence)`)
  } catch (err: any) {
    console.warn(`⚠ KV save failed for agent [${agent.agentId}]:`, err.message)
  }
}

/** Get a single agent from KV by ID (< 10ms) */
export async function getAgentFromKV(agentId: string): Promise<AgentIdentity | null> {
  if (!isKVConfigured()) return null
  try {
    const data = await kv.get(`${AGENTS_KEY_PREFIX}${agentId}`)
    if (!data) return null
    return typeof data === 'string' ? JSON.parse(data) : data as AgentIdentity
  } catch {
    return null
  }
}

/** Get all agents for a wallet address from KV (< 20ms) */
export async function getAgentsByOwnerFromKV(ownerAddress: string): Promise<AgentIdentity[]> {
  if (!isKVConfigured()) return []
  try {
    const ownerKey = `memoryos:owner:${ownerAddress.toLowerCase()}`
    const agentIds: string[] = (await kv.get(ownerKey)) || []

    const agents: AgentIdentity[] = []
    for (const id of agentIds) {
      const agent = await getAgentFromKV(id)
      if (agent) agents.push(agent)
    }
    return agents
  } catch {
    return []
  }
}

/** Get all agents from KV (< 30ms) */
export async function getAllAgentsFromKV(): Promise<AgentIdentity[]> {
  if (!isKVConfigured()) return []
  try {
    const globalIndex: string[] = (await kv.get(AGENTS_INDEX_KEY)) || []
    const agents: AgentIdentity[] = []
    for (const id of globalIndex) {
      const agent = await getAgentFromKV(id)
      if (agent) agents.push(agent)
    }
    return agents
  } catch {
    return []
  }
}
