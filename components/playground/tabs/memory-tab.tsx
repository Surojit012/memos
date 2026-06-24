'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */

interface MemoryRecord {
  id: string;
  agentId?: string;
  content: string;
  type: 'episodic' | 'semantic' | 'procedural';
  importance: number;
  tags: string[];
  createdAt: string;
  accessCount?: number;
  decayScore?: number;
}

interface MemoryTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

interface ErrorBanner {
  id: string;
  message: string;
  type: 'network' | '401' | '429' | '500' | 'generic';
}

/* ─── Constants ─── */

const SANDBOX_MEMORIES: MemoryRecord[] = [
  { id: 'mem_demo_001', content: 'User prefers Python over JavaScript for backend tasks', type: 'semantic', importance: 4, tags: ['preferences', 'coding'], createdAt: '2024-01-15T10:00:00Z' },
  { id: 'mem_demo_002', content: 'Completed onboarding flow on January 15th, chose developer plan', type: 'episodic', importance: 3, tags: ['onboarding'], createdAt: '2024-01-15T10:05:00Z' },
  { id: 'mem_demo_003', content: 'To deploy a new agent: register identity, store initial memories, trigger first dream cycle', type: 'procedural', importance: 5, tags: ['workflow', 'deployment'], createdAt: '2024-01-15T10:10:00Z' },
  { id: 'mem_demo_004', content: 'User is building an AI coding assistant for TypeScript projects', type: 'semantic', importance: 4, tags: ['context', 'project'], createdAt: '2024-01-15T10:15:00Z' },
  { id: 'mem_demo_005', content: 'Asked about memory decay algorithm at 10:20am, explained 14-day threshold', type: 'episodic', importance: 2, tags: ['support'], createdAt: '2024-01-15T10:20:00Z' },
];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  episodic: { bg: 'rgba(94,125,126,0.12)', color: '#74989a' },
  semantic: { bg: 'rgba(166,123,115,0.12)', color: '#A67B73' },
  procedural: { bg: 'rgba(122,158,142,0.10)', color: '#7A9E8E' },
};

/* ─── Helpers ─── */

function getErrorBanner(status: number, fallbackMessage: string): ErrorBanner {
  const id = 'err_' + Date.now();
  if (status === 401) return { id, message: 'API key invalid — try logging out and back in.', type: '401' };
  if (status === 429) return { id, message: 'Rate limit reached — wait a moment before trying again.', type: '429' };
  if (status >= 500) return { id, message: 'Server error — this has been noted. Try again shortly.', type: '500' };
  return { id, message: fallbackMessage, type: 'network' };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ─── Component ─── */

export function MemoryTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: MemoryTabProps) {
  /* Form state */
  const [content, setContent] = useState('');
  const [memoryType, setMemoryType] = useState<'episodic' | 'semantic' | 'procedural'>('episodic');
  const [importance, setImportance] = useState(3);
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Memory list state */
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  /* Error banners */
  const [banners, setBanners] = useState<ErrorBanner[]>([]);

  const addBanner = useCallback((banner: ErrorBanner) => {
    setBanners((prev) => [banner, ...prev]);
  }, []);

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* ─── Load memories on mount ─── */
  useEffect(() => {
    if (!isLive) {
      setMemories(SANDBOX_MEMORIES);
      return;
    }
    if (!agentId || !apiKey) return;

    let cancelled = false;
    const load = async () => {
      setLoadingList(true);
      const endpoint = `/api/memory?agentId=${encodeURIComponent(agentId)}`;
      const headers = authHeaders();

      onRequestUpdate({ method: 'GET', endpoint, headers, body: null });
      onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

      try {
        const res = await fetch(endpoint, { headers });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          addBanner(getErrorBanner(res.status, data.error ?? 'Failed to load memories'));
          onResponseUpdate({ response: data, error: data.error ?? 'Failed to load memories', isLoading: false, statusCode: res.status });
          return;
        }

        const mems: MemoryRecord[] = Array.isArray(data) ? data : data.memories ?? data.data ?? [];
        setMemories(mems);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        addBanner({ id: 'err_' + Date.now(), message: 'Request failed — check your connection', type: 'network' });
        onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isLive, agentId, apiKey, authHeaders, onRequestUpdate, onResponseUpdate, addBanner]);

  /* ─── Submit memory ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!content.trim()) {
      setFormError('Content is required');
      return;
    }

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const bodyPayload = {
      agentId: isLive ? agentId : 'demo_agent',
      content: content.trim(),
      type: memoryType,
      importance: Number(importance),
      tags,
    };

    const endpoint = '/api/memory';
    const method = 'POST';
    const headers = authHeaders();

    onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
    onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

    setSubmitting(true);

    try {
      if (isLive) {
        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error ?? 'Failed to store memory';
          setFormError(errMsg);
          addBanner(getErrorBanner(res.status, errMsg));
          onResponseUpdate({ response: data, error: errMsg, isLoading: false, statusCode: res.status });
          return;
        }

        const newMem: MemoryRecord = data.memory ?? data;
        setMemories((prev) => [newMem, ...prev]);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        // Sandbox mode
        await new Promise((resolve) => setTimeout(resolve, 800));

        const sandboxResult: MemoryRecord = {
          id: 'mem_sandbox_' + Date.now(),
          agentId: 'demo_agent',
          content: content.trim(),
          type: memoryType,
          importance: Number(importance),
          tags,
          createdAt: new Date().toISOString(),
          accessCount: 0,
          decayScore: 1.0,
        };

        setMemories((prev) => [sandboxResult, ...prev]);
        onResponseUpdate({ response: sandboxResult, error: null, isLoading: false, statusCode: 201 });
      }

      // Clear form on success
      setContent('');
      setMemoryType('episodic');
      setImportance(3);
      setTagsInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setFormError(msg);
      addBanner({ id: 'err_' + Date.now(), message: 'Request failed — check your connection', type: 'network' });
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Delete memory ─── */
  const handleDelete = async (memId: string) => {
    setDeletingIds((prev) => new Set(prev).add(memId));

    try {
      if (isLive) {
        const endpoint = `/api/memory/${encodeURIComponent(memId)}`;
        const headers = authHeaders();

        onRequestUpdate({ method: 'DELETE', endpoint, headers, body: null });
        onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

        const res = await fetch(endpoint, { method: 'DELETE', headers });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          addBanner(getErrorBanner(res.status, 'Failed to delete memory'));
          onResponseUpdate({ response: data, error: 'Failed to delete', isLoading: false, statusCode: res.status });
          return;
        }

        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      }

      setMemories((prev) => prev.filter((m) => m.id !== memId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addBanner({ id: 'err_' + Date.now(), message: 'Request failed — check your connection', type: 'network' });
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(memId);
        return next;
      });
    }
  };

  /* ─── Render ─── */
  return (
    <div>
      {/* Error banners */}
      {banners.map((banner) => (
        <div
          key={banner.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            marginBottom: 8,
            borderRadius: 6,
            border: `1px solid ${banner.type === 'network' ? '#A67B73' : banner.type === '401' ? '#C67867' : banner.type === '429' ? '#A67B73' : '#C67867'}`,
            background: banner.type === 'network' || banner.type === '429' ? 'rgba(166,123,115,0.08)' : 'rgba(198,120,103,0.06)',
            fontSize: 13,
            fontFamily: 'var(--pg-sans)',
            color: 'var(--pg-text)',
          }}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => dismissBanner(banner.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--pg-text2)',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add Memory Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="memory-content"
            style={{
              display: 'block',
              fontSize: 13,
              fontFamily: 'var(--pg-sans)',
              fontWeight: 500,
              color: 'var(--pg-text)',
              marginBottom: 4,
            }}
          >
            Content
          </label>
          <textarea
            id="memory-content"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What should your agent remember?"
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

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {/* Type select */}
          <div style={{ flex: 1 }}>
            <label
              htmlFor="memory-type"
              style={{
                display: 'block',
                fontSize: 13,
                fontFamily: 'var(--pg-sans)',
                fontWeight: 500,
                color: 'var(--pg-text)',
                marginBottom: 4,
              }}
            >
              Type
            </label>
            <select
              id="memory-type"
              value={memoryType}
              onChange={(e) => setMemoryType(e.target.value as 'episodic' | 'semantic' | 'procedural')}
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
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="episodic">episodic</option>
              <option value="semantic">semantic</option>
              <option value="procedural">procedural</option>
            </select>
          </div>

          {/* Importance slider */}
          <div style={{ flex: 1 }}>
            <label
              htmlFor="memory-importance"
              style={{
                display: 'block',
                fontSize: 13,
                fontFamily: 'var(--pg-sans)',
                fontWeight: 500,
                color: 'var(--pg-text)',
                marginBottom: 4,
              }}
            >
              Importance{' '}
              <span style={{ fontWeight: 400, color: 'var(--pg-text2)' }}>{importance}</span>
            </label>
            <input
              id="memory-importance"
              type="range"
              min={1}
              max={5}
              step={1}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--pg-text)',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="memory-tags"
            style={{
              display: 'block',
              fontSize: 13,
              fontFamily: 'var(--pg-sans)',
              fontWeight: 500,
              color: 'var(--pg-text)',
              marginBottom: 4,
            }}
          >
            Tags
          </label>
          <input
            id="memory-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tag1, tag2 (comma separated)"
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

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            height: 40,
            fontSize: 14,
            fontFamily: 'var(--pg-sans)',
            fontWeight: 500,
            color: 'var(--pg-bg)',
            background: submitting ? 'rgba(94,125,126,0.4)' : 'var(--pg-cyan)',
            border: 'none',
            borderRadius: 6,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--pg-cyan-hi)'; }}
          onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--pg-cyan)'; }}
        >
          {submitting ? 'Storing...' : 'Store Memory'}
        </button>

        {formError && (
          <p
            style={{
              fontSize: 13,
              fontFamily: 'var(--pg-sans)',
              color: '#C67867',
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            {formError}
          </p>
        )}
      </form>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '20px 0 16px' }} />

      {/* Memory List Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span
          style={{
            fontSize: 14,
            fontFamily: 'var(--pg-sans)',
            fontWeight: 500,
            color: 'var(--pg-text)',
          }}
        >
          Stored Memories
        </span>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--pg-sans)',
            color: 'var(--pg-text2)',
            background: 'rgba(232,228,220,0.04)',
            borderRadius: 6,
            padding: '2px 8px',
          }}
        >
          {memories.length}
        </span>
      </div>

      {/* Loading state */}
      {loadingList && (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--pg-text3)', fontSize: 13, fontFamily: 'var(--pg-sans)' }}>
          Loading memories...
        </div>
      )}

      {/* Empty state */}
      {!loadingList && memories.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--pg-border)',
            borderRadius: 10,
            padding: '28px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--pg-text2)', margin: '0 0 10px' }}>
            No memories yet.
          </p>
          <p style={{ fontSize: 13, color: 'var(--pg-text3)', lineHeight: 1.6, margin: 0, maxWidth: 380, marginInline: 'auto' }}>
            Write something in the Content field above and hit <strong style={{ color: 'var(--pg-text2)' }}>Store Memory</strong>.
            Once you have a few, try Search (⌕) to find them semantically, or RAG (✦) to ask the LLM questions grounded in what you've stored.
          </p>
        </div>
      )}

      {/* Memory cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {memories.map((mem) => {
          const typeColor = TYPE_COLORS[mem.type] ?? TYPE_COLORS.episodic;
          const isDeleting = deletingIds.has(mem.id);

          return (
            <div
              key={mem.id}
              style={{
                border: '1px solid var(--pg-border)',
                borderRadius: 6,
                padding: 12,
                background: 'transparent',
                position: 'relative',
              }}
            >
              {/* Content */}
              <p
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--pg-sans)',
                  color: 'var(--pg-text)',
                  lineHeight: 1.5,
                  margin: '0 0 8px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  paddingRight: 28,
                }}
              >
                {mem.content}
              </p>

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                {/* Type badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--pg-sans)',
                    fontWeight: 500,
                    color: typeColor.color,
                    background: typeColor.bg,
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  {mem.type}
                </span>

                {/* Importance dots */}
                <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: n <= mem.importance ? 'var(--pg-text)' : 'var(--pg-border)',
                        display: 'inline-block',
                      }}
                    />
                  ))}
                </span>

                {/* Tags */}
                {mem.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--pg-sans)',
                      color: 'var(--pg-text2)',
                      background: 'rgba(232,228,220,0.04)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    {tag}
                  </span>
                ))}

                {/* Date */}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--pg-sans)',
                    color: 'var(--pg-text3)',
                    marginLeft: 'auto',
                  }}
                >
                  {formatDate(mem.createdAt)}
                </span>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(mem.id)}
                disabled={isDeleting}
                title="Delete memory"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  color: isDeleting ? 'var(--pg-text3)' : 'var(--pg-text2)',
                  padding: '2px 4px',
                  lineHeight: 1,
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.color = '#C67867'; }}
                onMouseLeave={(e) => { if (!isDeleting) e.currentTarget.style.color = 'var(--pg-text2)'; }}
              >
                {isDeleting ? '⟳' : '✕'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
