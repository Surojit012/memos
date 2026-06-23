'use client';

import { useState } from 'react';

interface StepInstallProps {
  onContinue: () => void;
}

export function StepInstall(_props: StepInstallProps) {
  const [lang, setLang] = useState<'python' | 'typescript'>('python');
  const [copied, setCopied] = useState(false);

  const installCmd = lang === 'python' ? 'pip install memos-py' : 'npm install memos';

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#ffffff', margin: '0 0 8px' }}>
          Install the SDK
        </h2>
        <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0 }}>
          Choose your language. Run the install command in your terminal.
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
              color: lang === l ? 'var(--surface)' : 'var(--text2)',
              background: lang === l ? '#ffffff' : 'var(--surface)',
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

      {/* Install command */}
      <div>
        <label style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', fontWeight: 500, display: 'block', marginBottom: 6 }}>
          {lang === 'python' ? 'Install via pip' : 'Install via npm'}
        </label>
        <div style={{ position: 'relative' }}>
          <pre
            style={{
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: 14,
              color: 'var(--surface)',
              background: '#ffffff',
              padding: 16,
              borderRadius: 8,
              margin: 0,
              overflowX: 'auto',
            }}
          >
            {installCmd}
          </pre>
          <button
            onClick={handleCopy}
            aria-label="Copy install command"
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
      </div>

      {/* Requirements */}
      <div>
        <label style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', fontWeight: 500, display: 'block', marginBottom: 6 }}>
          Requirements
        </label>
        <div style={{ background: '#f4f4f5', borderRadius: 6, padding: 12, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)', lineHeight: 1.6 }}>
          {lang === 'python' ? (
            <>
              Python 3.8+<br />
              No additional dependencies required
            </>
          ) : (
            <>
              Node.js 16+<br />
              Works with Next.js, Express, any runtime
            </>
          )}
        </div>
      </div>

      {/* PyPI note */}
      <div style={{ borderLeft: '3px solid #2563eb', padding: '10px 14px', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text2)', lineHeight: 1.5 }}>
        memos-py is published on PyPI. Run the install command above to get started.
      </div>
    </div>
  );
}
