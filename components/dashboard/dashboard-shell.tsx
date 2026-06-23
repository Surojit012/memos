'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

interface DashboardShellProps {
  agentId: string;
  children: React.ReactNode;
}

export function DashboardShell({ agentId, children }: DashboardShellProps) {
  const { logout } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fafafa' }}>
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          padding: '0 16px',
          borderBottom: '1px solid #e4e4e7',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono, Fira Code, monospace', fontWeight: 600, color: '#18181b', letterSpacing: '-0.02em' }}>
            memos Dashboard
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Links */}
          <Link href="/playground" style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', textDecoration: 'none' }}>
            Go to Playground
          </Link>
          <button style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Profile
          </button>
          <button onClick={logout} style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Log out
          </button>

          {/* Vertical divider */}
          <div style={{ width: 1, height: 16, background: '#e4e4e7' }} />

          {/* Agent Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f4f4f5',
              border: '1px solid #e4e4e7',
              borderRadius: 100,
              padding: '2px 8px 2px 4px',
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, Fira Code, monospace', color: '#18181b' }}>
              {agentId.substring(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: 24, flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 24, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', margin: '0 0 4px' }}>
          Dashboard
        </h1>
        <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, Fira Code, monospace', color: '#a1a1aa', marginBottom: 24 }}>
          {agentId}
        </div>

        {/* Dashboard Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          main > div {
            grid-template-columns: 1fr !important;
          }
          .skills-card-container {
            grid-column: 1 / -1 !important;
          }
        }
        @media (min-width: 769px) {
          .skills-card-container {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}
