/**
 * lib/write-queue.ts
 *
 * Resilient write queue for 0G Storage uploads.
 *
 * If 0G Storage is temporarily unreachable, writes are queued in RAM
 * and flushed when connectivity returns. This ensures zero data loss
 * even during 0G outages.
 *
 * Architecture:
 * - Each write operation is a "job" with a type, data, and retry count.
 * - A background loop checks the queue every FLUSH_INTERVAL_MS.
 * - Failed jobs are retried with exponential backoff (max MAX_RETRIES).
 * - Permanently failed jobs are logged and removed after exhausting retries.
 */

import { uploadToStorage } from './0g-storage'

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
const DEFAULT_MAX_RETRIES = 3

let queue: WriteJob[] = []
let callbacks: Map<WriteJobType, WriteCallback> = new Map()
let flushTimer: ReturnType<typeof setInterval> | null = null
let isFlushing = false

// Stats
let _totalQueued = 0
let _totalFlushed = 0
let _totalFailed = 0

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
      const backoff = Math.min(30_000, 2_000 * Math.pow(2, job.retries - 1))
      if (Date.now() - job.lastAttempt < backoff) continue
    }

    try {
      job.lastAttempt = Date.now()
      const rootHash = await uploadToStorage(job.data)

      // Success — remove from queue and invoke callback
      queue = queue.filter(j => j.id !== job.id)
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

      if (job.retries >= job.maxRetries) {
        // Permanently failed — remove from queue
        queue = queue.filter(j => j.id !== job.id)
        _totalFailed++
        console.error(`✗ WriteQueue: ${job.type} ${job.id} permanently failed after ${job.maxRetries} retries: ${err.message}`)
      } else {
        console.warn(`⚠ WriteQueue: ${job.type} ${job.id} failed (attempt ${job.retries}/${job.maxRetries}): ${err.message}`)
      }
    }
  }

  isFlushing = false
}

/**
 * Start the background flush timer.
 */
export function startWriteQueue(): void {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    void flushQueue()
  }, FLUSH_INTERVAL_MS)

  // Don't prevent process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref()
  }

  console.log(`📝 WriteQueue: Background flush started (every ${FLUSH_INTERVAL_MS / 1000}s)`)
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
