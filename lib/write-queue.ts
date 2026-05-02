/**
 * lib/write-queue.ts
 *
 * Resilient write queue for 0G Storage uploads with disk-backed WAL.
 *
 * ── Persistence Architecture ──
 * The write queue now has a Write-Ahead Log (WAL) backed by a local
 * JSON file. Every time a job is enqueued, the WAL is flushed to disk.
 * On server restart, the WAL is loaded and any incomplete writes are
 * replayed to 0G Storage before normal operation resumes.
 *
 * This means the data flow is:
 *   1. Memory saved to RAM store (instant API response)
 *   2. Write job enqueued → WAL flushed to disk (sync, ~1ms)
 *   3. Background loop uploads to 0G Storage
 *   4. On success → job removed from WAL
 *   5. On crash/restart → WAL is replayed, nothing is lost
 *
 * Architecture:
 * - Each write operation is a "job" with a type, data, and retry count.
 * - A background loop checks the queue every FLUSH_INTERVAL_MS.
 * - Failed jobs are retried with exponential backoff (max MAX_RETRIES).
 * - Permanently failed jobs are moved to a dead-letter log.
 */

import { uploadToStorage } from './0g-storage'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export type WriteJobType = 'memory' | 'skill' | 'agent' | 'manifest'

export interface WriteJob {
  id: string
  type: WriteJobType
  data: object
  retries: number
  maxRetries: number
  createdAt: number
  lastAttempt: number | null
  error: string | null
}

type WriteCallback = (job: WriteJob, rootHash: string) => void | Promise<void>

const FLUSH_INTERVAL_MS = 15_000
const DEFAULT_MAX_RETRIES = 5 // Increased from 3 for better resilience

// ── WAL (Write-Ahead Log) ─────────────────────────────────────
// Persists pending writes to disk so they survive server restarts.

const WAL_DIR = join(process.cwd(), 'cache')
const WAL_PATH = join(WAL_DIR, 'write-queue-wal.json')
const DEAD_LETTER_PATH = join(WAL_DIR, 'write-queue-dead.json')

function ensureWalDir(): void {
  if (!existsSync(WAL_DIR)) {
    mkdirSync(WAL_DIR, { recursive: true })
  }
}

/**
 * Persist the current queue state to disk.
 * Called after every enqueue/dequeue operation.
 * Synchronous to guarantee durability before returning.
 */
function persistWal(): void {
  try {
    ensureWalDir()
    writeFileSync(WAL_PATH, JSON.stringify(queue, null, 2), 'utf-8')
  } catch (err: any) {
    console.error(`⚠ WAL persist failed: ${err.message}`)
  }
}

/**
 * Load pending jobs from the WAL on startup.
 * Returns the number of recovered jobs.
 */
function loadWal(): number {
  try {
    if (!existsSync(WAL_PATH)) return 0
    const raw = readFileSync(WAL_PATH, 'utf-8')
    const recovered: WriteJob[] = JSON.parse(raw)
    if (!Array.isArray(recovered) || recovered.length === 0) return 0

    // Merge recovered jobs (don't duplicate)
    for (const job of recovered) {
      const exists = queue.find(j => j.id === job.id)
      if (!exists) {
        // Reset retry state for recovered jobs — give them fresh attempts
        job.retries = 0
        job.lastAttempt = null
        job.error = null
        queue.push(job)
        _totalQueued++
      }
    }

    console.log(`📂 WAL: Recovered ${recovered.length} pending write(s) from disk`)
    return recovered.length
  } catch (err: any) {
    console.error(`⚠ WAL load failed: ${err.message}`)
    return 0
  }
}

/**
 * Append a permanently failed job to the dead-letter log.
 */
function appendDeadLetter(job: WriteJob): void {
  try {
    ensureWalDir()
    let existing: WriteJob[] = []
    if (existsSync(DEAD_LETTER_PATH)) {
      try {
        existing = JSON.parse(readFileSync(DEAD_LETTER_PATH, 'utf-8'))
      } catch { /* corrupted file, start fresh */ }
    }
    existing.push({ ...job, lastAttempt: Date.now() })
    // Keep only last 100 dead letters
    if (existing.length > 100) existing = existing.slice(-100)
    writeFileSync(DEAD_LETTER_PATH, JSON.stringify(existing, null, 2), 'utf-8')
  } catch (err: any) {
    console.error(`⚠ Dead letter write failed: ${err.message}`)
  }
}

// ── Queue State ───────────────────────────────────────────────

let queue: WriteJob[] = []
let callbacks: Map<WriteJobType, WriteCallback> = new Map()
let flushTimer: ReturnType<typeof setInterval> | null = null
let isFlushing = false

// Stats
let _totalQueued = 0
let _totalFlushed = 0
let _totalFailed = 0
let _walRecovered = 0

/**
 * Register a callback to be invoked after a successful upload.
 * Used to update manifests, caches, etc. after 0G confirms.
 */
export function onWriteComplete(type: WriteJobType, callback: WriteCallback): void {
  callbacks.set(type, callback)
}

/**
 * Enqueue a write job. The data will be uploaded to 0G Storage
 * either immediately (if connected) or on the next flush cycle.
 *
 * The job is persisted to the WAL (disk) before returning,
 * guaranteeing it survives server crashes.
 */
export function enqueueWrite(
  id: string,
  type: WriteJobType,
  data: object,
  maxRetries = DEFAULT_MAX_RETRIES
): void {
  // Deduplicate: if a job with the same ID exists, replace it
  const existingIndex = queue.findIndex(j => j.id === id)
  const job: WriteJob = {
    id,
    type,
    data,
    retries: 0,
    maxRetries,
    createdAt: Date.now(),
    lastAttempt: null,
    error: null,
  }

  if (existingIndex >= 0) {
    queue[existingIndex] = job
  } else {
    queue.push(job)
    _totalQueued++
  }

  // ── WAL: Persist to disk before doing anything else ──
  persistWal()

  // Try to flush immediately (non-blocking)
  void flushQueue()
}

/**
 * Attempt to flush all queued writes to 0G Storage.
 * Processes jobs sequentially to avoid nonce conflicts.
 */
async function flushQueue(): Promise<void> {
  if (isFlushing || queue.length === 0) return
  isFlushing = true

  const jobsToProcess = [...queue]

  for (const job of jobsToProcess) {
    // Exponential backoff: skip if too soon since last attempt
    if (job.lastAttempt) {
      const backoff = Math.min(60_000, 2_000 * Math.pow(2, job.retries - 1))
      if (Date.now() - job.lastAttempt < backoff) continue
    }

    try {
      job.lastAttempt = Date.now()
      const rootHash = await uploadToStorage(job.data)

      // Success — remove from queue, persist WAL, invoke callback
      queue = queue.filter(j => j.id !== job.id)
      persistWal() // Remove from disk WAL
      _totalFlushed++
      job.error = null

      const callback = callbacks.get(job.type)
      if (callback) {
        try {
          await callback(job, rootHash)
        } catch (err: any) {
          console.error(`⚠ Write callback failed for ${job.type} ${job.id}:`, err.message)
        }
      }

      console.log(`✓ WriteQueue: ${job.type} ${job.id} flushed to 0G → ${rootHash}`)
    } catch (err: any) {
      job.retries++
      job.error = err.message
      persistWal() // Update retry state on disk

      if (job.retries >= job.maxRetries) {
        // Permanently failed — move to dead-letter log
        queue = queue.filter(j => j.id !== job.id)
        persistWal()
        appendDeadLetter(job)
        _totalFailed++
        console.error(`✗ WriteQueue: ${job.type} ${job.id} permanently failed after ${job.maxRetries} retries: ${err.message}`)
        console.error(`  → Saved to dead-letter log: ${DEAD_LETTER_PATH}`)
      } else {
        console.warn(`⚠ WriteQueue: ${job.type} ${job.id} failed (attempt ${job.retries}/${job.maxRetries}): ${err.message}`)
      }
    }
  }

  isFlushing = false
}

/**
 * Start the background flush timer.
 * Also loads any pending writes from the WAL (disk) that
 * survived a previous server crash.
 */
export function startWriteQueue(): void {
  if (flushTimer) return

  // ── WAL Recovery: Load pending writes from previous session ──
  _walRecovered = loadWal()

  flushTimer = setInterval(() => {
    void flushQueue()
  }, FLUSH_INTERVAL_MS)

  // Don't prevent process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref()
  }

  const recoveryMsg = _walRecovered > 0
    ? ` (recovered ${_walRecovered} pending writes from WAL)`
    : ''
  console.log(`📝 WriteQueue: Background flush started (every ${FLUSH_INTERVAL_MS / 1000}s)${recoveryMsg}`)

  // If we recovered jobs, flush immediately
  if (_walRecovered > 0) {
    void flushQueue()
  }
}

/**
 * Stop the background flush timer.
 */
export function stopWriteQueue(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}

/**
 * Get current queue status for observability.
 */
export function getWriteQueueStats() {
  return {
    pending: queue.length,
    totalQueued: _totalQueued,
    totalFlushed: _totalFlushed,
    totalFailed: _totalFailed,
    walRecovered: _walRecovered,
    walPath: WAL_PATH,
    jobs: queue.map(j => ({
      id: j.id,
      type: j.type,
      retries: j.retries,
      maxRetries: j.maxRetries,
      error: j.error,
      age: Date.now() - j.createdAt,
    })),
  }
}

/**
 * Get the number of pending jobs.
 */
export function getQueueDepth(): number {
  return queue.length
}
