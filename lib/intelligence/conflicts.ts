/**
 * lib/intelligence/conflicts.ts
 * 
 * Contradiction Detection
 * Uses 0G Compute to evaluate a new memory against existing highly similar memories.
 * Flags conflicts or returns a contradiction analysis.
 */
import { computeInference } from './llm';
import { Memory } from '../types';

export async function detectConflict(newMemoryContent: string, similarMemories: Memory[]): Promise<{ hasConflict: boolean, reason: string }> {
  if (similarMemories.length === 0) {
    return { hasConflict: false, reason: 'No prior context.' };
  }

  const context = similarMemories.map((m, i) => `[Mem ${i+1}] ${m.content}`).join('\n');
  
  const systemPrompt = `
    You are an intelligent contradiction detector for an AI agent's memory stream.
    You will be provided with a list of existing baseline memories, and one new memory.
    Your job is to determine if the NEW memory directly contradicts the EXISTING baseline memories.
    
    If it contradicts, explain exactly why.
    If it represents an update (e.g. "User prefers dark mode now"), explain it is an update, NOT a strict contradiction.
    
    Return pure JSON exclusively in this exact format:
    {"hasConflict": boolean, "reason": "string explaining the analysis"}
  `;
  
  const userPrompt = `
    EXISTING BASELINE MEMORIES:
    ${context}
    
    NEW MEMORY TO EVALUATE:
    ${newMemoryContent}
  `;

  try {
    const rawMatch = await computeInference({ systemPrompt, userPrompt });
    // Attempt parse
    const match = rawMatch.match(/\{[\s\S]*?\}/);
    if (match) {
        const parsed = JSON.parse(match[0]);
        return {
            hasConflict: !!parsed.hasConflict,
            reason: parsed.reason || 'Analyzed'
        };
    }
    return { hasConflict: false, reason: 'Could not parse output' };
  } catch (e) {
    console.error('[Contradiction Detector] Failed:', e);
    return { hasConflict: false, reason: 'Error running detector' };
  }
}
