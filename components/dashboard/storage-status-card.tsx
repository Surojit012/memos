'use client';

import { StatsCard } from './stats-card';
import { timeAgo } from '@/lib/utils';

interface StatusResponse {
  status: 'healthy' | 'degraded' | 'error';
  hydrated: boolean;
  walQueueDepth: number;
  lastSync: string;
  memoryCount: number;
}

interface StorageStatusCardProps {
  status: StatusResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function StorageStatusCard({ status, isLoading, error }: StorageStatusCardProps) {
  if (!isLoading && !status && !error) {
    return <StatsCard title="Storage Status" error="Could not reach platform"><div/></StatsCard>;
  }

  const dotColor = status?.status === 'healthy' ? '#16a34a' : status?.status === 'degraded' ? '#d97706' : '#dc2626';
  const statusLabel = status?.status ? status.status.charAt(0).toUpperCase() + status.status.slice(1) : '—';

  return (
    <StatsCard title="Storage Status" isLoading={isLoading} error={error}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Status Indicator Row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: dotColor, marginRight: 6 }} />
          <span style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>
            {statusLabel}
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

        {/* WAL Queue Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Write queue</span>
          <span
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: status?.walQueueDepth ? '#d97706' : '#a1a1aa',
            }}
          >
            {status?.walQueueDepth ? `⚠ ${status.walQueueDepth} pending` : '0 pending'}
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

        {/* Last Sync Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Last sync</span>
          <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff' }}>
            {status?.lastSync ? timeAgo(status.lastSync) : '—'}
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

        {/* Hydration Row */}
        <div style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>
          {status?.hydrated ? (
            <span style={{ color: '#16a34a' }}>✓ Data loaded from 0G Storage</span>
          ) : (
            <span style={{ color: '#d97706' }}>⚠ Using local cache</span>
          )}
        </div>
      </div>
    </StatsCard>
  );
}
