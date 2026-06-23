'use client';

import { useRouter } from 'next/navigation';
import { StatsCard } from './stats-card';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  publisher: string;
}

interface SkillsOverviewCardProps {
  skills: Skill[] | null;
  isLoading: boolean;
  error: string | null;
}

export function SkillsOverviewCard({ skills, isLoading, error }: SkillsOverviewCardProps) {
  const router = useRouter();

  if (!isLoading && !skills && error) {
    return (
      <StatsCard title="Skills Marketplace" isLoading={false} error={error} action={{ label: 'Explore Skills →', onClick: () => router.push('/playground') }}>
        <div />
      </StatsCard>
    );
  }

  const total = skills?.length ?? 0;
  const freeCount = skills?.filter((s) => s.price === 0).length ?? 0;
  const paidCount = skills?.filter((s) => s.price > 0).length ?? 0;

  return (
    <StatsCard
      title="Skills Marketplace"
      isLoading={isLoading}
      error={error}
      action={{ label: 'Explore Skills →', onClick: () => router.push('/playground') }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Total count */}
        <div>
          <div style={{ fontSize: 32, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', marginTop: 4 }}>
            skills available
          </div>
        </div>

        {/* Free/Paid breakdown */}
        <div style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#18181b' }}>
          Free: {freeCount} &nbsp;&nbsp; Paid: {paidCount}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

        {/* Top 3 skills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {skills?.slice(0, 3).map((skill) => (
            <div key={skill.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#18181b' }}>
                  {skill.name}
                </span>
                <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', background: '#f4f4f5', borderRadius: 4, padding: '2px 6px' }}>
                  {skill.category}
                </span>
              </div>
              <span style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: skill.price === 0 ? '#16a34a' : '#71717a' }}>
                {skill.price === 0 ? 'Free' : `${skill.price} ETH`}
              </span>
            </div>
          ))}
          {total > 3 && (
            <div style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginTop: 4 }}>
              + {total - 3} more
            </div>
          )}
        </div>
      </div>
    </StatsCard>
  );
}
