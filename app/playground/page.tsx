'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PlaygroundShell } from '@/components/playground/playground-shell';

export default function PlaygroundPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('memory');

  /* Loading state */
  if (auth.isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#fafafa',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: '2px solid #e4e4e7',
            borderTop: '2px solid #18181b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Mode banner */}
      {!auth.isAuthenticated ? (
        <div
          style={{
            padding: '10px 16px',
            background: '#fefce8',
            borderBottom: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#92400e',
          }}
        >
          <span>
            You&apos;re in Sandbox mode — responses are simulated. Log in to use your real agent.
          </span>
          <button
            onClick={auth.login}
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#92400e',
              background: 'transparent',
              border: '1px solid #fde68a',
              borderRadius: 6,
              padding: '4px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginLeft: 12,
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef9c3'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Login
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '10px 16px',
            background: '#f0fdf4',
            borderBottom: '1px solid #bbf7d0',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#166534',
          }}
        >
          Live mode — connected to agent{' '}
          <span style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace', fontWeight: 500 }}>
            {auth.agentId ? auth.agentId.slice(0, 8) + '...' : ''}
          </span>
        </div>
      )}

      <PlaygroundShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLive={auth.isAuthenticated}
        agentId={auth.agentId}
        apiKey={auth.apiKey}
        onLogin={auth.login}
        onLogout={auth.logout}
      />
    </div>
  );
}
