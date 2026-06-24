'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */

interface ApiExplorerTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

interface HeaderRow {
  id: string;
  key: string;
  value: string;
  isStatic: boolean;
}

/* ─── Constants ─── */

const ENDPOINTS = [
  'GET /api/memory?agentId=[agentId]',
  'POST /api/memory',
  'GET /api/memory/[id]',
  'DELETE /api/memory/[id]',
  'POST /api/memory/encrypted',
  'POST /api/search',
  'POST /api/rag',
  'GET /api/skills',
  'POST /api/skills',
  'POST /api/execute',
  'POST /api/pipeline',
  'POST /api/compute/chat',
  'GET /api/compute/providers',
  'POST /api/compute/router',
  'POST /api/pay',
  'POST /api/identity',
  'GET /api/identity/nonce',
  'POST /api/agent/[agentId]/dreams',
  'POST /api/agent/[agentId]/snapshot',
  'POST /api/agent/[agentId]/share',
  'POST /api/agent/[agentId]/import',
  'POST /api/agent/[agentId]/mint-inft',
  'GET /api/agent/[agentId]/reputation',
  'POST /api/inft/transfer',
  'GET /api/kv',
  'POST /api/kv',
  'POST /api/seed-0g',
  'GET /api/status',
  'POST /api/test-0g',
];

const TEMPLATES: Record<string, object> = {
  'POST /api/memory': { agentId: '', content: '', type: 'episodic', importance: 3, tags: [] },
  'POST /api/search': { agentId: '', query: '', searchType: 'keyword', limit: 10 },
  'POST /api/rag': { agentId: '', query: '' },
  'POST /api/execute': { agentId: '', skillId: '', input: '' },
  'POST /api/pipeline': { agentId: '', steps: [{ skillId: '' }], input: '' },
  'POST /api/identity': { name: '', description: '' },
  'POST /api/agent/[agentId]/dreams': {},
  'POST /api/memory/encrypted': { agentId: '', content: '', encryptionKey: '' },
  'POST /api/compute/chat': { messages: [{ role: 'user', content: '' }], model: '' },
  'POST /api/pay': { txHash: '', skillId: '', agentId: '' },
  'POST /api/inft/transfer': { tokenId: '', toAddress: '', agentId: '' },
};

/* ─── Helpers ─── */

function getDefaultBody(method: string, endpoint: string): string {
  if (method === 'GET' || method === 'DELETE') return '';
  const key = `${method} ${endpoint}`;
  if (TEMPLATES[key]) return JSON.stringify(TEMPLATES[key], null, 2);
  return '{}';
}

function processUrl(endpoint: string, agentId: string | null): string {
  let url = endpoint;
  if (url.includes('[agentId]')) {
    url = url.replace('[agentId]', agentId ?? 'demo_agent');
  }
  if (url.includes('[id]')) {
    url = url.replace('[id]', 'demo_id');
  }
  return url;
}

/* ─── Component ─── */

export function ApiExplorerTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: ApiExplorerTabProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: 'h_content_type', key: 'Content-Type', value: 'application/json', isStatic: true },
    { id: 'h_auth', key: 'Authorization', value: `Bearer ${isLive && apiKey ? apiKey : 'YOUR_API_KEY'}`, isStatic: false },
  ]);
  const [bodyText, setBodyText] = useState(getDefaultBody('GET', '/api/memory'));
  const [isValidJson, setIsValidJson] = useState(true);
  const [sending, setSending] = useState(false);

  /* Parse selected endpoint */
  const [method, rawPath] = selectedEndpoint.split(' ');
  const needsBody = method !== 'GET' && method !== 'DELETE';
  const processedUrl = processUrl(rawPath, agentId);

  /* Sync auth header when live state changes */
  useEffect(() => {
    setHeaders((prev) =>
      prev.map((h) => (h.key === 'Authorization' ? { ...h, value: `Bearer ${isLive && apiKey ? apiKey : 'YOUR_API_KEY'}` } : h))
    );
  }, [isLive, apiKey]);

  /* Handle endpoint change */
  const handleEndpointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedEndpoint(val);
    const [m, p] = val.split(' ');
    setBodyText(getDefaultBody(m, p));
  };

  /* JSON validation */
  useEffect(() => {
    if (!needsBody) {
      setIsValidJson(true);
      return;
    }
    try {
      if (bodyText.trim()) JSON.parse(bodyText);
      setIsValidJson(true);
    } catch {
      setIsValidJson(false);
    }
  }, [bodyText, needsBody]);

  /* Update preview panel continuously */
  useEffect(() => {
    let parsedBody = null;
    if (needsBody && isValidJson && bodyText.trim()) {
      try { parsedBody = JSON.parse(bodyText); } catch {}
    }

    const headersDict: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) headersDict[h.key.trim()] = h.value.trim();
    });

    onRequestUpdate({
      method,
      endpoint: processedUrl,
      headers: headersDict,
      body: parsedBody,
    });
  }, [method, processedUrl, headers, bodyText, needsBody, isValidJson, onRequestUpdate]);

  /* Header management */
  const addHeader = () => {
    setHeaders((prev) => [...prev, { id: 'h_' + Date.now(), key: '', value: '', isStatic: false }]);
  };

  const removeHeader = (id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id || h.isStatic));
  };

  const updateHeader = (id: string, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  };

  /* Send request */
  const handleSend = async () => {
    if (sending || (needsBody && !isValidJson)) return;

    setSending(true);
    onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

    const headersDict: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) headersDict[h.key.trim()] = h.value.trim();
    });

    let fetchBody = undefined;
    if (needsBody && bodyText.trim()) {
      fetchBody = bodyText;
    }

    const startTime = Date.now();

    try {
      const res = await fetch(processedUrl, {
        method,
        headers: headersDict,
        body: fetchBody,
      });

      const duration = Date.now() - startTime;
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        onResponseUpdate({
          response: data,
          error: data?.error ?? 'Request failed',
          isLoading: false,
          statusCode: res.status,
        });
      } else {
        onResponseUpdate({
          response: data,
          error: null,
          isLoading: false,
          statusCode: res.status,
        });
      }
    } catch (err) {
      onResponseUpdate({
        response: null,
        error: 'Network error — could not reach the server.',
        isLoading: false,
        statusCode: null,
      });
    } finally {
      setSending(false);
    }
  };

  /* ─── Render ─── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner */}
      <div
        style={{
          border: '1px solid rgba(166,123,115,0.4)',
          background: 'rgba(166,123,115,0.08)',
          borderRadius: 6,
          padding: 10,
          fontSize: 13,
          fontFamily: 'var(--pg-sans)',
          color: '#A67B73',
        }}
      >
        API Explorer makes real requests.{' '}
        {isLive ? 'Using your agent credentials.' : 'Add an API key in the Authorization header for authenticated endpoints.'}
      </div>

      {/* Endpoint selection */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 4 }}>
          Endpoint
        </label>
        <select
          value={selectedEndpoint}
          onChange={handleEndpointChange}
          style={{
            width: '100%',
            fontFamily: 'var(--pg-mono)',
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
          {ENDPOINTS.map((ep) => (
            <option key={ep} value={ep}>{ep}</option>
          ))}
        </select>
        {processedUrl !== rawPath && (
          <div style={{ fontSize: 12, fontFamily: 'var(--pg-mono)', color: 'var(--pg-text2)', marginTop: 4 }}>
            → {method} {processedUrl}
          </div>
        )}
      </div>

      {/* Headers */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)' }}>
            Headers
          </label>
          <button
            onClick={addHeader}
            style={{
              fontSize: 12,
              fontFamily: 'var(--pg-sans)',
              color: 'var(--pg-text2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            + Add Header
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {headers.map((h) => (
            <div key={h.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={h.key}
                onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                disabled={h.isStatic}
                placeholder="Key"
                style={{
                  flex: 1,
                  fontFamily: 'var(--pg-mono)',
                  fontSize: 12,
                  color: h.isStatic ? 'var(--pg-text2)' : 'var(--pg-text)',
                  background: h.isStatic ? 'rgba(232,228,220,0.04)' : 'transparent',
                  border: '1px solid var(--pg-border)',
                  borderRadius: 4,
                  padding: '6px 8px',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                value={h.value}
                onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                placeholder="Value"
                style={{
                  flex: 1,
                  fontFamily: 'var(--pg-mono)',
                  fontSize: 12,
                  color: 'var(--pg-text)',
                  background: 'transparent',
                  border: '1px solid var(--pg-border)',
                  borderRadius: 4,
                  padding: '6px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => removeHeader(h.id)}
                disabled={h.isStatic}
                style={{
                  fontSize: 16,
                  color: h.isStatic ? 'var(--pg-border)' : 'var(--pg-text2)',
                  background: 'none',
                  border: 'none',
                  cursor: h.isStatic ? 'not-allowed' : 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: needsBody ? 'var(--pg-text)' : 'var(--pg-text3)', marginBottom: 4 }}>
          Body
        </label>
        <textarea
          rows={8}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          disabled={!needsBody}
          placeholder={needsBody ? 'Enter JSON body...' : 'Body not required for GET/DELETE requests.'}
          style={{
            width: '100%',
            fontFamily: 'var(--pg-mono)',
            fontSize: 13,
            color: needsBody ? 'var(--pg-text)' : 'var(--pg-text3)',
            background: needsBody ? 'transparent' : 'rgba(232,228,220,0.04)',
            border: '1px solid var(--pg-border)',
            borderRadius: 6,
            padding: '8px 10px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {needsBody && (
          <div
            style={{
              fontSize: 12,
              fontFamily: 'var(--pg-sans)',
              fontWeight: 500,
              color: isValidJson ? '#7A9E8E' : '#C67867',
              marginTop: 4,
            }}
          >
            {isValidJson ? '✓ Valid JSON' : '✗ Invalid JSON'}
          </div>
        )}
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={sending || (needsBody && !isValidJson)}
        style={{
          width: '100%',
          height: 40,
          fontSize: 14,
          fontFamily: 'var(--pg-sans)',
          fontWeight: 500,
          color: 'var(--pg-bg)',
          background: sending || (needsBody && !isValidJson) ? 'var(--pg-text2)' : 'var(--pg-text)',
          border: 'none',
          borderRadius: 6,
          cursor: sending || (needsBody && !isValidJson) ? 'not-allowed' : 'pointer',
        }}
      >
        {sending ? 'Sending...' : 'Send Request'}
      </button>
    </div>
  );
}
