/**
 * lib/cache.ts
 *
 * LRU (Least Recently Used) cache for memos.
 *
 * Architecture:
 * - RAM is a cache. 0G Storage is the database.
 * - This cache sits between API routes and 0G Storage.
 * - On cache miss, items are fetched from 0G on demand.
 * - On write, items go to cache AND trigger async 0G upload.
 * - Eviction: When capacity is reached, the least recently accessed
 *   item is removed from RAM. It still exists on 0G Storage.
 *
 * This replaces the unbounded arrays in the old store.ts.
 */

export class LRUCache<K, V> {
  private capacity: number
  private cache: Map<K, V>

  // Stats for observability
  private _hits = 0
  private _misses = 0
  private _evictions = 0

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity)
    this.cache = new Map()
  }

  /**
   * Get an item from the cache.
   * Moves it to the "most recently used" position.
   * Returns undefined on cache miss.
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this._misses++
      return undefined
    }
    this._hits++
    // Move to end (most recently used) by deleting and re-inserting
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  /**
   * Check if key exists without affecting LRU order.
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * Insert or update an item in the cache.
   * If capacity is exceeded, evicts the least recently used item.
   */
  set(key: K, value: V): void {
    // If key already exists, delete first to reset position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.capacity) {
      // Evict LRU (first key in Map iteration order)
      const lruKey = this.cache.keys().next().value
      if (lruKey !== undefined) {
        this.cache.delete(lruKey)
        this._evictions++
      }
    }
    this.cache.set(key, value)
  }

  /**
   * Delete an item from the cache.
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * Get all values in the cache (most recently used last).
   */
  values(): V[] {
    return Array.from(this.cache.values())
  }

  /**
   * Get all entries as [key, value] pairs.
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries())
  }

  /**
   * Get all keys.
   */
  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Current number of items in cache.
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Clear all items.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Iterate over all values, applying a filter.
   */
  filter(predicate: (value: V) => boolean): V[] {
    return this.values().filter(predicate)
  }

  /**
   * Find the first value matching a predicate.
   */
  find(predicate: (value: V) => boolean): V | undefined {
    const vals = Array.from(this.cache.values())
    for (let i = 0; i < vals.length; i++) {
      if (predicate(vals[i])) return vals[i]
    }
    return undefined
  }

  /**
   * Find the first value matching a predicate and return its key.
   */
  findKey(predicate: (value: V) => boolean): K | undefined {
    const entries = Array.from(this.cache.entries())
    for (let i = 0; i < entries.length; i++) {
      if (predicate(entries[i][1])) return entries[i][0]
    }
    return undefined
  }

  /**
   * Reduce over all values.
   */
  reduce<T>(fn: (acc: T, value: V) => T, initial: T): T {
    let acc = initial
    const vals = Array.from(this.cache.values())
    for (let i = 0; i < vals.length; i++) {
      acc = fn(acc, vals[i])
    }
    return acc
  }

  /**
   * Cache performance stats for observability.
   */
  getStats() {
    const total = this._hits + this._misses
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRate: total > 0 ? (this._hits / total * 100).toFixed(1) + '%' : 'N/A',
    }
  }

  /**
   * Reset stats counters.
   */
  resetStats(): void {
    this._hits = 0
    this._misses = 0
    this._evictions = 0
  }
}
