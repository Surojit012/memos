'use client';

import { useState } from 'react';

interface StepCodeProps {
  agentId: string;
  apiKey: string;
  onContinue: () => void;
}

const PYTHON_CODE = (agentId: string, apiKey: string) => `from memos_py import MemosClient

client = MemosClient(
    api_key="${apiKey}",
    agent_id="${agentId}",
    base_url="https://memos.io"
)

# Store a memory
client.store_memory(
    content="User prefers concise answers",
    type="semantic",
    importance=4
)

# Retrieve with context
response = client.query(
    question="What does this user prefer?",
    include_sources=True
)
print(response['answer'])`;

const TS_CODE = (agentId: string, apiKey: string) => `import { MemosClient } from 'memos'

const client = new MemosClient({
  apiKey: '${apiKey}',
  agentId: '${agentId}',
  baseUrl: 'https://memos.io'
})

// Store a memory
await client.storeMemory({
  content: 'User prefers concise answers',
  type: 'semantic',
  importance: 4
})

// Retrieve with context
const response = await client.query({
  question: 'What does this user prefer?',
  includeSources: true
})
console.log(response.answer)`;

export function StepCode({ agentId, apiKey }: StepCodeProps) {
  const [lang, setLang] = useState<'python' | 'typescript'>('python');
  const [copied, setCopied] = useState(false);

  const code = lang === 'python' ? PYTHON_CODE(agentId, apiKey) : TS_CODE(agentId, apiKey);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', margin: '0 0 8px' }}>
          Connect your agent
        </h2>
        <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0 }}>
          Paste this snippet into your project. Your real credentials are pre-filled.
        </p>
      </div>

      {/* Language toggle */}
      <div style={{ display: 'flex', gap: 0 }}>
        {(['python', 'typescript'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: lang === l ? '#ffffff' : '#71717a',
              background: lang === l ? '#18181b' : '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: l === 'python' ? '6px 0 0 6px' : '0 6px 6px 0',
              padding: '6px 16px',
              cursor: 'pointer',
              borderLeft: l === 'typescript' ? 'none' : undefined,
            }}
          >
            {l === 'python' ? 'Python' : 'TypeScript'}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div style={{ position: 'relative' }}>
        <pre
          style={{
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 13,
            lineHeight: 1.6,
            color: '#ffffff',
            background: '#18181b',
            padding: 16,
            borderRadius: 8,
            margin: 0,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {code}
        </pre>
        <button
          onClick={handleCopy}
          aria-label="Copy code snippet"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#a1a1aa',
            background: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Note */}
      <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
        Keep your API key private. Never commit it to version control. Use environment variables in production.
      </p>
    </div>
  );
}
