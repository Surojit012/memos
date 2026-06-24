/**
 * lib/hydration.ts
 *
 * Centralized startup hydration from 0G Storage & On-Chain Registry.
 *
 * ── Architecture ──
 * 1. Fetch all known Agent IDs from the on-chain registry.
 * 2. Fetch their `storageHash` (AgentManifest).
 * 3. Download the manifests from 0G Storage in parallel.
 * 4. Upsert memories, skills, and identity into RAM.
 */

import { loadAgentManifest } from './0g-manifest'
import {
  upsertHydratedMemory,
  upsertHydratedSkill,
  upsertHydratedAgent,
  isStoreSeeded,
  loadSeedData,
  getAgent,
} from './store'
import { startWriteQueue } from './write-queue'
import { getAllAgentIdsFromRegistry, getAgentFromRegistry } from './registry'
import type { AgentIdentity } from './types'

let hydrationState: 'idle' | 'hydrating' | 'done' = 'idle'
let hydrationPromise: Promise<void> | null = null
let hydrationError: string | null = null

export interface HydrationStatus {
  state: 'idle' | 'hydrating' | 'done'
  memoriesHydrated: number
  skillsHydrated: number
  agentsHydrated: number
  error: string | null
  lastHydratedAt: number | null
  source: 'manifest-0g' | 'seed' | 'empty' | null
}

let stats: HydrationStatus = {
  state: 'idle',
  memoriesHydrated: 0,
  skillsHydrated: 0,
  agentsHydrated: 0,
  error: null,
  lastHydratedAt: null,
  source: null,
}

export async function ensureHydrated(): Promise<void> {
  if (hydrationState === 'done') return
  if (hydrationState === 'hydrating' && hydrationPromise) {
    return hydrationPromise
  }

  hydrationState = 'hydrating'
  stats.state = 'hydrating'

  hydrationPromise = performHydration()
  return hydrationPromise
}

async function performHydration(): Promise<void> {
  const start = Date.now()
  console.log('\n🔄 Hydrating store from Per-Agent Manifests...')

  try {
    // 1. Fetch all agent IDs from contract
    const allAgentIds = await getAllAgentIdsFromRegistry()

    if (allAgentIds.length === 0) {
      console.log('📋 No agents found on-chain. Loading seed data.')
      if (!isStoreSeeded()) loadSeedData()
      hydrationState = 'done'
      stats.state = 'done'
      stats.source = 'seed'
      stats.lastHydratedAt = Date.now()
      startWriteQueue()
      return
    }

    console.log(`📋 Found ${allAgentIds.length} agents on-chain. Fetching brains...`)

    let totalMemories = 0
    let totalSkills = 0
    let totalAgents = 0

    // 2. Fetch full agent records and their 0G manifests
    const agentPromises = allAgentIds.map(async (agentId) => {
      const agent = await getAgentFromRegistry(agentId)
      if (!agent) return

      // Load identity
      upsertHydratedAgent(agent)
      totalAgents++

      // If it has a storage hash, download its brain
      if (agent.identityHash) {
        const manifest = await loadAgentManifest(agent.identityHash)
        if (manifest) {
          manifest.memories?.forEach((m) => {
            upsertHydratedMemory(m)
            totalMemories++
          })
          manifest.skills?.forEach((s) => {
            upsertHydratedSkill(s)
            totalSkills++
          })
        }
      }
    })

    await Promise.all(agentPromises)

    // Also load seed data for anything missing
    if (!isStoreSeeded()) {
      loadSeedData()
    }

    stats.memoriesHydrated = totalMemories
    stats.skillsHydrated = totalSkills
    stats.agentsHydrated = totalAgents
    stats.lastHydratedAt = Date.now()
    stats.state = 'done'
    stats.source = 'manifest-0g'

    hydrationState = 'done'
    hydrationError = null

    startWriteQueue()

    console.log(
      `✅ Hydrated ${totalMemories} memories, ${totalSkills} skills, ` +
        `${totalAgents} agents from 0G in ${Date.now() - start}ms\n`
    )
  } catch (err: any) {
    console.error('❌ Hydration failed:', err.message)
    hydrationError = err.message
    stats.error = err.message

    if (!isStoreSeeded()) loadSeedData()
    hydrationState = 'done'
    stats.state = 'done'
    stats.lastHydratedAt = Date.now()
    startWriteQueue()
  }
}

/**
 * Look up an agent by id, restoring it from the on-chain registry into RAM
 * if it isn't already cached. Use this instead of a bare `getAgent()` in
 * `[agentId]` API routes — on a fresh serverless instance the agent may not
 * yet be hydrated, and a RAM-only lookup would 404 a perfectly valid agent.
 */
export async function getAgentOrRestore(agentId: string): Promise<AgentIdentity | undefined> {
  const cached = getAgent(agentId)
  if (cached) return cached

  const regAgent = await getAgentFromRegistry(agentId)
  if (regAgent) {
    upsertHydratedAgent(regAgent)
    console.log(`⚡ Restored Agent [${agentId}] from on-chain registry into RAM`)
    return regAgent
  }

  // Fall back to Privy-provisioned agents in Supabase.
  // These users don't live on-chain but are still real agents from the app's perspective.
  try {
    const { ensureAgentInStore } = await import('./auth')
    const dbAgent = await ensureAgentInStore(agentId)
    if (dbAgent) {
      console.log(`⚡ Restored Agent [${agentId}] from Privy DB into RAM`)
      return dbAgent
    }
  } catch (err) {
    console.warn('[hydration] DB fallback failed:', (err as Error).message)
  }

  return undefined
}

export function getHydrationStatus(): HydrationStatus {
  return { ...stats }
}

export function resetHydration(): void {
  hydrationState = 'idle'
  hydrationPromise = null
  hydrationError = null
  stats = {
    state: 'idle',
    memoriesHydrated: 0,
    skillsHydrated: 0,
    agentsHydrated: 0,
    error: null,
    lastHydratedAt: null,
    source: null,
  }
}
