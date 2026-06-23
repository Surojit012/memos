'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { StatsCard } from '@/components/dashboard/stats-card';

interface ApiKeySectionProps {
  apiKey: string;
  onApiKeyUpdate: (newKey: string) => void;
}

export function ApiKeySection({ apiKey, onApiKeyUpdate }: ApiKeySectionProps) {
  const { getAccessToken } = usePrivy();

  const [revealed, setRevealed] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [justRegenerated, setJustRegenerated] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-hide after 30s when just regenerated
  useEffect(() => {
    if (!justRegenerated) return;
    const timer = setTimeout(() => {
      setRevealed(false);
      setJustRegenerated(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [justRegenerated]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(localApiKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [localApiKey]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setRegenError('Regeneration failed. Try again.');
        return;
      }

      const res = await fetch('/api/auth/regenerate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyToken: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegenError('Regeneration failed. Try again.');
        return;
      }

      setLocalApiKey(data.apiKey);
      onApiKeyUpdate(data.apiKey);
      setJustRegenerated(true);
      setRevealed(true);
      setConfirmingRegenerate(false);
    } catch {
      setRegenError('Regeneration failed. Try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const maskedKey = localApiKey.length > 12
    ? localApiKey.substring(0, 8) + '••••••••••••' + localApiKey.substring(localApiKey.length - 4)
    : '••••••••••••';

  return (
    <StatsCard title="API Key">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Key display row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, Fira Code, monospace', color: '#18181b', wordBreak: 'break-all' }}>
            {revealed ? localApiKey : maskedKey}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setRevealed((p) => !p)}
              aria-label={revealed ? 'Hide API key' : 'Reveal API key'}
              style={{
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#71717a',
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e4e4e7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
            >
              {revealed ? 'Hide' : 'Reveal'}
            </button>
            <button
              onClick={handleCopy}
              aria-label="Copy API key"
              style={{
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#71717a',
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e4e4e7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
            >
              {copied ? 'Copied!' : '⧉'}
            </button>
          </div>
        </div>

        {/* Success notice */}
        {justRegenerated && (
          <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500 }}>
            New API key generated. Save it now.
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: 0 }} />

        {/* Regenerate section */}
        {!confirmingRegenerate ? (
          <button
            onClick={() => { setConfirmingRegenerate(true); setRegenError(null); }}
            aria-label="Regenerate API key"
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#dc2626',
              background: '#ffffff',
              border: '1px solid #dc2626',
              borderRadius: 6,
              padding: '8px 14px',
              cursor: 'pointer',
              transition: 'background 150ms ease',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
          >
            Regenerate Key
          </button>
        ) : (
          <div style={{ background: '#fef2f2', border: '1px solid #dc2626', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#991b1b', lineHeight: 1.5, margin: '0 0 12px' }}>
              Regenerating your key will immediately invalidate the current one. Any integrations using the old key will break.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setConfirmingRegenerate(false); setRegenError(null); }}
                disabled={regenerating}
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontWeight: 500,
                  color: '#18181b',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: 6,
                  padding: '6px 14px',
                  cursor: regenerating ? 'not-allowed' : 'pointer',
                  opacity: regenerating ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontWeight: 500,
                  color: '#ffffff',
                  background: regenerating ? '#71717a' : '#dc2626',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  cursor: regenerating ? 'not-allowed' : 'pointer',
                }}
              >
                {regenerating ? 'Regenerating...' : 'Yes, Regenerate'}
              </button>
            </div>
            {regenError && (
              <p style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', marginTop: 8, marginBottom: 0 }}>
                {regenError}
              </p>
            )}
          </div>
        )}
      </div>
    </StatsCard>
  );
}
