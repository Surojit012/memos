'use client';

import { StatsCard } from './stats-card';

export function ApiUsageCard() {
  return (
    <StatsCard title="API Usage">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Requests today</span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>—</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Requests this month</span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>—</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Rate limit tier</span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>Free</span>
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <span style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', fontStyle: 'italic', color: '#a1a1aa' }}>
            Real-time usage tracking coming in v1.5
          </span>
        </div>
      </div>
    </StatsCard>
  );
}
