/**
 * lib/0g-manifest.ts
 *
 * 0G-on-0G Manifest System — the registry lives ON 0G Storage.
 *
 * Architecture:
 * ┌──────────────────────────────────────┐
 * │      MASTER MANIFEST (on 0G)         │
 * │  Hash stored in env / on-chain       │
 * ├──────────────────────────────────────┤
 * │  memories: [{id, hash, agent}...]    │
 * │  skills:   [{id, hash, agent}...]    │
 * │  agents:   [{agentId, hash}...]      │
 * │  version:  17                        │
 * └──────────────────────────────────────┘
 *
 * Boot Flow:
 * 1. Read MANIFEST_HASH from env (or on-chain contract)
 * 2. Download manifest from 0G Storage → get full index
 * 3. Populate RAM cache with lazy-load references
 *
 * Write Flow:
 * 1. Upload item to 0G → get rootHash
 * 2. Update in-memory manifest (add/update record)
 * 3. Debounced: re-upload the manifest to 0G → new manifest hash
 * 4. Print new hash to console (dev updates .env.local)
 *
 * Fallback: If no MANIFEST_HASH is set, reads from data/0g-registry.json
 * for backwards compatibility.
 */

import { uploadToStorage, downloadFromStorage } from './0g-storage'
import { Memory, Skill, AgentIdentity } from './types'
import { ethers } from 'ethers'

const ManifestAnchorABI = [
  "function updateManifest(string calldata hash) external",
  "function getManifestInfo() external view returns (string hash, uint256 ver, uint256 updated)"
];

// ── Types ─────────────────────────────────────────────────────

export type MemoryManifestRecord = {
  id: string
  agentId: string
  storageHash: string
  createdAt: number
  type: Memory['type']
}

export type SkillManifestRecord = {
  id: string
  publisherAgentId: string
  storageHash: string
  createdAt: number
}

export type AgentManifestRecord = {
  agentId: string
  storageHash: string
  createdAt: number
  ownerAddress?: string
}

export type ManifestDocument = {
  version: number
  updatedAt: number
  masterHash?: string
  memories: MemoryManifestRecord[]
  skills: SkillManifestRecord[]
  agents: AgentManifestRecord[]
  nonces?: Record<string, number> // wallet → last used nonce (security)
}

// ── State ─────────────────────────────────────────────────────

let manifest: ManifestDocument = createEmptyManifest()
let currentManifestHash: string | null = null
let isDirty = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isUploading = false

const DEBOUNCE_MS = parseInt(process.env.MANIFEST_UPLOAD_DEBOUNCE_MS || '10000', 10)

// ── Hydration caches (for downloaded 0G items) ────────────────

const hydratedMemoryCache = new Map<string, Memory>()
const hydratedSkillCache = new Map<string, Skill>()
const hydratedAgentCache = new Map<string, AgentIdentity>()

// ── Stats ─────────────────────────────────────────────────────

let _manifestUploads = 0
let _manifestDownloads = 0

// ── Core Functions ────────────────────────────────────────────

function createEmptyManifest(): ManifestDocument {
  return {
    version: 0,
    updatedAt: Date.now(),
    memories: [],
    skills: [],
    agents: [],
    nonces: {},
  }
}

/**
 * Load the manifest from 0G Storage using the provided hash.
 * Falls back to local JSON registry if no hash is available.
 */
export async function loadManifest(): Promise<ManifestDocument> {
  // Priority 1: Check on-chain smart contract
  let targetHash = process.env.MANIFEST_HASH

  const contractAddress = process.env.MANIFEST_ANCHOR_CONTRACT
  const rpcUrl = process.env.NEXT_PUBLIC_0G_RPC

  if (contractAddress && rpcUrl) {
    try {
      console.log(`🔗 Querying 0G Chain for latest manifest hash...`)
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const contract = new ethers.Contract(contractAddress, ManifestAnchorABI, provider)
      const [onChainHash] = await contract.getManifestInfo()
      if (onChainHash && onChainHash.startsWith('0x')) {
        console.log(`✅ Found manifest hash on-chain: ${onChainHash.slice(0, 12)}...`)
        targetHash = onChainHash
      }
    } catch (err: any) {
      console.warn(`⚠ Failed to read manifest from chain: ${err.message}`)
    }
  }

  // Priority 2: Use resolved hash
  if (targetHash?.trim()) {
    console.log(`📋 Loading manifest from 0G Storage: ${targetHash.slice(0, 12)}...`)
    try {
      const downloaded = await downloadFromStorage<ManifestDocument>(targetHash)
      if (downloaded) {
        manifest = downloaded
        currentManifestHash = targetHash
        _manifestDownloads++
        console.log(
          `✅ Manifest loaded from 0G: v${manifest.version} — ` +
          `${manifest.memories.length} memories, ${manifest.skills.length} skills, ${manifest.agents.length} agents`
        )
        return manifest
      }
      console.warn(`⚠ Manifest hash ${targetHash} could not be downloaded from 0G. Falling back.`)
    } catch (err: any) {
      console.warn(`⚠ Manifest download failed: ${err.message}. Falling back.`)
    }
  }

  // Priority 3: Fall back to empty state — strictly in RAM (no local files)
  manifest = createEmptyManifest()
  console.log(`📋 No valid manifest downloaded from 0G. Starting with fresh empty state.`)
  return manifest
}

/**
 * Get the current in-memory manifest.
 */
export function getManifest(): ManifestDocument {
  return manifest
}

/**
 * Get the current manifest hash (null if not yet uploaded).
 */
export function getManifestHash(): string | null {
  return currentManifestHash
}

/**
 * Get manifest stats for observability.
 */
export function getManifestStats() {
  return {
    version: manifest.version,
    hash: currentManifestHash,
    memories: manifest.memories.length,
    skills: manifest.skills.length,
    agents: manifest.agents.length,
    isDirty,
    isUploading,
    uploads: _manifestUploads,
    downloads: _manifestDownloads,
  }
}

// ── Record Upserts ────────────────────────────────────────────

export function upsertMemoryManifestRecord(memory: Memory): void {
  if (!memory.storageHash) return
  const record: MemoryManifestRecord = {
    id: memory.id,
    agentId: memory.agentId,
    storageHash: memory.storageHash,
    createdAt: memory.createdAt,
    type: memory.type,
  }
  const index = manifest.memories.findIndex(r => r.id === memory.id)
  if (index >= 0) manifest.memories[index] = record
  else manifest.memories.unshift(record)

  hydratedMemoryCache.set(memory.storageHash, memory)
  markDirty()
}

export function removeMemoryManifestRecord(memoryId: string): void {
  manifest.memories = manifest.memories.filter(r => r.id !== memoryId)
  markDirty()
}

export function upsertSkillManifestRecord(skill: Skill): void {
  if (!skill.storageHash) return
  const record: SkillManifestRecord = {
    id: skill.id,
    publisherAgentId: skill.publisherAgentId,
    storageHash: skill.storageHash,
    createdAt: skill.createdAt,
  }
  const index = manifest.skills.findIndex(r => r.id === skill.id)
  if (index >= 0) manifest.skills[index] = record
  else manifest.skills.unshift(record)

  hydratedSkillCache.set(skill.storageHash, skill)
  markDirty()
}

export function upsertAgentManifestRecord(agent: AgentIdentity): void {
  const storageHash = (agent as any).identityHash
  if (!storageHash) return
  const record: AgentManifestRecord = {
    agentId: agent.agentId,
    storageHash,
    createdAt: agent.createdAt,
    ownerAddress: agent.ownerAddress,
  }
  const index = manifest.agents.findIndex(r => r.agentId === agent.agentId)
  if (index >= 0) manifest.agents[index] = record
  else manifest.agents.unshift(record)

  hydratedAgentCache.set(storageHash, agent)
  markDirty()
}

// ── Nonce Management (Security) ───────────────────────────────

export function getWalletNonce(walletAddress: string): number {
  if (!manifest.nonces) manifest.nonces = {}
  return manifest.nonces[walletAddress.toLowerCase()] || 0
}

export function incrementWalletNonce(walletAddress: string): number {
  if (!manifest.nonces) manifest.nonces = {}
  const addr = walletAddress.toLowerCase()
  manifest.nonces[addr] = (manifest.nonces[addr] || 0) + 1
  markDirty()
  return manifest.nonces[addr]
}

// ── Hydration from 0G ─────────────────────────────────────────

export async function hydrateMemoriesFromManifest(agentId?: string): Promise<Memory[]> {
  const filtered = agentId
    ? manifest.memories.filter(r => r.agentId === agentId)
    : manifest.memories

  const results: Memory[] = []

  for (const record of filtered) {
    try {
      const cached = hydratedMemoryCache.get(record.storageHash)
      if (cached) {
        results.push(cached)
        continue
      }
      const hydrated = await downloadFromStorage<Memory>(record.storageHash)
      if (hydrated) {
        hydrated.storageHash = record.storageHash
        hydratedMemoryCache.set(record.storageHash, hydrated)
        results.push(hydrated)
      }
    } catch (err: any) {
      console.warn(`⚠ Failed to hydrate memory ${record.id}: ${err.message}`)
    }
  }

  return results
}

export async function hydrateSkillsFromManifest(): Promise<Skill[]> {
  const results: Skill[] = []

  for (const record of manifest.skills) {
    try {
      const cached = hydratedSkillCache.get(record.storageHash)
      if (cached) {
        results.push(cached)
        continue
      }
      const hydrated = await downloadFromStorage<Skill>(record.storageHash)
      if (hydrated) {
        hydrated.storageHash = record.storageHash
        hydratedSkillCache.set(record.storageHash, hydrated)
        results.push(hydrated)
      }
    } catch (err: any) {
      console.warn(`⚠ Failed to hydrate skill ${record.id}: ${err.message}`)
    }
  }

  return results
}

export async function hydrateAgentsFromManifest(): Promise<AgentIdentity[]> {
  const results: AgentIdentity[] = []

  for (const record of manifest.agents) {
    try {
      const cached = hydratedAgentCache.get(record.storageHash)
      if (cached) {
        results.push(cached)
        continue
      }
      const hydrated = await downloadFromStorage<AgentIdentity & { identityHash?: string }>(record.storageHash)
      if (hydrated) {
        hydrated.identityHash = record.storageHash
        hydratedAgentCache.set(record.storageHash, hydrated)
        results.push(hydrated)
      }
    } catch (err: any) {
      console.warn(`⚠ Failed to hydrate agent ${record.agentId}: ${err.message}`)
    }
  }

  return results
}

// ── Manifest Upload (Debounced) ───────────────────────────────

function markDirty(): void {
  isDirty = true
  scheduleDebouncedUpload()
}

function scheduleDebouncedUpload(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void uploadManifest()
  }, DEBOUNCE_MS)
}

/**
 * Upload the current manifest to 0G Storage.
 * Called automatically via debounce, or manually for immediate persistence.
 */
export async function uploadManifest(): Promise<string | null> {
  if (!isDirty && currentManifestHash) return currentManifestHash
  if (isUploading) return currentManifestHash

  isUploading = true
  try {
    manifest.version++
    manifest.updatedAt = Date.now()

    const hash = await uploadToStorage(manifest)
    manifest.masterHash = hash
    currentManifestHash = hash
    isDirty = false
    _manifestUploads++

    // Only persist via 0G Storage directly; no local file writes allowed.

    console.log(`\n📦 Manifest v${manifest.version} uploaded to 0G Storage`)
    console.log(`   Hash: ${hash}`)

    // Sync to smart contract if configured
    if (process.env.MANIFEST_ANCHOR_CONTRACT && process.env.WALLET_PRIVATE_KEY) {
       try {
         const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_0G_RPC)
         const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider)
         const contract = new ethers.Contract(process.env.MANIFEST_ANCHOR_CONTRACT, ManifestAnchorABI, wallet)
         
         console.log(`🔗 Syncing manifest hash to 0G Chain...`)
         const tx = await contract.updateManifest(hash)
         console.log(`   Waiting for confirmation...`)
         await tx.wait()
         console.log(`✅ On-chain manifest updated! Tx: ${tx.hash}\n`)
       } catch (err: any) {
         console.error(`✗ Failed to sync manifest to chain: ${err.message}\n`)
       }
    } else {
       console.log(`   Set MANIFEST_HASH=${hash} in .env.local to persist across restarts (or setup MANIFEST_ANCHOR_CONTRACT)\n`)
    }

    return hash
  } catch (err: any) {
    console.error(`✗ Manifest upload failed: ${err.message}`)
    manifest.version-- // Roll back version increment
    return null
  } finally {
    isUploading = false
  }
}

/**
 * Force an immediate manifest upload (bypasses debounce).
 */
export async function flushManifest(): Promise<string | null> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  isDirty = true // Force upload even if not technically dirty
  return uploadManifest()
}

