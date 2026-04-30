/**
 * lib/audit.ts
 *
 * Compliance Audit Log — Append-Only on 0G Storage
 *
 * Every significant platform operation is logged as an audit entry.
 * Entries are batched in memory and periodically flushed as a single
 * 0G blob. Auditors receive one root hash to verify the entire trail.
 *
 * Architecture:
 * - In-memory buffer collects entries as they happen
 * - Every N entries (or on explicit flush), the batch is uploaded to 0G
 * - Each batch links to the previous batch's hash (linked list on 0G)
 * - The result is a tamper-proof, append-only audit chain
 */

import { uploadToStorage } from './0g-storage'
import { createHash } from 'crypto'

export type AuditAction =
  | 'memory.create'
  | 'memory.delete'
  | 'memory.encrypt'
  | 'skill.create'
  | 'skill.update'
  | 'skill.execute'
  | 'agent.register'
  | 'agent.snapshot'
  | 'agent.dream'
  | 'pipeline.execute'
  | 'vault.access'

export interface AuditEntry {
  id: string
  action: AuditAction
  agentId: string
  timestamp: number
  details: Record<string, any>
  ipHash?: string          // SHA-256 of requester IP (privacy-safe)
}

interface AuditBatch {
  batchId: string
  entries: AuditEntry[]
  previousBatchHash?: string
  createdAt: number
  entryCount: number
  storageHash?: string
}

// ── In-memory audit buffer ──
let auditBuffer: AuditEntry[] = []
let lastBatchHash: string | undefined
let batchCount = 0
const FLUSH_THRESHOLD = 50 // Flush to 0G every 50 entries
const auditHistory: Array<{ batchId: string; storageHash: string; entryCount: number; createdAt: number }> = []

/**
 * Record an audit entry. The entry is buffered in memory
 * and auto-flushed to 0G when the threshold is reached.
 */
export function recordAudit(
  action: AuditAction,
  agentId: string,
  details: Record<string, any>,
  requestIp?: string
): void {
  const entry: AuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action,
    agentId,
    timestamp: Date.now(),
    details,
    ipHash: requestIp
      ? createHash('sha256').update(requestIp).digest('hex').slice(0, 16)
      : undefined,
  }

  auditBuffer.push(entry)

  // Auto-flush if buffer exceeds threshold
  if (auditBuffer.length >= FLUSH_THRESHOLD) {
    flushAuditLog().catch(err => {
      console.warn(`⚠ Audit flush failed: ${err.message}`)
    })
  }
}

/**
 * Flush the current audit buffer to 0G Storage.
 * Creates a linked batch pointing to the previous batch's hash.
 */
export async function flushAuditLog(): Promise<string | undefined> {
  if (auditBuffer.length === 0) return undefined

  const entries = [...auditBuffer]
  auditBuffer = [] // Clear buffer immediately
  batchCount++

  const batch: AuditBatch = {
    batchId: `audit_batch_${batchCount}`,
    entries,
    previousBatchHash: lastBatchHash,
    createdAt: Date.now(),
    entryCount: entries.length,
  }

  try {
    const hash = await uploadToStorage(batch)
    lastBatchHash = hash
    batch.storageHash = hash

    auditHistory.push({
      batchId: batch.batchId,
      storageHash: hash,
      entryCount: entries.length,
      createdAt: batch.createdAt,
    })

    console.log(`📋 Audit batch ${batch.batchId} flushed to 0G: ${hash} (${entries.length} entries)`)
    return hash
  } catch (err: any) {
    // Put entries back into the buffer on failure
    auditBuffer.unshift(...entries)
    batchCount--
    console.error(`✗ Audit flush failed: ${err.message}`)
    return undefined
  }
}

/**
 * Get audit log status for the status endpoint.
 */
export function getAuditStatus() {
  return {
    pendingEntries: auditBuffer.length,
    totalBatchesFlushed: auditHistory.length,
    lastBatchHash,
    history: auditHistory.slice(-10), // Last 10 batches
  }
}
