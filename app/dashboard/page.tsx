'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { MemoryHealthCard } from '@/components/dashboard/memory-health-card';
import { DreamActivityCard } from '@/components/dashboard/dream-activity-card';
import { StorageStatusCard } from '@/components/dashboard/storage-status-card';
import { ApiUsageCard } from '@/components/dashboard/api-usage-card';
import { SkillsOverviewCard } from '@/components/dashboard/skills-overview-card';

export default function DashboardPage() {
  const { isLive, agentId, apiKey, ready } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [memories, setMemories] = useState<any[] | null>(null);
  const [status, setStatus] = useState<any | null>(null);
  const [skills, setSkills] = useState<any[] | null>(null);
  const [reputation, setReputation] = useState<any | null>(null);

  const [memoriesError, setMemoriesError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [reputationError, setReputationError] = useState<string | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (ready && !isLive) {
      router.replace('/?auth=required');
    }
  }, [ready, isLive, router]);

  // Fetch data
  useEffect(() => {
    if (!ready || !isLive || !agentId || !apiKey) return;

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      const fetchWithAuth = (url: string) =>
        fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });

      const fetchNoAuth = (url: string) =>
        fetch(url).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });

      try {
        const [memRes, statRes, skillRes, repRes] = await Promise.allSettled([
          fetchWithAuth(`/api/memory?agentId=${encodeURIComponent(agentId)}`),
          fetchNoAuth('/api/status'),
          fetchNoAuth('/api/skills'),
          fetchWithAuth(`/api/agent/${encodeURIComponent(agentId)}/reputation`),
        ]);

        if (cancelled) return;

        if (memRes.status === 'fulfilled') {
          setMemories(memRes.value.memories || []);
        } else {
          setMemoriesError('Failed to load memories');
        }

        if (statRes.status === 'fulfilled') {
          setStatus(statRes.value);
        } else {
          setStatusError('Could not reach platform');
        }

        if (skillRes.status === 'fulfilled') {
          setSkills(Array.isArray(skillRes.value) ? skillRes.value : skillRes.value.skills || []);
        } else {
          setSkillsError('Failed to load skills');
        }

        if (repRes.status === 'fulfilled') {
          setReputation(repRes.value);
        } else {
          setReputationError('Failed to load reputation');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [ready, isLive, agentId, apiKey]);

  if (!ready || !isLive || !agentId) {
    return null; // Don't render until redirect happens
  }

  if (isLoading) {
    return (
      <DashboardShell agentId={agentId}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`skeleton-pulse ${i === 4 ? 'skills-card-container' : ''}`}
            style={{
              background: '#f4f4f5',
              borderRadius: 8,
              height: i === 4 ? 300 : 220, // Different height for full width
            }}
          />
        ))}
        <style>{`
          @keyframes skeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .skeleton-pulse {
            animation: skeletonPulse 1.5s ease-in-out infinite;
          }
        `}</style>
      </DashboardShell>
    );
  }

  const semanticCount = memories?.filter((m) => m.type === 'semantic').length ?? null;

  return (
    <DashboardShell agentId={agentId}>
      <MemoryHealthCard memories={memories} isLoading={isLoading} error={memoriesError} />
      <DreamActivityCard agentId={agentId} apiKey={apiKey!} semanticCount={semanticCount} isLoading={isLoading} error={null} />
      <StorageStatusCard status={status} isLoading={isLoading} error={statusError} />
      <ApiUsageCard />
      <div className="skills-card-container">
        <SkillsOverviewCard skills={skills} isLoading={isLoading} error={skillsError} />
      </div>
    </DashboardShell>
  );
}
