'use client';

import { useEffect, useState } from 'react';

interface CommandBarProps {
  method: string;
  endpoint: string;
  isLoading: boolean;
  canRun: boolean;
  onRun: () => void;
  onToggleSnippets: () => void;
  snippetsOpen: boolean;
}

/**
 * The signature surface of the Playground.
 * Endpoint rendered in Instrument Serif italic — the one literary moment
 * on a screen otherwise built from mono and sans.
 */
export function CommandBar({
  method,
  endpoint,
  isLoading,
  canRun,
  onRun,
  onToggleSnippets,
  snippetsOpen,
}: CommandBarProps) {
  const [pulse, setPulse] = useState(false);

  // When endpoint changes (user switches tab), pulse the title softly.
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 320);
    return () => clearTimeout(t);
  }, [method, endpoint]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '20px 24px 18px',
        position: 'relative',
      }}
      className="pg-seam"
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          opacity: pulse ? 0 : 1,
          transform: pulse ? 'translateY(2px)' : 'translateY(0)',
          transition: 'opacity 280ms ease, transform 280ms ease',
        }}
      >
        <span className="pg-endpoint-method">{method}</span>
        <span className="pg-endpoint" title={endpoint}>
          {endpoint}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleSnippets}
        className="pg-btn pg-btn-ghost"
        aria-expanded={snippetsOpen}
        aria-controls="pg-snippets-drawer"
        title="Show code snippets"
      >
        <span style={{ fontFamily: 'var(--pg-mono)', fontSize: 12 }}>{'</>'}</span>
        <span style={{ fontSize: 12 }}>Copy as</span>
      </button>

      <button
        type="button"
        onClick={onRun}
        disabled={!canRun || isLoading}
        className="pg-btn pg-btn-primary"
        style={{ position: 'relative', overflow: 'hidden', minWidth: 116, justifyContent: 'center' }}
      >
        {isLoading ? (
          <>
            <span style={{ fontSize: 13 }}>Running</span>
            <span aria-hidden className="pg-shimmer" style={{ position: 'absolute', inset: 0 }} />
          </>
        ) : (
          <>
            <span className="pg-kbd" style={{ color: '#0F1210', background: 'rgba(15,18,16,0.18)', borderColor: 'rgba(15,18,16,0.24)' }}>⌘↵</span>
            <span>Run</span>
          </>
        )}
      </button>
    </div>
  );
}
