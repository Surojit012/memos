'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */

interface Reputation {
  agentId: string;
  score: number;
  totalInteractions: number;
  tier: 'new' | 'established' | 'trusted' | 'expert';
}

interface RegistrationResult {
  agentId: string;
  apiKey: string;
  name: string;
  createdAt: string;
}

interface IdentityTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

/* ─── Constants ─── */

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: 'rgba(232,228,220,0.04)', color: 'var(--pg-text2)' },
  established: { bg: 'rgba(94,125,126,0.14)', color: '#74989a' },
  trusted: { bg: 'rgba(122,158,142,0.10)', color: '#7A9E8E' },
  expert: { bg: 'rgba(166,123,115,0.14)', color: '#A67B73' },
};

/* ─── Copyable value row ─── */

function CopyRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayValue = masked && !revealed ? '••••••••••••' : value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--pg-border)' }}>
      <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontFamily: 'var(--pg-mono)', color: 'var(--pg-text)', wordBreak: 'break-all', textAlign: 'right', maxWidth: 220 }}>
          {displayValue}
        </span>
        {masked && (
          <button
            onClick={() => setRevealed((p) => !p)}
            style={{
              fontSize: 11,
              fontFamily: 'var(--pg-sans)',
              color: 'var(--pg-text2)',
              background: 'rgba(232,228,220,0.04)',
              border: '1px solid var(--pg-border)',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              transition: 'background 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,228,220,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232,228,220,0.04)'; }}
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        )}
        <button
          onClick={handleCopy}
          style={{
            fontSize: 11,
            fontFamily: 'var(--pg-sans)',
            color: 'var(--pg-text2)',
            background: 'rgba(232,228,220,0.04)',
            border: '1px solid var(--pg-border)',
            borderRadius: 4,
            padding: '2px 6px',
            cursor: 'pointer',
            transition: 'background 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,228,220,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232,228,220,0.04)'; }}
        >
          {copied ? 'Copied!' : '⧉'}
        </button>
      </div>
    </div>
  );
}

/* ─── Component ─── */

export function IdentityTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: IdentityTabProps) {
  const [reputation, setReputation] = useState<Reputation>({ agentId: '', score: 0, totalInteractions: 0, tier: 'new' });
  const [loadingRep, setLoadingRep] = useState(false);

  /* Registration form state */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* ─── Fetch reputation on mount (live & authenticated) ─── */
  useEffect(() => {
    if (!isLive || !agentId || !apiKey) return;

    let cancelled = false;
    const load = async () => {
      setLoadingRep(true);
      const endpoint = `/api/agent/${encodeURIComponent(agentId)}/reputation`;
      const headers = authHeaders();

      onRequestUpdate({ method: 'GET', endpoint, headers, body: null });
      onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

      try {
        const res = await fetch(endpoint, { headers });
        const data = await res.json();
        if (cancelled) return;

        if (res.ok) {
          setReputation(data as Reputation);
          onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
        } else {
          setReputation({ agentId: agentId, score: 0, totalInteractions: 0, tier: 'new' });
          onResponseUpdate({ response: data, error: data.error ?? 'Failed to load reputation', isLoading: false, statusCode: res.status });
        }
      } catch {
        if (!cancelled) {
          setReputation({ agentId: agentId, score: 0, totalInteractions: 0, tier: 'new' });
          onResponseUpdate({ response: null, error: 'Failed to fetch reputation', isLoading: false, statusCode: null });
        }
      } finally {
        if (!cancelled) setLoadingRep(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isLive, agentId, apiKey, authHeaders, onRequestUpdate, onResponseUpdate]);

  /* ─── Register agent ─── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setRegistering(true);
    setError(null);
    setRegResult(null);

    const endpoint = '/api/identity';
    const method = 'POST';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const bodyPayload = { name: name.trim(), description: description.trim() };

    onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
    onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

    try {
      if (isLive) {
        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? 'Registration failed');
          onResponseUpdate({ response: data, error: data.error ?? 'Registration failed', isLoading: false, statusCode: res.status });
          return;
        }

        setRegResult(data as RegistrationResult);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const sandbox: RegistrationResult = {
          agentId: 'agent_' + Math.random().toString(36).slice(2, 10),
          apiKey: 'mk0s_' + Math.random().toString(36).slice(2, 18),
          name: name.trim(),
          createdAt: new Date().toISOString(),
        };

        setRegResult(sandbox);
        onResponseUpdate({ response: sandbox, error: null, isLoading: false, statusCode: 201 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setRegistering(false);
    }
  };

  /* ─── Render: Authenticated identity card ─── */
  if (isLive && agentId && apiKey) {
    const tierColor = TIER_COLORS[reputation.tier] ?? TIER_COLORS.new;

    return (
      <div>
        <div style={{ fontSize: 16, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 12 }}>
          Your Agent Identity
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '0 0 8px' }} />

        <CopyRow label="Agent ID" value={agentId} />
        <CopyRow label="API Key" value={apiKey} masked />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--pg-border)' }}>
          <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)' }}>Reputation Score</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)' }}>
            {loadingRep ? '...' : `${reputation.score}/100`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--pg-border)' }}>
          <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)' }}>Tier</span>
          <span
            style={{
              fontSize: 12,
              fontFamily: 'var(--pg-sans)',
              fontWeight: 500,
              color: tierColor.color,
              background: tierColor.bg,
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {loadingRep ? '...' : reputation.tier}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)' }}>Interactions</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)' }}>
            {loadingRep ? '...' : reputation.totalInteractions}
          </span>
        </div>
      </div>
    );
  }

  /* ─── Render: Registration result ─── */
  if (regResult) {
    return (
      <div style={{ border: '1px solid rgba(122,158,142,0.36)', background: 'rgba(122,158,142,0.10)', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 16, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: '#7A9E8E', marginBottom: 12 }}>
          Agent Created
        </div>
        <CopyRow label="Agent ID" value={regResult.agentId} />
        <CopyRow label="API Key" value={regResult.apiKey} />
        <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: '#A67B73', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          Save your API key — it will not be shown again after you leave this tab.
        </p>
      </div>
    );
  }

  /* ─── Render: Registration form (unauthenticated / sandbox) ─── */
  return (
    <div>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="identity-name"
            style={{ display: 'block', fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 4 }}
          >
            Agent Name
          </label>
          <input
            id="identity-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My AI Assistant"
            style={{
              width: '100%',
              fontFamily: 'var(--pg-sans)',
              fontSize: 13,
              color: 'var(--pg-text)',
              background: 'transparent',
              border: '1px solid var(--pg-border)',
              borderRadius: 6,
              padding: '8px 10px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pg-cyan-hi)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="identity-desc"
            style={{ display: 'block', fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 4 }}
          >
            Description
          </label>
          <textarea
            id="identity-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
            style={{
              width: '100%',
              fontFamily: 'var(--pg-sans)',
              fontSize: 13,
              color: 'var(--pg-text)',
              background: 'transparent',
              border: '1px solid var(--pg-border)',
              borderRadius: 6,
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pg-cyan-hi)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
          />
        </div>

        <button
          type="submit"
          disabled={registering || !name.trim()}
          style={{
            width: '100%',
            height: 40,
            fontSize: 14,
            fontFamily: 'var(--pg-sans)',
            fontWeight: 500,
            color: 'var(--pg-bg)',
            background: registering || !name.trim() ? 'var(--pg-text2)' : 'var(--pg-text)',
            border: 'none',
            borderRadius: 6,
            cursor: registering || !name.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { if (!registering && name.trim()) e.currentTarget.style.background = 'var(--pg-cyan-hi)'; }}
          onMouseLeave={(e) => { if (!registering && name.trim()) e.currentTarget.style.background = 'var(--pg-cyan)'; }}
        >
          {registering ? 'Registering...' : 'Register Agent'}
        </button>

        {error && (
          <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: '#C67867', marginTop: 8 }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
