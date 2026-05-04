/**
 * lib/hydration.ts
 *
 * Centralized startup hydration from 0G Storage.
 *
 * ── 0G-Native Architecture ──
 * Instead of reading from a local JSON file, this module now:
 * 1. Loads the manifest from 0G Storage (via MANIFEST_HASH env var)
 * 2. Downloads all referenced items from 0G Storage in parallel
 * 3. Upserts them into the in-memory store (LRU cache)
 * 4. Starts the background write queue for resilience
 *
 * The manifest itself lives on 0G — no local file dependency.
 */

import {
  loadManifest,
  hydrateMemoriesFromManifest,
  hydrateSkillsFromManifest,
  hydrateAgentsFromManifest,
} from './0g-manifest'
import {
  upsertHydratedMemory,
  upsertHydratedSkill,
  upsertHydratedAgent,
  isStoreSeeded,
  loadSeedData,
} from './store'
import { startWriteQueue } from './write-queue'

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

/**
 * Ensure the store is hydrated from 0G Storage.
 * Safe to call from every API route — only executes once.
 * Concurrent calls during hydration will wait for the same promise.
 */
export async function ensureHydrated(): Promise<void> {
  // Already done — instant return
  if (hydrationState === 'done') return

  // Already in progress — wait for the same promise
  if (hydrationState === 'hydrating' && hydrationPromise) {
    return hydrationPromise
  }

  // Start hydration
  hydrationState = 'hydrating'
  stats.state = 'hydrating'

  hydrationPromise = performHydration()
  return hydrationPromise
}

async function performHydration(): Promise<void> {
  const start = Date.now()
  console.log('\n🔄 Hydrating store from 0G Storage...')

  try {
    // Step 1: Load manifest (from 0G or local fallback)
    const manifest = await loadManifest()
    const manifestTotal =
      manifest.memories.length + manifest.skills.length + manifest.agents.length

    // Determine hydration source
    const source = (process.env.MANIFEST_HASH?.trim() || process.env.MANIFEST_ANCHOR_CONTRACT) ? 'manifest-0g' : 'empty'

    if (manifestTotal === 0) {
      console.log('📋 Manifest is empty — loading seed data instead')
      if (!isStoreSeeded()) {
        loadSeedData()
      }
      hydrationState = 'done'
      stats.state = 'done'
      stats.source = 'seed'
      stats.lastHydratedAt = Date.now()
      console.log(`✅ Seed data loaded in ${Date.now() - start}ms\n`)
      startWriteQueue()
      return
    }

    console.log(
      `📋 Manifest (${source}): ${manifest.memories.length} memories, ` +
        `${manifest.skills.length} skills, ${manifest.agents.length} agents`
    )

    // Step 2: Download everything from 0G in parallel (with 5s Vercel limit timeout)
    const timeoutPromise = new Promise<[any[], any[], any[]]>((resolve) => 
      setTimeout(() => {
        console.warn('⚠ Hydration timed out after 5s (Vercel limit) - proceeding with partial data.')
        resolve([[], [], []])
      }, 5000)
    )

    const fetchPromise = Promise.all([
      hydrateMemoriesFromManifest().catch((err) => {
        console.error('⚠ Memory hydration partially failed:', err.message)
        return []
      }),
      hydrateSkillsFromManifest().catch((err) => {
        console.error('⚠ Skill hydration partially failed:', err.message)
        return []
      }),
      hydrateAgentsFromManifest().catch((err) => {
        console.error('⚠ Agent hydration partially failed:', err.message)
        return []
      }),
    ])

    const [memories, skills, agents] = await Promise.race([fetchPromise, timeoutPromise])

    // Step 3: Upsert into RAM store
    memories.forEach(upsertHydratedMemory)
    skills.forEach(upsertHydratedSkill)
    agents.forEach(upsertHydratedAgent)

    // Step 4: Also load seed data for any items NOT in the manifest
    if (!isStoreSeeded()) {
      loadSeedData()
    }

    stats.memoriesHydrated = memories.length
    stats.skillsHydrated = skills.length
    stats.agentsHydrated = agents.length
    stats.lastHydratedAt = Date.now()
    stats.state = 'done'
    stats.source = source

    hydrationState = 'done'
    hydrationError = null

    // Step 5: Start the background write queue
    startWriteQueue()

    console.log(
      `✅ Hydrated ${memories.length} memories, ${skills.length} skills, ` +
        `${agents.length} agents from ${source} in ${Date.now() - start}ms\n`
    )
  } catch (err: any) {
    console.error('❌ Hydration failed:', err.message)
    hydrationError = err.message
    stats.error = err.message

    // Even on failure, mark as done so the app doesn't block forever
    if (!isStoreSeeded()) {
      loadSeedData()
    }
    hydrationState = 'done'
    stats.state = 'done'
    stats.lastHydratedAt = Date.now()
    startWriteQueue()
  }
}

/**
 * Get hydration status for the /api/status endpoint.
 */
export function getHydrationStatus(): HydrationStatus {
  return { ...stats }
}

/**
 * Force re-hydration (e.g. after a bulk seed upload).
 */
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
