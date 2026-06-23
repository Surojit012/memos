'use client';

import { useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';

interface ReputationResponse {
  agentId: string;
  score: number;
  totalInteractions: number;
  tier: 'new' | 'established' | 'trusted' | 'expert';
}

interface IdentitySectionProps {
  agentId: string;
  reputation: ReputationResponse | null;
  reputationLoading: boolean;
}

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: '#f4f4f5', color: 'var(--text2)' },
  established: { bg: '#dbeafe', color: '#1d4ed8' },
  trusted: { bg: '#dcfce7', color: '#15803d' },
  expert: { bg: '#f3e8ff', color: '#7e22ce' },
};

export function IdentitySection({ agentId, reputation, reputationLoading }: IdentitySectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(agentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tierColor = reputation ? TIER_COLORS[reputation.tier] ?? TIER_COLORS.new : TIER_COLORS.new;

  const rows: { label: string; content: React.ReactNode }[] = [
    {
      label: 'Agent ID',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, Fira Code, monospace', color: '#ffffff' }}>
            {agentId}
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy agent ID"
            style={{
              fontSize: 11,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: 'var(--text2)',
              background: '#f4f4f5',
              border: '1px solid #e4e4e7',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              transition: 'background 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
          >
            {copied ? 'Copied!' : '⧉'}
          </button>
        </div>
      ),
    },
    {
      label: 'Reputation Score',
      content: reputationLoading ? (
        <div style={{ background: '#f4f4f5', borderRadius: 4, height: 14, width: 60 }} className="skeleton-pulse" />
      ) : (
        <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>
          {reputation ? `${reputation.score}/100` : '—'}
        </span>
      ),
    },
    {
      label: 'Tier',
      content: reputationLoading ? (
        <div style={{ background: '#f4f4f5', borderRadius: 4, height: 14, width: 60 }} className="skeleton-pulse" />
      ) : reputation ? (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            color: tierColor.color,
            background: tierColor.bg,
            borderRadius: 4,
            padding: '2px 8px',
          }}
        >
          {reputation.tier}
        </span>
      ) : (
        <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa' }}>—</span>
      ),
    },
    {
      label: 'Total Interactions',
      content: reputationLoading ? (
        <div style={{ background: '#f4f4f5', borderRadius: 4, height: 14, width: 40 }} className="skeleton-pulse" />
      ) : (
        <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>
          {reputation ? reputation.totalInteractions : '—'}
        </span>
      ),
    },
    {
      label: 'Member Since',
      // TODO: add createdAt to reputation endpoint
      content: (
        <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa' }}>—</span>
      ),
    },
  ];

  return (
    <StatsCard title="Agent Identity">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < rows.length - 1 ? '1px solid #e4e4e7' : 'none',
            }}
          >
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>
              {row.label}
            </span>
            {row.content}
          </div>
        ))}

        {!reputationLoading && !reputation && (
          <p style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginTop: 12, fontStyle: 'italic', marginBottom: 0 }}>
            Reputation data unavailable
          </p>
        )}
      </div>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .skeleton-pulse {
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </StatsCard>
  );
}
