/**
 * lib/0g-kv-store.ts
 *
 * 0G Storage KV Layer — Mutable key-value store on 0G.
 *
 * Architecture:
 * ┌───────────────────────────────────────────────────┐
 * │  0G Storage = Two Layers                         │
 * │                                                   │
 * │  LOG Layer (immutable):  Append-only Merkle blobs │
 * │    → Used for: memory payloads, brain snapshots   │
 * │    → Already implemented in lib/0g-storage.ts     │
 * │                                                   │
 * │  KV Layer (mutable):  Key→Value store on streams  │
 * │    → Used for: agent manifests, indexes, state    │
 * │    → Implemented HERE                             │
 * │                                                   │
 * │  Together: Zero local persistence. Any MemoryOS   │
 * │  node bootstraps entirely from 0G.                │
 * └───────────────────────────────────────────────────┘
 *
 * How KV works on 0G:
 * 1. Create a "stream" (namespace) on-chain via Flow contract
 * 2. Write key-value pairs to the stream via StreamDataBuilder
 * 3. Upload the stream data via Indexer (same as Log layer)
 * 4. Read values via KvClient.getValue(streamId, key)
 *
 * Keys we store:
 *   {agentId}/manifest     → latest manifest hash + metadata
 *   {agentId}/memory-index → memory ID → storage hash mapping
 *   {agentId}/config       → agent configuration
 *   platform/master        → master manifest (all agents)
 */

import { get0GNetworkConfig } from './0g-network'

const KV_VERSION = 1
const UPLOAD_TIMEOUT_MS = 30_000

// Default stream ID for MemoryOS — all agents share this namespace
// In production, each agent could have its own stream
const MEMORYOS_STREAM_ID = process.env.ZG_KV_STREAM_ID ||
  '0x0000000000000000000000000000000000000000000000000000000000000000'

// ── Helpers ─────────────────────────────────────────────────

function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bytesToString(bytes: Uint8Array | number[]): string {
  return new TextDecoder().decode(new Uint8Array(bytes))
}

function getKvNodeUrl(): string {
  // KV nodes run alongside storage nodes — use same indexer URL
  // or a dedicated KV node if configured
  return process.env.ZG_KV_NODE_URL ||
    process.env.NEXT_PUBLIC_0G_INDEXER ||
    'https://indexer-storage-testnet-turbo.0g.ai'
}

// ── Write to KV Store ───────────────────────────────────────

/**
 * Write a key-value pair to 0G KV Storage.
 * 
 * @param key - The key (e.g., "agent_123/manifest")
 * @param value - Any JSON-serializable value
 * @param streamId - Optional stream ID (defaults to MemoryOS stream)
 * @returns The root hash of the upload transaction
 */
export async function kvPut(
  key: string,
  value: object | string,
  streamId?: string
): Promise<{ rootHash: string; txHash: string }> {
  if (typeof window !== 'undefined') {
    throw new Error('kvPut must only be called server-side')
  }

  const network = get0GNetworkConfig()
  if (!network.walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is required for KV writes')
  }

  const { Indexer, StreamDataBuilder } = await import('@0gfoundation/0g-ts-sdk')
  const { ethers } = await import('ethers')

  const sid = streamId || MEMORYOS_STREAM_ID
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)

  // Build KV stream data
  const builder = new StreamDataBuilder(KV_VERSION)
  builder.set(
    sid,
    stringToBytes(key),
    stringToBytes(jsonValue)
  )

  const streamData = builder.build()

  // Upload via Indexer (same flow as Log layer)
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const wallet = new ethers.Wallet(network.walletPrivateKey, provider)
  const indexer = new Indexer(network.indexerUrl)

  const uploadPromise = indexer.upload(streamData as any, network.rpcUrl, wallet)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`KV upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`)), UPLOAD_TIMEOUT_MS)
  )

  const [tx, err] = await Promise.race([uploadPromise, timeoutPromise]) as any

  if (err !== null) {
    throw new Error(`KV write failed: ${err}`)
  }

  console.log(`📝 KV Put: "${key}" → 0G (tx: ${tx})`)

  return {
    rootHash: typeof tx === 'string' ? tx : String(tx),
    txHash: typeof tx === 'string' ? tx : String(tx),
  }
}

/**
 * Write multiple key-value pairs in a single transaction (batch).
 * More efficient than individual puts.
 */
export async function kvBatchPut(
  entries: Array<{ key: string; value: object | string }>,
  streamId?: string
): Promise<{ rootHash: string; txHash: string }> {
  if (typeof window !== 'undefined') {
    throw new Error('kvBatchPut must only be called server-side')
  }

  const network = get0GNetworkConfig()
  if (!network.walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is required for KV writes')
  }

  const { Indexer, StreamDataBuilder } = await import('@0gfoundation/0g-ts-sdk')
  const { ethers } = await import('ethers')

  const sid = streamId || MEMORYOS_STREAM_ID

  const builder = new StreamDataBuilder(KV_VERSION)
  for (const entry of entries) {
    const jsonValue = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)
    builder.set(sid, stringToBytes(entry.key), stringToBytes(jsonValue))
  }

  const streamData = builder.build()
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const wallet = new ethers.Wallet(network.walletPrivateKey, provider)
  const indexer = new Indexer(network.indexerUrl)

  const [tx, err] = await Promise.race([
    indexer.upload(streamData as any, network.rpcUrl, wallet),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('KV batch timeout')), UPLOAD_TIMEOUT_MS))
  ]) as any

  if (err !== null) {
    throw new Error(`KV batch write failed: ${err}`)
  }

  console.log(`📝 KV Batch Put: ${entries.length} entries → 0G`)

  return {
    rootHash: typeof tx === 'string' ? tx : String(tx),
    txHash: typeof tx === 'string' ? tx : String(tx),
  }
}

// ── Read from KV Store ──────────────────────────────────────

/**
 * Read a value from 0G KV Storage.
 *
 * @param key - The key to read
 * @param streamId - Optional stream ID
 * @returns Parsed JSON value, or null if not found
 */
export async function kvGet<T = any>(
  key: string,
  streamId?: string
): Promise<T | null> {
  if (typeof window !== 'undefined') {
    throw new Error('kvGet must only be called server-side')
  }

  try {
    const { KvClient } = await import('@0gfoundation/0g-ts-sdk')

    const kvNodeUrl = getKvNodeUrl()
    const client = new KvClient(kvNodeUrl)
    const sid = streamId || MEMORYOS_STREAM_ID

    const value = await client.getValue(sid, stringToBytes(key))

    if (!value || !value.data || value.data.length === 0) {
      return null
    }

    const jsonStr = typeof value.data === 'string' ? value.data : bytesToString(value.data as any)
    return JSON.parse(jsonStr) as T
  } catch (e: any) {
    // Key not found or stream doesn't exist yet
    if (e.message?.includes('not found') || e.message?.includes('null')) {
      return null
    }
    console.warn(`⚠ KV Get "${key}" failed:`, e.message)
    return null
  }
}

/**
 * Read multiple keys in sequence.
 */
export async function kvBatchGet<T = any>(
  keys: string[],
  streamId?: string
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>()
  // Parallel reads for speed
  const promises = keys.map(async (key) => {
    const value = await kvGet<T>(key, streamId)
    results.set(key, value)
  })
  await Promise.allSettled(promises)
  return results
}

// ── High-Level Agent Operations ─────────────────────────────

/**
 * Store an agent's manifest on 0G KV.
 * This replaces the local JSON registry entry for this agent.
 */
export async function kvPutAgentManifest(
  agentId: string,
  manifest: {
    memoryIndex: Record<string, string>  // memoryId → storageHash
    agentConfig: object
    version: number
    updatedAt: number
  }
): Promise<string> {
  const result = await kvPut(`${agentId}/manifest`, manifest)
  console.log(`🗂️ Agent ${agentId} manifest stored on 0G KV`)
  return result.rootHash
}

/**
 * Retrieve an agent's manifest from 0G KV.
 */
export async function kvGetAgentManifest(agentId: string): Promise<{
  memoryIndex: Record<string, string>
  agentConfig: object
  version: number
  updatedAt: number
} | null> {
  return kvGet(`${agentId}/manifest`)
}

/**
 * Store the platform master manifest — lists all agent IDs and their stream locations.
 */
export async function kvPutMasterManifest(
  manifest: {
    agents: Array<{ agentId: string; name: string; lastUpdated: number }>
    version: number
    updatedAt: number
  }
): Promise<string> {
  const result = await kvPut('platform/master', manifest)
  console.log(`🌐 Master manifest stored on 0G KV (v${manifest.version})`)
  return result.rootHash
}

/**
 * Retrieve the platform master manifest.
 */
export async function kvGetMasterManifest(): Promise<{
  agents: Array<{ agentId: string; name: string; lastUpdated: number }>
  version: number
  updatedAt: number
} | null> {
  return kvGet('platform/master')
}

// ── Health Check ────────────────────────────────────────────

/**
 * Test KV connectivity by writing and reading a test key.
 */
export async function kvHealthCheck(): Promise<{
  canWrite: boolean
  canRead: boolean
  latencyMs: number
  error?: string
}> {
  const start = Date.now()
  try {
    // Try to read — doesn't require wallet
    const testValue = await kvGet('platform/health-check')
    const latencyMs = Date.now() - start

    return {
      canWrite: !!get0GNetworkConfig().walletPrivateKey,
      canRead: true, // If we got here without error, reads work
      latencyMs,
    }
  } catch (e: any) {
    return {
      canWrite: false,
      canRead: false,
      latencyMs: Date.now() - start,
      error: e.message,
    }
  }
}

// ── Config Check ────────────────────────────────────────────

export function isKvConfigured(): boolean {
  return !!(
    get0GNetworkConfig().walletPrivateKey &&
    getKvNodeUrl()
  )
}

export function getKvStreamId(): string {
  return MEMORYOS_STREAM_ID
}
