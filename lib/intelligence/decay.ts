/**
 * lib/intelligence/decay.ts
 * 
 * Importance Decay Algorithm
 * Lowers importance of memories over time if they are rarely accessed.
 * High access count helps memories resist decay.
 */

import { Memory } from '../types';

/**
 * Calculates a new importance score [1-5].
 * @param memory The memory to evaluate for decay.
 * @returns new importance integer, or null if no change.
 */
export function calculateDecay(memory: Memory): number | null {
  const now = Date.now();
  const daysSinceUpdate = (now - memory.updatedAt) / (1000 * 60 * 60 * 24);
  
  // If memory was updated very recently, no decay
  if (daysSinceUpdate < 7) {
    return null;
  }

  const baseDecayThreshold = 14; // Decay triggers after 14 days
  
  // High access count gives extra life (e.g. 5 accesses = 5 extra days of resistance)
  const accessResistanceDays = memory.accessCount * 1.5;
  const effectiveDaysStale = daysSinceUpdate - accessResistanceDays;
  
  if (effectiveDaysStale > baseDecayThreshold && memory.importance > 1) {
    // Important: we only ever decay by 1 point at a time to be gradual.
    const newImportance = memory.importance - 1;
    return Math.max(1, newImportance);
  }

  return null;
}
