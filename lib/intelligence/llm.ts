/**
 * lib/intelligence/llm.ts
 * 
 * Core LLM inference layer for MemoryOS Intelligence.
 * 
 * Priority order:
 * 1. 0G Router API (ZG_ROUTER_API_KEY) — decentralized inference via 0G Compute
 * 2. Fireworks API (FIREWORKS_API_KEY) — fast fallback
 * 3. OpenAI API (OPENAI_API_KEY) — legacy fallback
 * 4. Local mock — only when NO keys are configured
 */

interface ComputeParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export async function computeInference(params: ComputeParams): Promise<string> {
  // ── Provider 1: 0G Router API (primary) ──
  const zgKey = process.env.ZG_ROUTER_API_KEY;
  if (zgKey && zgKey !== 'sk-your_router_key_here') {
    try {
      const model = process.env.ZG_ROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct';
      const res = await fetch('https://router-api.0g.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${zgKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt }
          ],
          temperature: params.temperature || 0.1,
          max_tokens: 1024,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `0G Router error: HTTP ${res.status}`);

      const output = data.choices?.[0]?.message?.content?.trim();
      if (output) {
        console.log(`[0G Router] Inference complete via ${data.model || model} (${data.usage?.total_tokens || '?'} tokens)`);
        return output;
      }
      throw new Error('Empty response from 0G Router');
    } catch (e: any) {
      console.warn(`[0G Router] Inference failed: ${e.message}, trying fallback...`);
    }
  }

  // ── Provider 2: Fireworks API (fallback) ──
  const fwKey = process.env.FIREWORKS_API_KEY;
  if (fwKey) {
    try {
      const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fwKey}`,
        },
        body: JSON.stringify({
          model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt }
          ],
          temperature: params.temperature || 0.1,
          max_tokens: 1024,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Fireworks error');

      const output = data.choices?.[0]?.message?.content?.trim();
      if (output) {
        console.log(`[Fireworks] Inference complete (fallback)`);
        return output;
      }
      throw new Error('Empty response from Fireworks');
    } catch (e: any) {
      console.warn(`[Fireworks] Inference failed: ${e.message}, trying next fallback...`);
    }
  }

  // ── Provider 3: OpenAI API (legacy fallback) ──
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt }
          ],
          temperature: params.temperature || 0.1
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'OpenAI error');
      
      return data.choices[0].message.content.trim();
    } catch (e: any) {
      console.warn(`[OpenAI] Inference failed: ${e.message}`);
    }
  }

  // ── Provider 4: Local mock (no keys configured) ──
  console.warn('[Intelligence] No inference provider available. Set ZG_ROUTER_API_KEY, FIREWORKS_API_KEY, or OPENAI_API_KEY.');
  console.log('[Mock] Running local inference simulation...');
  await new Promise(r => setTimeout(r, 500)); 

  const lowerSys = params.systemPrompt.toLowerCase();
  
  if (lowerSys.includes('contradict')) {
    return JSON.stringify({
      hasConflict: false,
      reason: "No inference provider configured — unable to detect conflicts."
    });
  }
  
  if (lowerSys.includes('consolidat')) {
    return "NONE";
  }
  
  if (lowerSys.includes('rag') || lowerSys.includes('analyzing')) {
    return "No inference provider is configured. Please set ZG_ROUTER_API_KEY in .env.local to enable real AI responses.";
  }

  return "No inference provider configured. Set ZG_ROUTER_API_KEY in .env.local.";
}
