/**
 * lib/intelligence/consolidation.ts
 * 
 * Semantic Consolidation Engine
 * Reads a batch of short-term or episodic memories and extracts a high-level
 * generalized pattern (semantic memory). This mimics human sleep consolidation.
 */
import { computeInference } from './llm';
import { Memory } from '../types';

export async function consolidateMemories(episodicMemories: Memory[]): Promise<string | null> {
  if (episodicMemories.length < 3) {
    // Need at least 3 memories to form a pattern
    return null;
  }

  const context = episodicMemories.map((m, i) => `[Mem ${i+1}] ${m.content}`).join('\n');
  
  const systemPrompt = `
    You are the semantic memory consolidation engine for an AI agent.
    You will receive a list of highly specific episodic memories (events that happened).
    Your job is to extract 1 single overarching generalized pattern, rule, or preference 
    from these granular events. 
    
    If there is no clear pattern, simply return the exact word: "NONE"
    
    If a pattern exists, return a single, concise sentence stating the learned fact 
    or rule (without preamble, formatting, or explanation).
  `;
  
  const userPrompt = `
    EPISODIC MEMORIES:
    ${context}
  `;

  try {
    const analysis = await computeInference({ systemPrompt, userPrompt, temperature: 0.2 });
    
    if (analysis.trim().toUpperCase() === 'NONE') {
      return null;
    }

    return analysis.trim();
  } catch (e) {
    console.error('[Consolidation Engine] Failed:', e);
    return null;
  }
}
