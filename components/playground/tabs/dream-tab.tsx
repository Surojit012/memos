'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */

interface NewMemory {
  id: string;
  content: string;
  type: string;
}

interface DreamResult {
  memoriesAnalyzed: number;
  patternsFound: number;
  newMemoriesCreated: number;
  dreamSummary: string;
  newMemories: NewMemory[];
  duration: number;
}

interface DreamTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  setActiveTab: (tab: string) => void;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

/* ─── Constants ─── */

const LOADING_MESSAGES = [
  'Analyzing episodic memories...',
  'Finding behavioral patterns...',
  'Synthesizing semantic knowledge...',
  'Writing new memories...',
];

const SANDBOX_RESULT: DreamResult = {
  memoriesAnalyzed: 5,
  patternsFound: 2,
  newMemoriesCreated: 2,
  dreamSummary: 'The agent identified a consistent pattern: this user is a developer building AI tools with a preference for Python. Two semantic memories were consolidated from episodic traces.',
  newMemories: [
    { id: 'mem_dream_001', content: 'User is an AI developer who consistently prefers Python-first architectures', type: 'semantic' },
    { id: 'mem_dream_002', content: 'User engages deeply with memory and reasoning features, suggesting a research or product-building context', type: 'semantic' },
  ],
  duration: 14200,
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  episodic: { bg: 'rgba(94,125,126,0.12)', color: '#74989a' },
  semantic: { bg: 'rgba(166,123,115,0.12)', color: '#A67B73' },
  procedural: { bg: 'rgba(122,158,142,0.10)', color: '#7A9E8E' },
};

/* ─── Component ─── */

export function DreamTab({ isLive, agentId, apiKey, setActiveTab, onRequestUpdate, onResponseUpdate }: DreamTabProps) {
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [running, setRunning] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [loadingOpacity, setLoadingOpacity] = useState(1);
  const [result, setResult] = useState<DreamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* ─── Fetch memory count on mount ─── */
  useEffect(() => {
    if (!isLive) {
      setMemoryCount(5);
      return;
    }
    if (!agentId || !apiKey) return;

    let cancelled = false;
    const load = async () => {
      setLoadingCount(true);
      try {
        const res = await fetch(`/api/memory?agentId=${encodeURIComponent(agentId)}`, { headers: authHeaders() });
        const data = await res.json();
        if (cancelled) return;
        const mems = Array.isArray(data) ? data : data.memories ?? data.data ?? [];
        setMemoryCount(mems.length);
      } catch {
        if (!cancelled) setMemoryCount(0);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isLive, agentId, apiKey, authHeaders]);

  /* ─── Loading message cycling ─── */
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setLoadingMsgIndex(0);
    setLoadingOpacity(1);
    intervalRef.current = setInterval(() => {
      setLoadingOpacity(0);
      setTimeout(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setLoadingOpacity(1);
      }, 300);
    }, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  /* ─── Trigger dream ─── */
  const handleDream = async () => {
    setRunning(true);
    setResult(null);
    setError(null);

    const endpoint = `/api/agent/${encodeURIComponent(agentId ?? 'demo_agent')}/dreams`;
    const method = 'POST';
    const headers = authHeaders();
    const bodyPayload = {};

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
          setError(data.error ?? 'Dream cycle failed');
          onResponseUpdate({ response: data, error: data.error ?? 'Dream cycle failed', isLoading: false, statusCode: res.status });
          return;
        }

        // Map API field names → DreamResult interface
        const mapped: DreamResult = {
          memoriesAnalyzed: data.totalMemoriesProcessed ?? 0,
          patternsFound: data.consolidatedCount ?? 0,
          newMemoriesCreated: data.consolidatedCount ?? 0,
          dreamSummary: data.message ?? '',
          duration: data.durationMs ?? 0,
          newMemories: (data.consolidated ?? []).map((content: string, i: number) => ({
            id: `dream_consolidated_${i}`,
            content,
            type: 'semantic',
          })),
        };
        setResult(mapped);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setResult(SANDBOX_RESULT);
        onResponseUpdate({ response: SANDBOX_RESULT, error: null, isLoading: false, statusCode: 200 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setRunning(false);
    }
  };

  const handleRunAnother = () => {
    setResult(null);
    setError(null);
  };

  /* ─── Render: Loading count ─── */
  if (loadingCount) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--pg-text3)', fontSize: 13, fontFamily: 'var(--pg-sans)' }}>
        Checking memory count...
      </div>
    );
  }

  /* ─── Render: Guard state ─── */
  if (isLive && memoryCount !== null && memoryCount < 3) {
    return (
      <div
        style={{
          borderLeft: '3px solid var(--pg-cyan)',
          background: 'rgba(94,125,126,0.12)',
          borderRadius: 6,
          padding: 16,
        }}
      >
        <p style={{ fontSize: 14, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Dream consolidation requires at least 3 memories. You currently have <strong>{memoryCount}</strong> stored.
        </p>
        <button
          onClick={() => setActiveTab('memory')}
          style={{
            fontSize: 13,
            fontFamily: 'var(--pg-sans)',
            fontWeight: 500,
            color: '#74989a',
            background: 'transparent',
            border: '1px solid var(--pg-border)',
            borderRadius: 6,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(94,125,126,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Go to Memory Tab
        </button>
      </div>
    );
  }

  /* ─── Render: Result ─── */
  if (result) {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: '#7A9E8E' }}>
            Dream Complete ✓
          </span>
          <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text3)' }}>
            {result.duration}ms
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '0 0 12px' }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            ['Memories analyzed', result.memoriesAnalyzed],
            ['Patterns found', result.patternsFound],
            ['New memories', result.newMemoriesCreated],
          ].map(([label, val]) => (
            <div key={String(label)} style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)' }}>
              {label}: <span style={{ fontWeight: 500, color: 'var(--pg-text)' }}>{val}</span>
            </div>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '0 0 12px' }} />

        {/* Summary */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pg-text3)', marginBottom: 6, fontWeight: 500, fontFamily: 'var(--pg-sans)' }}>
            Summary
          </div>
          <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text)', lineHeight: 1.6, margin: 0 }}>
            {result.dreamSummary}
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '0 0 12px' }} />

        {/* New memories */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pg-text3)', marginBottom: 8, fontWeight: 500, fontFamily: 'var(--pg-sans)' }}>
            New Memories
          </div>
          {result.newMemories.length === 0 ? (
            <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text3)', margin: 0, fontStyle: 'italic' }}>
              No new patterns extracted this cycle. Store more episodic memories and run again.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.newMemories.map((mem) => {
                const tc = TYPE_COLORS[mem.type] ?? TYPE_COLORS.semantic;
                return (
                  <div key={mem.id} style={{ border: '1px solid var(--pg-border)', borderRadius: 6, padding: 12, background: 'rgba(232,228,220,0.03)' }}>
                    <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text)', lineHeight: 1.5, margin: '0 0 6px' }}>
                      {mem.content}
                    </p>
                    <span style={{ fontSize: 11, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: tc.color, background: tc.bg, borderRadius: 4, padding: '2px 6px' }}>
                      {mem.type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Run another */}
        <button
          onClick={handleRunAnother}
          style={{
            width: '100%',
            height: 40,
            fontSize: 14,
            fontFamily: 'var(--pg-sans)',
            fontWeight: 500,
            color: 'var(--pg-text)',
            background: 'transparent',
            border: '1px solid var(--pg-border)',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,228,220,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Run Another Dream
        </button>
      </div>
    );
  }

  /* ─── Render: Trigger UI ─── */
  return (
    <div>
      <p style={{ fontSize: 14, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Dream consolidation analyzes your episodic memories, finds patterns, and creates new semantic memories — similar to how human sleep consolidates learning.
      </p>

      <button
        onClick={handleDream}
        disabled={running}
        style={{
          width: '100%',
          height: 40,
          fontSize: 14,
          fontFamily: 'var(--pg-sans)',
          fontWeight: 500,
          color: 'var(--pg-bg)',
          background: running ? 'var(--pg-text2)' : 'var(--pg-text)',
          border: 'none',
          borderRadius: 6,
          cursor: running ? 'not-allowed' : 'pointer',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { if (!running) e.currentTarget.style.background = 'var(--pg-cyan-hi)'; }}
        onMouseLeave={(e) => { if (!running) e.currentTarget.style.background = 'var(--pg-cyan)'; }}
      >
        {running ? 'Dreaming...' : 'Start Dream Cycle'}
      </button>

      <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text3)', marginTop: 8, textAlign: 'center' }}>
        This may take 10–30 seconds
      </p>

      {/* Loading status */}
      {running && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(232,228,220,0.04)',
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 13,
            fontFamily: 'var(--pg-sans)',
            color: 'var(--pg-text2)',
            opacity: loadingOpacity,
            transition: 'opacity 300ms ease',
          }}
        >
          {LOADING_MESSAGES[loadingMsgIndex]}
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: '#C67867', marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
