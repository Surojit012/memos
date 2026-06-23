'use client';

import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/stats-card';

interface StatusResponse {
  status: 'healthy' | 'degraded' | 'error';
  hydrated: boolean;
  walQueueDepth: number;
  lastSync: string;
  memoryCount: number;
}

interface AgentsSectionProps {
  agentId: string;
  apiKey: string;
  memoryCount: number | null;
  statusData: StatusResponse | null;
}

export function AgentsSection({ agentId, memoryCount, statusData }: AgentsSectionProps) {
  const router = useRouter();
  // TODO: wallet connect — Phase 7

  return (
    <StatsCard title="My Agents">
      <div>
        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {['Agent ID', 'Memories', 'Storage', 'Action'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#a1a1aa',
                      fontWeight: 500,
                      padding: '8px 8px 8px 0',
                      borderBottom: '1px solid #e4e4e7',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 8px 10px 0', borderBottom: '1px solid #f4f4f5' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: 12, color: '#ffffff' }}>
                    {agentId.length > 12 ? agentId.slice(0, 12) + '...' : agentId}
                  </span>
                </td>
                <td style={{ padding: '10px 8px 10px 0', borderBottom: '1px solid #f4f4f5', color: '#ffffff', fontWeight: 500 }}>
                  {memoryCount ?? '—'}
                </td>
                <td style={{ padding: '10px 8px 10px 0', borderBottom: '1px solid #f4f4f5' }}>
                  {statusData ? (
                    statusData.hydrated ? (
                      <span style={{ color: '#16a34a', fontWeight: 500 }}>✓ Synced</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 500 }}>⚠ Local</span>
                    )
                  ) : (
                    <span style={{ color: '#a1a1aa' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 8px 10px 0', borderBottom: '1px solid #f4f4f5' }}>
                  <button
                    onClick={() => router.push('/playground')}
                    style={{
                      fontSize: 13,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      color: '#ffffff',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    Open in Playground →
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginTop: 16, marginBottom: 0 }}>
          Wallet binding and INFT minting available in v1.5
        </p>
      </div>
    </StatsCard>
  );
}
