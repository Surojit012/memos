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
  episodic: { bg: '#eff6ff', color: '#2563eb' },
  semantic: { bg: '#faf5ff', color: '#9333ea' },
  procedural: { bg: '#f0fdf4', color: '#16a34a' },
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

        setResult(data as DreamResult);
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
      <div style={{ textAlign: 'center', padding: 40, color: '#a1a1aa', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>
        Checking memory count...
      </div>
    );
  }

  /* ─── Render: Guard state ─── */
  if (isLive && memoryCount !== null && memoryCount < 3) {
    return (
      <div
        style={{
          borderLeft: '3px solid #2563eb',
          background: '#eff6ff',
          borderRadius: 6,
          padding: 16,
        }}
      >
        <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', margin: '0 0 12px', lineHeight: 1.5 }}>
          Dream consolidation requires at least 3 memories. You currently have <strong>{memoryCount}</strong> stored.
        </p>
        <button
          onClick={() => setActiveTab('memory')}
          style={{
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            color: '#2563eb',
            background: 'var(--surface)',
            border: '1px solid #bfdbfe',
            borderRadius: 6,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
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
          <span style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#16a34a' }}>
            Dream Complete ✓
          </span>
          <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa' }}>
            {result.duration}ms
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '0 0 12px' }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            ['Memories analyzed', result.memoriesAnalyzed],
            ['Patterns found', result.patternsFound],
            ['New memories', result.newMemoriesCreated],
          ].map(([label, val]) => (
            <div key={String(label)} style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>
              {label}: <span style={{ fontWeight: 500, color: '#ffffff' }}>{val}</span>
            </div>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '0 0 12px' }} />

        {/* Summary */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', marginBottom: 6, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Summary
          </div>
          <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', lineHeight: 1.6, margin: 0 }}>
            {result.dreamSummary}
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '0 0 12px' }} />

        {/* New memories */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', marginBottom: 8, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>
            New Memories
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.newMemories.map((mem) => {
              const tc = TYPE_COLORS[mem.type] ?? TYPE_COLORS.semantic;
              return (
                <div key={mem.id} style={{ border: '1px solid #e4e4e7', borderRadius: 6, padding: 12, background: 'var(--surface)' }}>
                  <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', lineHeight: 1.5, margin: '0 0 6px' }}>
                    {mem.content}
                  </p>
                  <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: tc.color, background: tc.bg, borderRadius: 4, padding: '2px 6px' }}>
                    {mem.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Run another */}
        <button
          onClick={handleRunAnother}
          style={{
            width: '100%',
            height: 40,
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            color: '#ffffff',
            background: 'var(--surface)',
            border: '1px solid #e4e4e7',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
        >
          Run Another Dream
        </button>
      </div>
    );
  }

  /* ─── Render: Trigger UI ─── */
  return (
    <div>
      <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Dream consolidation analyzes your episodic memories, finds patterns, and creates new semantic memories — similar to how human sleep consolidates learning.
      </p>

      <button
        onClick={handleDream}
        disabled={running}
        style={{
          width: '100%',
          height: 40,
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          color: 'var(--surface)',
          background: running ? 'var(--text2)' : '#ffffff',
          border: 'none',
          borderRadius: 6,
          cursor: running ? 'not-allowed' : 'pointer',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { if (!running) e.currentTarget.style.background = '#27272a'; }}
        onMouseLeave={(e) => { if (!running) e.currentTarget.style.background = '#ffffff'; }}
      >
        {running ? 'Dreaming...' : 'Start Dream Cycle'}
      </button>

      <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginTop: 8, textAlign: 'center' }}>
        This may take 10–30 seconds
      </p>

      {/* Loading status */}
      {running && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#f4f4f5',
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--text2)',
            opacity: loadingOpacity,
            transition: 'opacity 300ms ease',
          }}
        >
          {LOADING_MESSAGES[loadingMsgIndex]}
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
