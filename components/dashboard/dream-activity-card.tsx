'use client';

import { useState } from 'react';
import { StatsCard } from './stats-card';

interface DreamActivityCardProps {
  agentId: string;
  apiKey: string;
  semanticCount: number | null;
  isLoading: boolean;
  error: string | null;
}

export function DreamActivityCard({ agentId, apiKey, semanticCount, isLoading, error }: DreamActivityCardProps) {
  const [dreamLoading, setDreamLoading] = useState(false);
  const [dreamResult, setDreamResult] = useState<{ newMemoriesCreated: number } | null>(null);
  const [dreamError, setDreamError] = useState<string | null>(null);

  const handleTriggerDream = async () => {
    setDreamLoading(true);
    setDreamError(null);
    setDreamResult(null);

    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/dreams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? 'Dream failed';
        if (msg.toLowerCase().includes('compute') || msg.toLowerCase().includes('llm')) {
          setDreamError('Dream requires an active LLM provider (0G Compute or fallback).');
        } else {
          setDreamError(msg);
        }
      } else {
        setDreamResult({ newMemoriesCreated: data.newMemoriesCreated ?? 0 });
        setTimeout(() => setDreamResult(null), 3000);
      }
    } catch (err) {
      setDreamError('Network error while triggering dream.');
    } finally {
      setDreamLoading(false);
    }
  };

  return (
    <StatsCard title="Dream Activity" isLoading={isLoading} error={error}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Semantic memory count */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff' }}>Semantic memories:</span>
            <span
              style={{
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 600,
                color: '#9333ea',
                background: '#faf5ff',
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              {semanticCount ?? '—'}
            </span>
          </div>
          <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0 }}>
            Semantic memories are created by dream consolidation cycles.
          </p>
        </div>

        {/* Action / Status */}
        {dreamResult ? (
          <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, textAlign: 'center' }}>
            Dream complete — {dreamResult.newMemoriesCreated} new memories created
          </div>
        ) : dreamLoading ? (
          <div style={{ padding: '10px 14px', border: '1px solid #e4e4e7', borderRadius: 6, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Running dream cycle
            <span className="dot-1" style={{ marginLeft: 2 }}>.</span>
            <span className="dot-2">.</span>
            <span className="dot-3">.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleTriggerDream}
              style={{
                width: '100%',
                height: 36,
                fontSize: 13,
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
              Trigger Dream
            </button>
            {dreamError && (
              <p style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', margin: 0, textAlign: 'center' }}>
                {dreamError}
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        .dot-1 { animation: blink 1s infinite; animation-delay: 0s; }
        .dot-2 { animation: blink 1s infinite; animation-delay: 0.2s; }
        .dot-3 { animation: blink 1s infinite; animation-delay: 0.4s; }
      `}</style>
    </StatsCard>
  );
}
