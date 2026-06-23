'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

interface PrivyUser {
  email?: { address: string };
  wallet?: { address: string };
}

interface ProfileShellProps {
  privyUser: PrivyUser | null;
  agentId: string;
  children: React.ReactNode;
}

export function ProfileShell({ privyUser, agentId, children }: ProfileShellProps) {
  const { logout } = useAuth();

  const userIdentifier = privyUser?.email?.address
    ? privyUser.email.address
    : privyUser?.wallet?.address
      ? privyUser.wallet.address.substring(0, 10) + '...'
      : agentId;

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
        <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono, Fira Code, monospace', fontWeight: 600, color: '#18181b', letterSpacing: '-0.02em' }}>
          memos Profile
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', textDecoration: 'none' }}>
            Go to Dashboard
          </Link>
          <Link href="/playground" style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', textDecoration: 'none' }}>
            Go to Playground
          </Link>
          <button
            onClick={logout}
            style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: 24, flex: 1, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 24, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', margin: '0 0 4px' }}>
          Profile
        </h1>
        <div style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginBottom: 24 }}>
          {userIdentifier}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
