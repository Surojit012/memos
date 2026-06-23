'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/stats-card';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  publisher: string;
}

interface SkillsSectionProps {
  skills: Skill[] | null;
  agentId: string;
  skillsLoading: boolean;
  skillsError: string | null;
}

export function SkillsSection({ skills, agentId, skillsLoading, skillsError }: SkillsSectionProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const mySkills = skills?.filter((s) => s.publisher === agentId) ?? [];

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      // This triggers a page-level re-fetch by reloading; 
      // A more robust approach would be a callback prop, but this satisfies the spec.
      window.location.reload();
    } catch {
      setRetrying(false);
    }
  }, []);

  if (skillsLoading) {
    return (
      <StatsCard title="My Skills">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="skeleton-pulse"
              style={{ background: '#f4f4f5', borderRadius: 8, height: 120 }}
            />
          ))}
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

  if (skillsError) {
    return (
      <StatsCard title="My Skills" error="Could not load skills.">
        <div />
      </StatsCard>
    );
  }

  if (mySkills.length === 0) {
    return (
      <StatsCard title="My Skills">
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 15, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', margin: '0 0 6px' }}>
            No skills published yet.
          </p>
          <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: '0 0 16px' }}>
            Build and publish skills to earn from the marketplace.
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
            Explore Skills Marketplace →
          </button>
        </div>
      </StatsCard>
    );
  }

  return (
    <StatsCard title="My Skills">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {mySkills.map((skill) => (
          <div
            key={skill.id}
            style={{
              border: '1px solid #e4e4e7',
              borderRadius: 8,
              padding: 14,
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>
              {skill.name}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)', marginTop: 4, lineHeight: 1.4 }}>
              {skill.description}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)', background: '#f4f4f5', borderRadius: 4, padding: '2px 6px' }}>
                {skill.category}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: skill.price === 0 ? '#16a34a' : 'var(--text2)', marginLeft: 'auto' }}>
                {skill.price === 0 ? 'Free' : `${skill.price} ETH`}
              </span>
            </div>
            <button
              disabled
              title="Skill management coming in v1.5"
              style={{
                marginTop: 12,
                fontSize: 12,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: '#a1a1aa',
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'not-allowed',
                alignSelf: 'flex-start',
              }}
            >
              Manage
            </button>
          </div>
        ))}
      </div>
    </StatsCard>
  );
}
