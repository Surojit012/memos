'use client';

import { useRouter } from 'next/navigation';
import { StatsCard } from './stats-card';
import { timeAgo } from '@/lib/utils';

interface Memory {
  id: string;
  content: string;
  type: 'episodic' | 'semantic' | 'procedural';
  importance: number;
  createdAt: string;
}

interface MemoryHealthCardProps {
  memories: Memory[] | null;
  isLoading: boolean;
  error: string | null;
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  episodic: { bg: '#eff6ff', color: '#2563eb' },
  semantic: { bg: '#faf5ff', color: '#9333ea' },
  procedural: { bg: '#f0fdf4', color: '#16a34a' },
};

export function MemoryHealthCard({ memories, isLoading, error }: MemoryHealthCardProps) {
  const router = useRouter();

  if (!isLoading && !memories && error) {
    return (
      <StatsCard title="Memory Health" isLoading={false} error={error}>
        <div />
      </StatsCard>
    );
  }

  const total = memories?.length ?? 0;
  const episodic = memories?.filter((m) => m.type === 'episodic').length ?? 0;
  const semantic = memories?.filter((m) => m.type === 'semantic').length ?? 0;
  const procedural = memories?.filter((m) => m.type === 'procedural').length ?? 0;

  const totalImportance = memories?.reduce((sum, m) => sum + m.importance, 0) ?? 0;
  const avgImportance = total > 0 ? (totalImportance / total).toFixed(1) : '—';

  const mostRecent = memories && memories.length > 0
    ? [...memories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  return (
    <StatsCard
      title="Memory Health"
      isLoading={isLoading}
      error={error}
      action={{ label: 'View in Playground', onClick: () => router.push('/playground') }}
    >
      {total === 0 && !isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: '0 0 8px' }}>
            No memories stored yet.
          </p>
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
              textDecoration: 'underline',
            }}
          >
            Add your first memory →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Total count */}
          <div>
            <div style={{ fontSize: 32, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#ffffff', lineHeight: 1 }}>
              {total}
            </div>
            <div style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)', marginTop: 4 }}>
              Total memories stored
            </div>
          </div>

          {/* Type breakdown */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: TYPE_COLORS.episodic.color, background: TYPE_COLORS.episodic.bg, borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>
              Episodic {episodic}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: TYPE_COLORS.semantic.color, background: TYPE_COLORS.semantic.bg, borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>
              Semantic {semantic}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: TYPE_COLORS.procedural.color, background: TYPE_COLORS.procedural.bg, borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>
              Procedural {procedural}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

          {/* Average importance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Average Importance</span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>{avgImportance}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

          {/* Most recent */}
          {mostRecent && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>Most Recent</span>
                <span style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa' }}>{timeAgo(mostRecent.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mostRecent.content}
              </p>
            </div>
          )}
        </div>
      )}
    </StatsCard>
  );
}
