'use client';

import { useState } from 'react';

interface AgentContextBarProps {
  isLive: boolean;
  agentId: string | null;
  onLogin: () => void;
  onLogout: () => void;
}

export function AgentContextBar({ isLive, agentId, onLogin, onLogout }: AgentContextBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!agentId) return;
    navigator.clipboard.writeText(agentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header
      style={{
        height: 48,
        borderBottom: '1px solid #e4e4e7',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <span
        style={{
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          fontSize: 14,
          color: '#18181b',
          fontWeight: 500,
        }}
      >
        memos Playground
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isLive ? (
          <>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#71717a',
                background: '#f4f4f5',
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              Sandbox Mode
            </span>
            <button
              onClick={onLogin}
              style={{
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: '#ffffff',
                background: '#18181b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#27272a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#18181b'; }}
            >
              Log in
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                color: '#18181b',
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e4e4e7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
              title="Copy agent ID"
            >
              {agentId ? agentId.slice(0, 8) + '...' : ''}
              <span style={{ fontSize: 11, color: '#71717a' }}>
                {copied ? '✓ Copied!' : '⧉'}
              </span>
            </button>
            <button
              onClick={onLogout}
              style={{
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#71717a',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#18181b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; }}
            >
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
