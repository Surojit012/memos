'use client';

import { useState, useCallback } from 'react';

/* ─── Types ─── */

interface SearchResult {
  id: string;
  content: string;
  type: 'episodic' | 'semantic' | 'procedural';
  importance: number;
  score: number;
  tags: string[];
}

interface SearchTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

interface ErrorBanner {
  id: string;
  message: string;
}

/* ─── Constants ─── */

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  episodic: { bg: '#eff6ff', color: '#2563eb' },
  semantic: { bg: '#faf5ff', color: '#9333ea' },
  procedural: { bg: '#f0fdf4', color: '#16a34a' },
};

const SANDBOX_RESPONSE = {
  results: [
    { id: 'mem_demo_001', content: 'User prefers Python over JavaScript for backend tasks', type: 'semantic' as const, importance: 4, score: 0.94, tags: ['preferences', 'coding'] },
    { id: 'mem_demo_004', content: 'User is building an AI coding assistant for TypeScript projects', type: 'semantic' as const, importance: 4, score: 0.87, tags: ['context', 'project'] },
  ],
  searchType: 'keyword',
  totalFound: 2,
};

/* ─── Component ─── */

export function SearchTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('keyword');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [totalFound, setTotalFound] = useState(0);
  const [banners, setBanners] = useState<ErrorBanner[]>([]);

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const endpoint = '/api/search';
    const method = 'POST';
    const headers = authHeaders();
    const bodyPayload = {
      agentId: isLive ? agentId : 'demo_agent',
      query: query.trim(),
      searchType,
      limit: 10,
    };

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
          const errMsg = data.error ?? 'Search failed';
          if (res.status === 401) {
            setBanners((p) => [{ id: 'err_' + Date.now(), message: 'API key invalid — try logging out and back in.' }, ...p]);
          } else if (res.status === 429) {
            setBanners((p) => [{ id: 'err_' + Date.now(), message: 'Rate limit reached — wait a moment before trying again.' }, ...p]);
          } else if (res.status >= 500) {
            setBanners((p) => [{ id: 'err_' + Date.now(), message: 'Server error — this has been noted. Try again shortly.' }, ...p]);
          } else {
            setBanners((p) => [{ id: 'err_' + Date.now(), message: 'Request failed — check your connection' }, ...p]);
          }
          onResponseUpdate({ response: data, error: errMsg, isLoading: false, statusCode: res.status });
          setResults([]);
          setTotalFound(0);
          return;
        }

        const searchResults: SearchResult[] = data.results ?? data.data ?? [];
        setResults(searchResults);
        setTotalFound(data.totalFound ?? searchResults.length);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        // Sandbox
        await new Promise((resolve) => setTimeout(resolve, 600));
        setResults(SANDBOX_RESPONSE.results);
        setTotalFound(SANDBOX_RESPONSE.totalFound);
        onResponseUpdate({ response: SANDBOX_RESPONSE, error: null, isLoading: false, statusCode: 200 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setBanners((p) => [{ id: 'err_' + Date.now(), message: 'Request failed — check your connection' }, ...p]);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
      setResults([]);
      setTotalFound(0);
    } finally {
      setSubmitting(false);
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
            border: '1px solid #d97706',
            background: '#fffbeb',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#ffffff',
          }}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => dismissBanner(banner.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '0 4px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Search form */}
      <form onSubmit={handleSearch}>
        {/* Query */}
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="search-query"
            style={{ display: 'block', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff', marginBottom: 4 }}
          >
            Query
          </label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agent memories..."
            style={{
              width: '100%',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              color: '#ffffff',
              background: 'var(--surface)',
              border: '1px solid #e4e4e7',
              borderRadius: 6,
              padding: '8px 10px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#ffffff'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>

        {/* Mode toggle */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ display: 'block', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff', marginBottom: 4 }}
          >
            Mode
          </label>
          <div style={{ display: 'flex', gap: 0 }}>
            <button
              type="button"
              onClick={() => setSearchType('keyword')}
              style={{
                flex: 1,
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: searchType === 'keyword' ? 'var(--surface)' : 'var(--text2)',
                background: searchType === 'keyword' ? '#ffffff' : 'var(--surface)',
                border: searchType === 'keyword' ? '1px solid #18181b' : '1px solid #e4e4e7',
                borderRadius: '6px 0 0 6px',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              Keyword
            </button>
            <button
              type="button"
              onClick={() => setSearchType('semantic')}
              style={{
                flex: 1,
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: searchType === 'semantic' ? 'var(--surface)' : 'var(--text2)',
                background: searchType === 'semantic' ? '#ffffff' : 'var(--surface)',
                border: searchType === 'semantic' ? '1px solid #18181b' : '1px solid #e4e4e7',
                borderRadius: '0 6px 6px 0',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                marginLeft: -1,
              }}
            >
              Semantic
            </button>
          </div>
        </div>

        {/* Semantic info box */}
        {searchType === 'semantic' && (
          <div
            style={{
              background: '#f4f4f5',
              borderRadius: 6,
              padding: 10,
              marginBottom: 12,
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: 'var(--text2)',
              lineHeight: 1.5,
            }}
          >
            Semantic search uses embedding similarity via 0G Compute. Results may vary based on provider availability.
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !query.trim()}
          style={{
            width: '100%',
            height: 40,
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            color: 'var(--surface)',
            background: submitting || !query.trim() ? 'var(--text2)' : '#ffffff',
            border: 'none',
            borderRadius: 6,
            cursor: submitting || !query.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { if (!submitting && query.trim()) e.currentTarget.style.background = '#27272a'; }}
          onMouseLeave={(e) => { if (!submitting && query.trim()) e.currentTarget.style.background = '#ffffff'; }}
        >
          {submitting ? 'Searching...' : 'Search Memories'}
        </button>
      </form>

      {/* Results */}
      {results !== null && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '20px 0 16px' }} />

          <div style={{ marginBottom: 12, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)' }}>
            Found <span style={{ fontWeight: 500, color: '#ffffff' }}>{totalFound}</span> memories
          </div>

          {results.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#a1a1aa', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>
              No memories matched your search.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r) => {
              const typeColor = TYPE_COLORS[r.type] ?? TYPE_COLORS.episodic;
              const scorePercent = Math.round(r.score * 100);

              return (
                <div
                  key={r.id}
                  style={{
                    border: '1px solid #e4e4e7',
                    borderRadius: 6,
                    padding: 12,
                    background: 'var(--surface)',
                  }}
                >
                  {/* Content */}
                  <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#ffffff', lineHeight: 1.5, margin: '0 0 8px' }}>
                    {r.content}
                  </p>

                  {/* Score bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${scorePercent}%`, height: '100%', background: '#ffffff', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                      {scorePercent}% match
                    </span>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: 500,
                        color: typeColor.color,
                        background: typeColor.bg,
                        borderRadius: 4,
                        padding: '2px 6px',
                      }}
                    >
                      {r.type}
                    </span>

                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          fontFamily: 'Inter, system-ui, sans-serif',
                          color: 'var(--text2)',
                          background: '#f4f4f5',
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
