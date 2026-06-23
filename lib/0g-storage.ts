/**
 * lib/0g-storage.ts
 *
 * Real 0G Storage integration.
 * Uses @0gfoundation/0g-ts-sdk (the correct, actively maintained package)
 * NOT @0glabs/0g-ts-sdk which is deprecated and broken on Galileo testnet.
 *
 * Upload: serializes any object to JSON → MemData → Indexer.upload()
 * Download: Indexer.download() → temp file → parse JSON
 */
// Polyfill for 0G SDK in Node.js serverless environments
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).indexedDB === 'undefined') {
  (globalThis as any).indexedDB = undefined;
}

import { get0GNetworkConfig, getStorageExplorerUrl } from './0g-network'

const MAX_RETRIES = 5
const UPLOAD_TIMEOUT_MS = 90_000

// ─── Upload any object to 0G Storage ──────────────────────────
export async function uploadToStorage(data: object): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('uploadToStorage must only be called server-side')
  }

  const network = get0GNetworkConfig()
  const privateKey = network.walletPrivateKey
  const rpc = network.rpcUrl
  const indexerUrl = network.indexerUrl

  if (!privateKey) {
    throw new Error('WALLET_PRIVATE_KEY is missing. Add it to .env.local for 0G Storage uploads.')
  }
  if (!rpc) {
    throw new Error('NEXT_PUBLIC_0G_RPC is missing. Add it to .env.local.')
  }
  if (!indexerUrl) {
    throw new Error('NEXT_PUBLIC_0G_INDEXER is missing. Add it to .env.local.')
  }

  const { Indexer, MemData } = await import('@0gfoundation/0g-ts-sdk')
  const { ethers } = await import('ethers')

  const json = JSON.stringify(data, null, 2)
  const buffer = Buffer.from(json, 'utf-8')
  const memData = new MemData(buffer)

  const [tree, treeErr] = await memData.merkleTree()
  if (treeErr !== null) {
    throw new Error('Failed to build Merkle tree: ' + treeErr)
  }

  const rootHash = tree!.rootHash()
  if (!rootHash) throw new Error('Merkle tree returned empty root hash')

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet = new ethers.Wallet(privateKey, provider)
  const indexer = new Indexer(indexerUrl)

  // Retry loop for transient failures
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const uploadPromise = indexer.upload(memData, rpc, wallet)

      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`)), UPLOAD_TIMEOUT_MS)
      )

      const [tx, uploadErr] = await Promise.race([uploadPromise, timeoutPromise]) as any

      if (uploadErr === null) {
        console.log("File uploaded successfully, tx: ", tx)
        return rootHash
      }

      lastError = new Error(String(uploadErr))

      // Check if retryable
      const errMsg = String(uploadErr).toLowerCase()
      if (errMsg.includes('insufficient') || errMsg.includes('revert')) {
        // Not retryable — wallet issue
        break
      }
    } catch (err: any) {
      lastError = err

      const errMsg = err.message?.toLowerCase() || ''
      if (errMsg.includes('insufficient') || errMsg.includes('revert') || errMsg.includes('nonce')) {
        break // Not retryable
      }
    }

    if (attempt < MAX_RETRIES) {
      console.log(`⚠ 0G Upload attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${lastError?.message}. Retrying in 2s...`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  throw new Error(
    `0G upload failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message || 'unknown'}. ` +
    `Tip: Check WALLET_PRIVATE_KEY has Galileo testnet funds and NEXT_PUBLIC_0G_INDEXER is reachable.`
  )
}

// ─── Download from 0G Storage ─────────────────────────────────
export async function downloadFromStorage<T>(rootHash: string): Promise<T | null> {
  if (typeof window !== 'undefined') {
    throw new Error('downloadFromStorage must only be called server-side')
  }
  const indexerUrl = get0GNetworkConfig().indexerUrl
  if (!indexerUrl) throw new Error('Missing NEXT_PUBLIC_0G_INDEXER env var')
  try {
    const { Indexer } = await import('@0gfoundation/0g-ts-sdk')
    const indexer = new Indexer(indexerUrl)

    const { join } = await import('path')
    const { tmpdir } = await import('os')
    const { readFile, rm } = await import('fs/promises')

    const tempPath = join(tmpdir(), `0g-${rootHash.slice(0, 16)}-${Date.now()}.json`)

    const err = await indexer.download(rootHash, tempPath, false)
    if (err) {
      await rm(tempPath, { force: true }).catch(() => { })
      return null
    }

    const fileData = await readFile(tempPath)
    await rm(tempPath, { force: true }).catch(() => { })

    return JSON.parse(fileData.toString('utf-8')) as T
  } catch { return null }
}

// ─── Verify a hash exists on 0G Storage ───────────────────────
export async function verifyStorageHash(rootHash: string): Promise<boolean> {
  const data = await downloadFromStorage(rootHash)
  return data !== null
}

// ─── Explorer URL ──────────────────────────────────────────────
export function getExplorerUrl(hash: string): string {
  return getStorageExplorerUrl(hash)
}

// ─── Config check ─────────────────────────────────────────────
export function is0GConfigured(): boolean {
  const network = get0GNetworkConfig()
  return !!(network.walletPrivateKey && network.rpcUrl && network.indexerUrl)
}

// ─── OpenClaw plugin snippet ──────────────────────────────────
export const OPENCLAW_PLUGIN_CODE = `
import { memosPlugin } from 'memos-openclaw'

const agent = new OpenClawAgent({
  plugins: [
    memosPlugin({
      apiUrl: 'https://your-memos.vercel.app',
      agentId: 'agent_your_unique_id',
    })
  ]
})

await agent.memory.save('User hates spicy food', { type: 'semantic' })
const memories = await agent.memory.search('food preferences')
const result   = await agent.skills.run('skill_summarizer', { input: longText })
`
