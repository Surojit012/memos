'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AgentContextBarProps {
  isLive: boolean;
  agentId: string | null;
  agentName: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onRename: () => void;
}

export function AgentContextBar({ isLive, agentId, agentName, onLogin, onLogout, onRename }: AgentContextBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!agentId) return;
    navigator.clipboard.writeText(agentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <header
      style={{
        height: 52,
        borderBottom: '1px solid var(--pg-border)',
        background: 'rgba(15, 18, 16, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--pg-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            color: 'var(--pg-text)',
            letterSpacing: '-0.01em',
          }}
        >
          memos
        </span>
        <span
          style={{
            fontFamily: 'var(--pg-mono)',
            fontSize: 11,
            color: 'var(--pg-text3)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          playground
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isLive ? (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontFamily: 'var(--pg-sans)',
                color: 'var(--pg-text2)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--pg-text3)',
                  border: '1px solid var(--pg-border)',
                }}
              />
              Sandbox
            </span>
            <button type="button" onClick={onLogin} className="pg-btn pg-btn-primary" style={{ padding: '6px 14px' }}>
              Log in
            </button>
          </>
        ) : (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontFamily: 'var(--pg-sans)',
                color: 'var(--pg-text2)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--pg-green)',
                  boxShadow: '0 0 0 3px rgba(122,158,142,0.18)',
                }}
              />
              Live
            </span>
            {agentName ? (
              <button
                type="button"
                onClick={onRename}
                title="Rename agent"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: 'var(--pg-sans)',
                  fontSize: 13,
                  color: 'var(--pg-text)',
                  background: 'transparent',
                  border: '1px solid var(--pg-border)',
                  borderRadius: 4,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  maxWidth: 180,
                  transition: 'border-color 140ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pg-text3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agentName}</span>
                <span aria-hidden style={{ fontSize: 11, color: 'var(--pg-text3)' }}>✎</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRename}
                title="Give your agent a name"
                className="pg-btn pg-btn-ghost"
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                Name agent
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              title="Copy agent ID"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--pg-mono)',
                fontSize: 12,
                color: 'var(--pg-text)',
                background: 'transparent',
                border: '1px solid var(--pg-border)',
                borderRadius: 4,
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'border-color 140ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pg-text3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
            >
              {agentId ? agentId.slice(0, 10) + '…' : ''}
              <span style={{ fontSize: 11, color: copied ? 'var(--pg-green)' : 'var(--pg-text3)' }}>
                {copied ? '✓' : '⧉'}
              </span>
            </button>
            <Link
              href="/dashboard/api-keys"
              className="pg-btn pg-btn-ghost"
              style={{ padding: '6px 10px', textDecoration: 'none' }}
              title="Manage API keys"
            >
              Keys
            </Link>
            <button type="button" onClick={onLogout} className="pg-btn pg-btn-ghost" style={{ padding: '6px 10px' }}>
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
