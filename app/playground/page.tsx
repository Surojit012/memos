'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PlaygroundShell } from '@/components/playground/playground-shell';
import { AgentNameModal } from '@/components/playground/agent-name-modal';

export default function PlaygroundPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('memory');

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<'onboard' | 'rename'>('onboard');
  const promptedOnce = useRef(false);

  // First-login prompt: a freshly provisioned user with no name yet gets the
  // naming window once. They can skip and keep the opaque ID.
  useEffect(() => {
    if (promptedOnce.current) return;
    if (auth.isAuthenticated && auth.isNewUser && auth.agentId && !auth.agentName) {
      promptedOnce.current = true;
      setNameModalMode('onboard');
      setNameModalOpen(true);
    }
  }, [auth.isAuthenticated, auth.isNewUser, auth.agentId, auth.agentName]);

  if (auth.isLoading) {
    return (
      <div
        data-pg
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--pg-bg)',
        }}
      >
        <div
          aria-label="Loading"
          style={{
            width: 22,
            height: 22,
            border: '2px solid rgba(232,228,220,0.12)',
            borderTopColor: 'var(--pg-cyan)',
            borderRadius: '50%',
            animation: 'pgSpin 0.9s linear infinite',
          }}
        />
        <style>{`@keyframes pgSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div data-pg style={{ minHeight: '100vh', background: 'var(--pg-bg)' }}>
      <PlaygroundShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLive={auth.isAuthenticated}
        agentId={auth.agentId}
        agentName={auth.agentName}
        apiKey={auth.apiKey}
        onLogin={auth.login}
        onLogout={auth.logout}
        onRename={() => { setNameModalMode('rename'); setNameModalOpen(true); }}
      />
      <AgentNameModal
        open={nameModalOpen}
        mode={nameModalMode}
        currentName={auth.agentName}
        agentId={auth.agentId}
        onSave={auth.renameAgent}
        onClose={() => setNameModalOpen(false)}
      />
    </div>
  );
}
