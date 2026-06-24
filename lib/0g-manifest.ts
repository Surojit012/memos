/**
 * lib/0g-manifest.ts
 *
 * Per-Agent Manifest System
 *
 * This module manages generating and uploading a full "brain snapshot"
 * (AgentManifest) to 0G Storage for an individual agent, replacing the
 * old global manifest.
 */

import { uploadToStorage, downloadFromStorage } from './0g-storage'
import { AgentManifest, Memory, Skill, AgentIdentity } from './types'
import { getAgent, getMemoriesByAgent, getSkillsByAgent } from './store'
import { updateAgentHashOnChain, getAgentFromRegistry } from './registry'

// Memory queue to batch updates so we don't spam the blockchain
const pendingAgentUpdates = new Set<string>()
let isFlushing = false

// Serialized flush chain. Each queued update appends a flush link so callers
// can AWAIT until a flush that includes their agent has completed (durability).
let flushChain: Promise<void> = Promise.resolve()

/**
 * Download a specific agent's manifest from 0G Storage using its hash.
 */
export async function loadAgentManifest(storageHash: string): Promise<AgentManifest | null> {
  try {
    return await downloadFromStorage<AgentManifest>(storageHash)
  } catch (err: any) {
    console.error(`Failed to load AgentManifest from hash ${storageHash}:`, err.message)
    return null
  }
}

/**
 * Generate a fresh AgentManifest object based on local RAM state.
 */
export function generateAgentManifest(agentId: string): AgentManifest | null {
  const agent = getAgent(agentId)
  if (!agent) return null

  const memories = getMemoriesByAgent(agentId)
  const skills = getSkillsByAgent(agentId)

  return {
    version: 2,
    updatedAt: Date.now(),
    identity: agent,
    memories,
    skills,
  }
}

import { waitUntil } from '@vercel/functions'

/**
 * Queue an agent for a manifest update to 0G.
 *
 * Returns a promise that resolves once a flush cycle which drains this agent
 * has completed — so callers in a request handler can `await` it (wrapped in
 * waitUntil) to guarantee the memory is durably persisted before the function
 * is allowed to freeze. Flushes are serialized through `flushChain` so there's
 * no race between concurrent stores.
 */
function queueAgentUpdate(agentId: string): Promise<void> {
  pendingAgentUpdates.add(agentId)
  // Append a flush link AFTER any in-flight flush. By the time this link
  // resolves, `agentId` has been drained from the pending set (either by an
  // earlier link or this one), meaning its 0G upload + Supabase pointer ran.
  flushChain = flushChain.then(() => flushManifests()).catch((err) => {
    console.error('[manifest] flush chain error:', err?.message || err)
  })
  const p = flushChain
  // Keep serverless functions alive until the flush settles. Throws outside a
  // Vercel request scope (local dev) — the long-lived process keeps it running.
  try { waitUntil(p) } catch { /* local dev */ }
  return p
}

export function upsertMemoryManifestRecord(memory: Memory): Promise<void> {
  return queueAgentUpdate(memory.agentId)
}

export function removeMemoryManifestRecord(agentId: string, memoryId: string): Promise<void> {
  return queueAgentUpdate(agentId)
}

export function upsertSkillManifestRecord(skill: Skill): Promise<void> {
  // If publisherAgentId is missing, we might not be able to tie it properly,
  // but let's assume it's there.
  if (skill.publisherAgentId) {
    return queueAgentUpdate(skill.publisherAgentId)
  }
  return Promise.resolve()
}

/**
 * Upload all pending agent manifests to 0G and update the registry contract.
 */
export async function flushManifests(): Promise<void> {
  if (isFlushing || pendingAgentUpdates.size === 0) return
  isFlushing = true

  const agentsToProcess = Array.from(pendingAgentUpdates)
  pendingAgentUpdates.clear()

  console.log(`\n🌊 Flushing Per-Agent Manifests for ${agentsToProcess.length} agents...`)

  for (const agentId of agentsToProcess) {
    try {
      const manifest = generateAgentManifest(agentId)
      if (!manifest) continue

      // 1. Upload the full brain snapshot to 0G Storage.
      const newHash = await uploadToStorage(manifest)
      manifest.identity.identityHash = newHash

      // 2. Persist the pointer in Supabase — this is the PRIMARY durability
      //    mechanism for Privy agents (which never get registered on-chain).
      //    Keyed by agent_id; harmlessly no-ops for on-chain wallet agents.
      try {
        const { updateManifestHash } = await import('./db/client')
        await updateManifestHash(agentId, newHash)
        console.log(`📌 Agent [${agentId}] manifest pointer → Supabase: ${newHash.slice(0, 12)}...`)
      } catch (dbErr: any) {
        console.warn(`[manifest] Supabase pointer save failed for [${agentId}]: ${dbErr.message}`)
      }

      // 3. Best-effort on-chain anchor. Only succeeds for agents registered
      //    via the wallet-signature flow; for Privy agents the contract
      //    reverts (agent not registered) — that's expected and non-fatal,
      //    so we do NOT re-queue on this failure.
      try {
        await updateAgentHashOnChain(agentId, newHash)
        console.log(`⛓ Agent [${agentId}] manifest anchored on-chain: ${newHash.slice(0, 12)}...`)
      } catch {
        console.log(`ℹ Agent [${agentId}] not on-chain — Supabase pointer is the source of truth.`)
      }
    } catch (err: any) {
      // Only the 0G upload (step 1) reaching here is a real failure worth retrying.
      console.error(`❌ Failed to flush manifest for agent [${agentId}]:`, err.message)
      pendingAgentUpdates.add(agentId)
    }
  }

  isFlushing = false

  // If a retry was re-queued (step-1 upload failure above) or new work arrived
  // mid-flush, drain it on the serialized chain. No bare waitUntil here — it
  // throws outside a Vercel request scope and the chain already keeps order.
  if (pendingAgentUpdates.size > 0) {
    flushChain = flushChain.then(() => flushManifests()).catch((err) => {
      console.error('[manifest] flush chain error:', err?.message || err)
    })
    try { waitUntil(flushChain) } catch { /* local dev */ }
  }
}

/**
 * Kept for backwards compatibility if needed elsewhere.
 */
export async function flushManifest() {
  await flushManifests()
}

/**
 * Legacy stats stub.
 */
export function getManifestStats() {
  return {
    version: 2,
    hash: 'per-agent-routing',
    memories: 0,
    skills: 0,
    agents: 0,
    isDirty: pendingAgentUpdates.size > 0,
    isUploading: isFlushing,
    uploads: 0,
    downloads: 0,
  }
}
