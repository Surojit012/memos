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

function highlightJson(json: string): string {
  return json
    .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color:#2563eb">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span style="color:#16a34a">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#d97706">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#9333ea">$1</span>');
}

function highlightCurl(code: string): string {
  return code
    .replace(/^(curl)/gm, '<span style="color:#9333ea">curl</span>')
    .replace(/(-X\s+)(GET|POST|PUT|DELETE|PATCH)/g, '<span style="color:#9333ea">$1</span><span style="color:#d97706">$2</span>')
    .replace(/(-H\s+)/g, '<span style="color:#9333ea">$1</span>')
    .replace(/(-d\s+)/g, '<span style="color:#9333ea">$1</span>')
    .replace(/"([^"]*)"/g, '<span style="color:#16a34a">"$1"</span>');
}

function highlightPython(code: string): string {
  const keywords = ['from', 'import', 'print', 'client'];
  let result = code.replace(/"([^"]*)"/g, '<span style="color:#16a34a">"$1"</span>');
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    result = result.replace(regex, '<span style="color:#9333ea">$1</span>');
  });
  result = result.replace(/(\d+\.?\d*)/g, '<span style="color:#d97706">$1</span>');
  return result;
}

function highlightTs(code: string): string {
  const keywords = ['const', 'await', 'fetch', 'method', 'headers', 'body'];
  let result = code.replace(/'([^']*)'/g, '<span style="color:#16a34a">\'$1\'</span>');
  result = result.replace(/"([^"]*)"/g, '<span style="color:#16a34a">"$1"</span>');
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    result = result.replace(regex, '<span style="color:#9333ea">$1</span>');
  });
  result = result.replace(/(?<![#"])(\d+\.?\d*)(?!")/g, '<span style="color:#d97706">$1</span>');
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
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: activeTab === tab.id ? 500 : 400,
              color: '#ffffff',
              background: activeTab === tab.id ? '#f4f4f5' : 'transparent',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--text2)',
            background: '#f4f4f5',
            border: '1px solid #e4e4e7',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
            transition: 'background 150ms ease',
            zIndex: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre
          style={{
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 12,
            lineHeight: 1.6,
            color: '#ffffff',
            background: 'var(--bg)',
            border: '1px solid #e4e4e7',
            borderRadius: 6,
            padding: 12,
            paddingTop: 14,
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
