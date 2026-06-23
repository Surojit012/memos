'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  publisher: string;
}

interface ExecutionResult {
  skillId: string;
  result: string;
  tokensUsed: number;
  duration: number;
}

interface SkillsTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

/* ─── Constants ─── */

const SANDBOX_SKILLS: Skill[] = [
  { id: 'skill_001', name: 'Text Summarizer', description: 'Condenses long text into key points', category: 'productivity', price: 0, publisher: 'memos Team' },
  { id: 'skill_002', name: 'Sentiment Analyzer', description: 'Detects emotional tone in text', category: 'analysis', price: 0, publisher: 'memos Team' },
  { id: 'skill_003', name: 'Code Reviewer', description: 'Reviews code for bugs, style, and performance', category: 'development', price: 0.001, publisher: 'memos Team' },
  { id: 'skill_004', name: 'Memory Tagger', description: 'Auto-generates tags for memories', category: 'memory', price: 0.001, publisher: 'memos Team' },
];

/* ─── Component ─── */

export function SkillsTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: SkillsTabProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [inputText, setInputText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* ─── Load skills on mount ─── */
  useEffect(() => {
    if (!isLive) {
      setSkills(SANDBOX_SKILLS);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingSkills(true);
      try {
        const res = await fetch('/api/skills');
        const data = await res.json();
        if (cancelled) return;
        const list: Skill[] = Array.isArray(data) ? data : data.skills ?? [];
        setSkills(list.length > 0 ? list : SANDBOX_SKILLS);
      } catch {
        if (!cancelled) setSkills(SANDBOX_SKILLS);
      } finally {
        if (!cancelled) setLoadingSkills(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isLive]);

  /* ─── Execute skill ─── */
  const handleExecute = async () => {
    if (!selectedSkill || !inputText.trim()) return;

    setExecuting(true);
    setExecResult(null);
    setError(null);

    const endpoint = '/api/execute';
    const method = 'POST';
    const headers = authHeaders();
    const bodyPayload = {
      agentId: isLive ? agentId : 'demo_agent',
      skillId: selectedSkill.id,
      input: inputText.trim(),
    };

    onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
    onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

    try {
      if (isLive) {
        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error ?? 'Execution failed';
          setError(errMsg);
          onResponseUpdate({ response: data, error: errMsg, isLoading: false, statusCode: res.status });
          return;
        }

        setExecResult(data as ExecutionResult);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const sandboxResult: ExecutionResult = {
          skillId: selectedSkill.id,
          result: 'Simulated result from ' + selectedSkill.name + ': your input has been processed. In live mode this would use the configured LLM provider.',
          tokensUsed: 142,
          duration: 890,
        };

        setExecResult(sandboxResult);
        onResponseUpdate({ response: sandboxResult, error: null, isLoading: false, statusCode: 200 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setExecuting(false);
    }
  };

  /* ─── Render ─── */
  if (loadingSkills) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#a1a1aa', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>
        Loading skills...
      </div>
    );
  }

  return (
    <div>
      {/* Skill grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {skills.map((skill) => {
          const isSelected = selectedSkill?.id === skill.id;
          return (
            <button
              key={skill.id}
              onClick={() => {
                setSelectedSkill(skill);
                setExecResult(null);
                setError(null);
              }}
              style={{
                textAlign: 'left',
                border: isSelected ? '2px solid #18181b' : '1px solid #e4e4e7',
                borderRadius: 8,
                padding: 14,
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#18181b' }}>
                {skill.name}
              </span>
              <span style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', marginTop: 4, lineHeight: 1.4 }}>
                {skill.description}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#71717a',
                    background: '#f4f4f5',
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  {skill.category}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 500,
                    color: skill.price === 0 ? '#16a34a' : '#71717a',
                    marginLeft: 'auto',
                  }}
                >
                  {skill.price === 0 ? 'Free' : `${skill.price} ETH`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Execution panel */}
      {selectedSkill && (
        <div>
          <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '0 0 12px' }} />

          <div style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#18181b', marginBottom: 8 }}>
            {selectedSkill.name}
          </div>

          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your input for this skill..."
            style={{
              width: '100%',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              color: '#18181b',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 6,
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 8,
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#18181b'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e4e4e7'; }}
          />

          {/* Paid skill warning */}
          {selectedSkill.price > 0 && isLive && (
            <div
              style={{
                border: '1px solid #d97706',
                background: '#fffbeb',
                borderRadius: 6,
                padding: 10,
                marginBottom: 8,
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#92400e',
              }}
            >
              This skill costs {selectedSkill.price} ETH per execution. On-chain payment required in production.
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={executing || !inputText.trim()}
            style={{
              width: '100%',
              height: 40,
              fontSize: 14,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#ffffff',
              background: executing || !inputText.trim() ? '#71717a' : '#18181b',
              border: 'none',
              borderRadius: 6,
              cursor: executing || !inputText.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { if (!executing && inputText.trim()) e.currentTarget.style.background = '#27272a'; }}
            onMouseLeave={(e) => { if (!executing && inputText.trim()) e.currentTarget.style.background = '#18181b'; }}
          >
            {executing ? 'Executing...' : 'Execute Skill'}
          </button>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', marginTop: 8 }}>
              {error}
            </p>
          )}

          {/* Result */}
          {execResult && (
            <div
              style={{
                marginTop: 12,
                background: '#f4f4f5',
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', marginBottom: 6, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>
                Result:
              </div>
              <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#18181b', lineHeight: 1.6, margin: 0 }}>
                {execResult.result}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
