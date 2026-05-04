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

/**
 * Queue an agent for a manifest update to 0G.
 */
function queueAgentUpdate(agentId: string) {
  pendingAgentUpdates.add(agentId)
  // Debounce flush
  setTimeout(flushManifests, 5000)
}

export function upsertMemoryManifestRecord(memory: Memory): void {
  queueAgentUpdate(memory.agentId)
}

export function removeMemoryManifestRecord(agentId: string, memoryId: string): void {
  queueAgentUpdate(agentId)
}

export function upsertSkillManifestRecord(skill: Skill): void {
  // If publisherAgentId is missing, we might not be able to tie it properly,
  // but let's assume it's there.
  if (skill.publisherAgentId) {
    queueAgentUpdate(skill.publisherAgentId)
  }
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

      // 1. Upload new manifest to 0G Storage
      const newHash = await uploadToStorage(manifest)
      
      // 2. Update the Agent identity object with the new hash (local)
      manifest.identity.identityHash = newHash

      // 3. Update the smart contract (~10s)
      await updateAgentHashOnChain(agentId, newHash)
      
      console.log(`✅ Agent [${agentId}] manifest updated on-chain: ${newHash.slice(0, 12)}...`)
    } catch (err: any) {
      console.error(`❌ Failed to flush manifest for agent [${agentId}]:`, err.message)
      // Re-queue on failure
      pendingAgentUpdates.add(agentId)
    }
  }

  isFlushing = false
  if (pendingAgentUpdates.size > 0) {
    setTimeout(flushManifests, 5000)
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
