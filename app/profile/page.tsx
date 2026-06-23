'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ProfileShell } from '@/components/profile/profile-shell';
import { IdentitySection } from '@/components/profile/identity-section';
import { ApiKeySection } from '@/components/profile/api-key-section';
import { AgentsSection } from '@/components/profile/agents-section';
import { SkillsSection } from '@/components/profile/skills-section';

interface ReputationResponse {
  agentId: string;
  score: number;
  totalInteractions: number;
  tier: 'new' | 'established' | 'trusted' | 'expert';
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  publisher: string;
}

interface StatusResponse {
  status: 'healthy' | 'degraded' | 'error';
  hydrated: boolean;
  walQueueDepth: number;
  lastSync: string;
  memoryCount: number;
}

export default function ProfilePage() {
  const { isLive, ready, isLoading: authLoading, privyUser, agentId, apiKey, updateApiKey } = useAuth();
  const router = useRouter();

  const [dataLoading, setDataLoading] = useState(true);
  const [reputation, setReputation] = useState<ReputationResponse | null>(null);
  const [reputationLoading, setReputationLoading] = useState(true);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (ready && !isLive) {
      router.replace('/?auth=required');
    }
  }, [ready, isLive, router]);

  // Fetch all data
  useEffect(() => {
    if (!ready || !isLive || !agentId || !apiKey) return;

    let cancelled = false;

    const fetchAll = async () => {
      setDataLoading(true);
      setReputationLoading(true);
      setSkillsLoading(true);

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
        const [repRes, memRes, skillRes, statusRes] = await Promise.allSettled([
          fetchWithAuth(`/api/agent/${encodeURIComponent(agentId)}/reputation`),
          fetchWithAuth(`/api/memory?agentId=${encodeURIComponent(agentId)}`),
          fetchNoAuth('/api/skills'),
          fetchNoAuth('/api/status'),
        ]);

        if (cancelled) return;

        if (repRes.status === 'fulfilled') {
          setReputation(repRes.value as ReputationResponse);
        }
        setReputationLoading(false);

        if (memRes.status === 'fulfilled') {
          const memories = memRes.value.memories || [];
          setMemoryCount(memories.length);
        }

        if (skillRes.status === 'fulfilled') {
          const list = Array.isArray(skillRes.value) ? skillRes.value : skillRes.value.skills ?? [];
          setSkills(list as Skill[]);
        } else {
          setSkillsError('Failed to load skills');
        }
        setSkillsLoading(false);

        if (statusRes.status === 'fulfilled') {
          setStatusData(statusRes.value as StatusResponse);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [ready, isLive, agentId, apiKey]);

  // Don't render until redirect happens
  if (!ready || authLoading || !isLive || !agentId || !apiKey) {
    return null;
  }

  // Skeleton loading state
  if (dataLoading) {
    return (
      <ProfileShell privyUser={privyUser} agentId={agentId}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              background: '#f4f4f5',
              borderRadius: 8,
              height: i === 0 ? 280 : i === 1 ? 180 : i === 2 ? 160 : 200,
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
      </ProfileShell>
    );
  }

  return (
    <ProfileShell privyUser={privyUser} agentId={agentId}>
      <IdentitySection agentId={agentId} reputation={reputation} reputationLoading={reputationLoading} />
      <ApiKeySection apiKey={apiKey} onApiKeyUpdate={updateApiKey} />
      <AgentsSection agentId={agentId} apiKey={apiKey} memoryCount={memoryCount} statusData={statusData} />
      <SkillsSection skills={skills} agentId={agentId} skillsLoading={skillsLoading} skillsError={skillsError} />
    </ProfileShell>
  );
}
