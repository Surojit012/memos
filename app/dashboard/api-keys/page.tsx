'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { AgentNameModal } from '@/components/playground/agent-name-modal';
import { UsageChart, type UsagePoint } from '@/components/playground/usage-chart';

interface KeyView {
  id: string;
  agent_id: string;
  name: string;
  prefix: string;
  request_count: number;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const sec = Math.round(ms / 1000);
  if (sec < 45) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** fetch with a hard timeout so the UI never gets stuck on a hanging request. */
async function fetchWithTimeout(input: string, init: RequestInit = {}, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function fullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function ApiKeysDashboardPage() {
  const auth = useAuth();
  const [keys, setKeys] = useState<KeyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<{ key: KeyView; plaintext: string } | null>(null);
  const [revealCopied, setRevealCopied] = useState(false);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);

  type Range = 'daily' | 'weekly' | 'monthly';
  interface Usage {
    range: Range;
    series: UsagePoint[];
    summary: { today: number; last7: number; last30: number; total: number };
  }
  const [range, setRange] = useState<Range>('daily');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  // Depend on stable primitives only. `auth` is a fresh object literal every
  // render (useAuth returns an un-memoized object), so depending on `auth`
  // here would make `load` change identity each render and turn the effect
  // below into an infinite refetch loop.
  const { isAuthenticated, getAccessToken } = auth;
  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { setError('Could not read your session.'); return; }
      const res = await fetchWithTimeout(`/api/auth/keys?privyToken=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Failed to load keys (${res.status}).`); return; }
      setKeys(data.keys || []);
    } catch (err) {
      const e = err as Error;
      setError(e.name === 'AbortError' ? 'Request timed out — is the dev server running?' : e.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => { load(); }, [load]);

  const loadUsage = useCallback(async (r: Range) => {
    if (!isAuthenticated) return;
    setUsageLoading(true);
    setUsageError(null);
    try {
      const token = await getAccessToken();
      if (!token) { setUsageError('Could not read your session.'); return; }
      const res = await fetchWithTimeout(`/api/auth/keys/usage?range=${r}&privyToken=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setUsageError(data.error || `Failed to load usage (${res.status}).`); return; }
      setUsage(data);
    } catch (err) {
      const e = err as Error;
      setUsageError(e.name === 'AbortError' ? 'Request timed out — is the dev server running?' : e.message);
    } finally {
      setUsageLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => { loadUsage(range); }, [loadUsage, range]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) { setCreateError('Give the key a name.'); return; }
    setCreating(true);
    try {
      const token = await auth.getAccessToken();
      const res = await fetchWithTimeout('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyToken: token, name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCreateError(data.error || `Failed to create key (${res.status}).`); return; }
      setJustCreated({ key: data.key, plaintext: data.plaintext });
      setKeys((prev) => [data.key, ...prev]);
      setNewName('');
    } catch (err) {
      const e = err as Error;
      setCreateError(e.name === 'AbortError' ? 'Request timed out — is the dev server running?' : e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? Any service using it will start getting 401s immediately.')) return;
    setRevokingId(id);
    try {
      const token = await auth.getAccessToken();
      const res = await fetch(`/api/auth/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyToken: token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Could not revoke key.');
        return;
      }
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
    } finally {
      setRevokingId(null);
    }
  }

  function copyPlaintext() {
    if (!justCreated) return;
    navigator.clipboard.writeText(justCreated.plaintext).catch(() => {});
    setRevealCopied(true);
    setTimeout(() => setRevealCopied(false), 1600);
  }

  /* Auth gate */
  if (auth.isLoading) {
    return <div data-pg style={{ minHeight: '100vh', background: 'var(--pg-bg)' }} />;
  }
  if (!auth.isAuthenticated) {
    return (
      <div data-pg style={{ minHeight: '100vh', background: 'var(--pg-bg)', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 28, color: 'var(--pg-text)', margin: '0 0 12px' }}>
            Log in to see your keys.
          </p>
          <button onClick={auth.login} className="pg-btn pg-btn-primary">Log in</button>
        </div>
      </div>
    );
  }

  const active = keys.filter((k) => !k.revoked_at);
  const revoked = keys.filter((k) => k.revoked_at);

  return (
    <div data-pg style={{ minHeight: '100vh', background: 'var(--pg-bg)' }}>
      {/* Top bar */}
      <header
        style={{
          height: 52,
          borderBottom: '1px solid var(--pg-border)',
          background: 'rgba(15,18,16,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <Link href="/" style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--pg-text)', textDecoration: 'none' }}>
            memos
          </Link>
          <span style={{ fontFamily: 'var(--pg-mono)', fontSize: 11, color: 'var(--pg-text3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            api keys
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/playground" className="pg-btn pg-btn-ghost" style={{ textDecoration: 'none' }}>
            Playground
          </Link>
          <button onClick={auth.logout} className="pg-btn pg-btn-ghost">Log out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Heading */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 56, lineHeight: 1.05, color: 'var(--pg-text)', margin: 0, letterSpacing: '-0.01em' }}>
            API keys
          </h1>
          <p style={{ fontSize: 14, color: 'var(--pg-text2)', maxWidth: 560, marginTop: 14, lineHeight: 1.6 }}>
            One key per environment. We store only a hash — if you lose the secret, you'll need to revoke it and mint a new one.
          </p>
          {/* Agent identity: friendly name on top, stable opaque ID underneath. */}
          <div
            style={{
              marginTop: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              border: '1px solid var(--pg-border)',
              borderRadius: 12,
              padding: '12px 16px',
              background: 'rgba(232,228,220,0.02)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: 'var(--pg-text)' }}>
                {auth.agentName || <span style={{ color: 'var(--pg-text3)', fontStyle: 'italic' }}>Unnamed agent</span>}
              </span>
              <span style={{ fontFamily: 'var(--pg-mono)', fontSize: 12, color: 'var(--pg-text3)' }}>
                {auth.agentId}
              </span>
            </div>
            <button onClick={() => setRenameOpen(true)} className="pg-btn pg-btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}>
              {auth.agentName ? 'Rename' : 'Name agent'}
            </button>
          </div>
        </div>

        {/* Usage analytics */}
        <section
          style={{
            border: '1px solid var(--pg-border)',
            borderRadius: 14,
            padding: 24,
            marginBottom: 40,
            background: 'rgba(232,228,220,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pg-text2)' }}>
              Usage
            </div>
            {/* Range toggle */}
            <div style={{ display: 'inline-flex', border: '1px solid var(--pg-border)', borderRadius: 9, padding: 3, gap: 2 }}>
              {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    fontFamily: 'var(--pg-sans)',
                    fontSize: 12.5,
                    textTransform: 'capitalize',
                    color: range === r ? 'var(--pg-text)' : 'var(--pg-text2)',
                    background: range === r ? 'rgba(232,228,220,0.06)' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    transition: 'color 120ms ease, background 120ms ease',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 1,
              background: 'var(--pg-border)',
              border: '1px solid var(--pg-border)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            {[
              { k: 'Today', v: usage?.summary.today },
              { k: 'Last 7 days', v: usage?.summary.last7 },
              { k: 'Last 30 days', v: usage?.summary.last30 },
              { k: 'All time', v: usage?.summary.total },
            ].map((s) => (
              <div key={s.k} style={{ background: 'var(--pg-bg)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--pg-text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.k}</div>
                <div style={{ fontFamily: 'var(--pg-mono)', fontSize: 22, color: 'var(--pg-text)', marginTop: 6 }}>
                  {usageLoading && usage == null ? '—' : (s.v ?? 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {usageError ? (
            <p style={{ color: 'var(--pg-danger)', fontSize: 13, margin: 0 }}>{usageError}</p>
          ) : usage ? (
            <div style={{ opacity: usageLoading ? 0.55 : 1, transition: 'opacity 150ms ease' }}>
              <UsageChart
                data={usage.series ?? []}
                maxLabels={range === 'daily' ? 8 : range === 'weekly' ? 6 : 12}
              />
            </div>
          ) : (
            <div style={{ height: 160, display: 'grid', placeItems: 'center', color: 'var(--pg-text3)', fontSize: 13 }}>
              Loading usage…
            </div>
          )}
        </section>

        {/* Create */}
        <section
          style={{
            border: '1px solid var(--pg-border)',
            borderRadius: 14,
            padding: 24,
            marginBottom: 40,
            background: 'rgba(232,228,220,0.02)',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pg-text2)', marginBottom: 14 }}>
            Create a new key
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <label htmlFor="new-key-name" style={{ display: 'block', fontSize: 13, color: 'var(--pg-text2)', marginBottom: 6 }}>
                Name
              </label>
              <input
                id="new-key-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="prod, staging, ci, …"
                maxLength={120}
                style={{
                  width: '100%',
                  fontFamily: 'var(--pg-sans)',
                  fontSize: 14,
                  color: 'var(--pg-text)',
                  background: 'rgba(232,228,220,0.025)',
                  border: '1px solid var(--pg-border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button type="submit" disabled={creating || !newName.trim()} className="pg-btn pg-btn-primary" style={{ minWidth: 132, justifyContent: 'center' }}>
              {creating ? 'Creating…' : 'Create key'}
            </button>
          </form>
          {createError && (
            <p style={{ color: 'var(--pg-danger)', fontSize: 13, marginTop: 12, marginBottom: 0 }}>{createError}</p>
          )}
        </section>

        {/* One-time reveal */}
        {justCreated && (
          <section
            role="alertdialog"
            style={{
              border: '1px solid rgba(166,123,115,0.42)',
              borderRadius: 14,
              padding: 24,
              marginBottom: 40,
              background: 'rgba(166,123,115,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--pg-text)' }}>
                  Copy {justCreated.key.name} now.
                </div>
                <p style={{ fontSize: 13, color: 'var(--pg-text2)', margin: '6px 0 0', maxWidth: 520, lineHeight: 1.6 }}>
                  This is the only time you'll see the full secret. We store a hash, not the key itself — if you lose it, mint a new one.
                </p>
              </div>
              <button onClick={() => { setJustCreated(null); setRevealCopied(false); }} className="pg-btn pg-btn-ghost">
                Done
              </button>
            </div>
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid var(--pg-border)',
                background: 'rgba(15,18,16,0.55)',
                borderRadius: 10,
                padding: '12px 14px',
                fontFamily: 'var(--pg-mono)',
                fontSize: 13,
                color: 'var(--pg-text)',
                wordBreak: 'break-all',
              }}
            >
              <span style={{ flex: 1 }}>{justCreated.plaintext}</span>
              <button onClick={copyPlaintext} className="pg-btn pg-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                {revealCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </section>
        )}

        {/* List */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pg-text2)' }}>
              Your keys {active.length > 0 && <span style={{ color: 'var(--pg-text3)' }}>· {active.length} active</span>}
            </div>
            <button onClick={load} className="pg-btn pg-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {error && (
            <p style={{ color: 'var(--pg-danger)', fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}

          {!loading && keys.length === 0 && (
            <div
              style={{
                border: '1px dashed var(--pg-border)',
                borderRadius: 14,
                padding: '40px 24px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--pg-text2)', margin: 0 }}>
                No keys yet.
              </p>
              <p style={{ fontSize: 13, color: 'var(--pg-text3)', marginTop: 8 }}>
                Create your first key above. It'll work in the Playground, the SDKs, and any curl.
              </p>
            </div>
          )}

          {keys.length > 0 && (
            <div
              role="table"
              style={{
                border: '1px solid var(--pg-border)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <div
                role="row"
                className="pg-keys-row pg-keys-row-head"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.2fr) 110px 140px 88px',
                  padding: '14px 20px',
                  background: 'rgba(232,228,220,0.025)',
                  borderBottom: '1px solid var(--pg-border)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--pg-text2)',
                }}
              >
                <span>Name</span>
                <span>Prefix</span>
                <span style={{ textAlign: 'right' }}>Requests</span>
                <span>Last used</span>
                <span></span>
              </div>

              {[...active, ...revoked].map((k, i) => {
                const isRevoked = !!k.revoked_at;
                return (
                  <div
                    key={k.id}
                    role="row"
                    className="pg-keys-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.2fr) 110px 140px 88px',
                      padding: '16px 20px',
                      borderBottom: i < keys.length - 1 ? '1px solid var(--pg-border)' : 'none',
                      alignItems: 'center',
                      opacity: isRevoked ? 0.55 : 1,
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 14, color: 'var(--pg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--pg-text3)' }}>
                        Created {timeAgo(k.created_at)}
                        {isRevoked && <> · <span style={{ color: 'var(--pg-danger)' }}>revoked {timeAgo(k.revoked_at)}</span></>}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--pg-mono)',
                        fontSize: 13,
                        color: 'var(--pg-text2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={k.prefix + '…'}
                    >
                      {k.prefix}<span style={{ color: 'var(--pg-text3)' }}>·•••••</span>
                    </span>
                    <span
                      style={{
                        textAlign: 'right',
                        fontFamily: 'var(--pg-mono)',
                        fontSize: 13,
                        color: k.request_count > 0 ? 'var(--pg-text)' : 'var(--pg-text3)',
                      }}
                    >
                      {k.request_count.toLocaleString()}
                    </span>
                    <span
                      style={{ fontSize: 12, color: k.last_used_at ? 'var(--pg-text2)' : 'var(--pg-text3)' }}
                      title={k.last_used_at ? fullDate(k.last_used_at) : 'Never used'}
                    >
                      {timeAgo(k.last_used_at)}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      {!isRevoked ? (
                        <button
                          onClick={() => handleRevoke(k.id)}
                          disabled={revokingId === k.id}
                          className="pg-btn pg-btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12, color: 'var(--pg-danger)', borderColor: 'rgba(198,120,103,0.32)' }}
                        >
                          {revokingId === k.id ? '…' : 'Revoke'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--pg-text3)' }}>—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <style>{`
          @media (max-width: 720px) {
            .pg-keys-row { grid-template-columns: 1fr !important; gap: 6px; padding: 16px !important; }
            .pg-keys-row-head { display: none !important; }
          }
        `}</style>
      </main>

      <AgentNameModal
        open={renameOpen}
        mode="rename"
        currentName={auth.agentName}
        agentId={auth.agentId}
        onSave={auth.renameAgent}
        onClose={() => setRenameOpen(false)}
      />
    </div>
  );
}
