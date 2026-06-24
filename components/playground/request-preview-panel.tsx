'use client';

import { useState } from 'react';

type CodeTab = 'curl' | 'python' | 'typescript';

interface RequestPreviewPanelProps {
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  body: object | null;
  agentId: string | null;
  apiKey: string | null;
}

/* Warm palette: keyword = cyan, string = sage, number = rose, label = smoke. */
const COL = { kw: '#74989a', str: '#7A9E8E', num: '#A67B73', dim: '#8A9490' };

function highlightCurl(code: string): string {
  return code
    .replace(/^(curl)/gm, `<span style="color:${COL.kw}">curl</span>`)
    .replace(/(-X\s+)(GET|POST|PUT|DELETE|PATCH)/g, `<span style="color:${COL.dim}">$1</span><span style="color:${COL.num}">$2</span>`)
    .replace(/(-H\s+)/g, `<span style="color:${COL.dim}">$1</span>`)
    .replace(/(-d\s+)/g, `<span style="color:${COL.dim}">$1</span>`)
    .replace(/"([^"]*)"/g, `<span style="color:${COL.str}">"$1"</span>`);
}

function highlightPython(code: string): string {
  const keywords = ['from', 'import', 'print', 'client'];
  let result = code.replace(/"([^"]*)"/g, `<span style="color:${COL.str}">"$1"</span>`);
  keywords.forEach((kw) => {
    result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `<span style="color:${COL.kw}">$1</span>`);
  });
  result = result.replace(/(\d+\.?\d*)/g, `<span style="color:${COL.num}">$1</span>`);
  return result;
}

function highlightTs(code: string): string {
  const keywords = ['const', 'await', 'fetch', 'method', 'headers', 'body'];
  let result = code.replace(/'([^']*)'/g, `<span style="color:${COL.str}">'$1'</span>`);
  result = result.replace(/"([^"]*)"/g, `<span style="color:${COL.str}">"$1"</span>`);
  keywords.forEach((kw) => {
    result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `<span style="color:${COL.kw}">$1</span>`);
  });
  result = result.replace(/(?<![#"])(\d+\.?\d*)(?!")/g, `<span style="color:${COL.num}">$1</span>`);
  return result;
}

function buildPythonCall(endpoint: string, method: string, body: object | null): string {
  const b = (body ?? {}) as Record<string, unknown>;

  if (method === 'POST' && endpoint === '/api/memory') {
    return `result = client.store_memory(\n    content="${b.content ?? ''}",\n    type="${b.type ?? 'episodic'}",\n    importance=${b.importance ?? 3},\n    tags=${JSON.stringify(b.tags ?? [])}\n)\nprint(result)`;
  }
  if (method === 'GET' && endpoint.startsWith('/api/memory')) {
    return `result = client.list_memories()\nprint(result)`;
  }
  if (method === 'DELETE' && endpoint.startsWith('/api/memory')) {
    const memId = endpoint.split('/').pop() ?? '';
    return `result = client.delete_memory(memory_id="${memId}")\nprint(result)`;
  }
  if (endpoint === '/api/search') {
    return `results = client.search(\n    query="${b.query ?? ''}",\n    search_type="${b.searchType ?? 'keyword'}"\n)\nfor r in results:\n    print(f"{r['score']:.2f} — {r['content']}")`;
  }
  if (endpoint === '/api/rag') {
    return `response = client.query(\n    question="${b.query ?? ''}",\n    include_sources=True\n)\nprint(response['answer'])\nfor source in response['sources']:\n    print(f"  [{source['id']}] {source['content']}")`;
  }
  if (endpoint.includes('/dreams')) {
    return `result = client.trigger_dream()\nprint(result)`;
  }
  if (method === 'GET' && endpoint === '/api/skills') {
    return `skills = client.list_skills()\nfor s in skills:\n    print(f"{s['name']} — {s['price']} ETH")`;
  }
  if (endpoint === '/api/execute') {
    return `result = client.execute_skill(\n    skill_id="${b.skillId ?? ''}",\n    input="${b.input ?? ''}"\n)\nprint(result)`;
  }
  if (endpoint === '/api/pipeline') {
    const steps = (b.steps as Array<{skillId: string}>) ?? [];
    const stepsStr = JSON.stringify(steps);
    return `result = client.run_pipeline(\n    steps=${stepsStr},\n    input="${b.input ?? ''}"\n)\nprint(result)`;
  }
  if (method === 'GET' && endpoint.includes('/identity')) {
    return `identity = client.get_identity()\nprint(identity)`;
  }
  if (method === 'POST' && endpoint.includes('/identity')) {
    return `result = client.register(\n    name="${b.name ?? ''}"\n)\nprint(result)`;
  }
  // Fallback
  return `result = client.request("${method}", "${endpoint}")\nprint(result)`;
}

function buildPython(props: RequestPreviewPanelProps): string {
  const { endpoint, method, body, agentId, apiKey } = props;
  const key = apiKey ?? 'YOUR_API_KEY';
  const agent = agentId ?? 'YOUR_AGENT_ID';
  const call = buildPythonCall(endpoint, method, body);
  return `from memos_py import MemosClient

client = MemosClient(
    api_key="${key}",
    agent_id="${agent}",
    base_url="https://your-deployment.vercel.app"
)

${call}`;
}

function buildCurl(props: RequestPreviewPanelProps): string {
  const { method, endpoint, body, apiKey } = props;
  const key = apiKey ?? 'YOUR_API_KEY';
  let code = `curl -X ${method} https://your-domain.com${endpoint} \\\n`;
  code += `  -H "Content-Type: application/json" \\\n`;
  code += `  -H "Authorization: Bearer ${key}"`;
  if (body) {
    code += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`;
  }
  return code;
}

function buildTypescript(props: RequestPreviewPanelProps): string {
  const { method, endpoint, body, apiKey } = props;
  const key = apiKey ?? 'YOUR_API_KEY';
  let code = `const response = await fetch('${endpoint}', {\n`;
  code += `  method: '${method}',\n`;
  code += `  headers: {\n`;
  code += `    'Content-Type': 'application/json',\n`;
  code += `    'Authorization': 'Bearer ${key}'\n`;
  code += `  },\n`;
  if (body) {
    code += `  body: JSON.stringify(${JSON.stringify(body, null, 2).replace(/^/gm, '  ').trim()})\n`;
  }
  code += `})\n\nconst data = await response.json()`;
  return code;
}

export function RequestPreviewPanel(props: RequestPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<CodeTab>('curl');
  const [copied, setCopied] = useState(false);

  const tabs: { id: CodeTab; label: string }[] = [
    { id: 'curl', label: 'curl' },
    { id: 'python', label: 'python' },
    { id: 'typescript', label: 'typescript' },
  ];

  let rawCode = '';
  let highlightedCode = '';

  switch (activeTab) {
    case 'curl':
      rawCode = buildCurl(props);
      highlightedCode = highlightCurl(rawCode);
      break;
    case 'python':
      rawCode = buildPython(props);
      highlightedCode = highlightPython(rawCode);
      break;
    case 'typescript':
      rawCode = buildTypescript(props);
      highlightedCode = highlightTs(rawCode);
      break;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      {/* Language toggle */}
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          gap: 0,
          marginBottom: 14,
          border: '1px solid var(--pg-border)',
          borderRadius: 999,
          padding: 3,
          background: 'rgba(232,228,220,0.02)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontSize: 11,
                fontFamily: 'var(--pg-mono)',
                letterSpacing: '0.04em',
                color: isActive ? 'var(--pg-text)' : 'var(--pg-text2)',
                background: isActive ? 'rgba(94,125,126,0.18)' : 'transparent',
                border: 'none',
                borderRadius: 999,
                padding: '5px 12px',
                cursor: 'pointer',
                transition: 'all 140ms ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: 11,
            fontFamily: 'var(--pg-sans)',
            color: copied ? 'var(--pg-green)' : 'var(--pg-text2)',
            background: 'rgba(15,18,16,0.6)',
            border: '1px solid var(--pg-border)',
            borderRadius: 4,
            padding: '3px 10px',
            cursor: 'pointer',
            transition: 'color 140ms ease, border-color 140ms ease',
            zIndex: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pg-text3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <pre
          style={{
            fontFamily: 'var(--pg-mono)',
            fontSize: 12,
            lineHeight: 1.65,
            color: 'var(--pg-text)',
            background: 'rgba(232,228,220,0.02)',
            border: '1px solid var(--pg-border)',
            borderRadius: 8,
            padding: '14px 14px 14px 14px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </div>
    </div>
  );
}
