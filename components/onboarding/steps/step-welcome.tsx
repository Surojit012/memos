'use client';

import { useState } from 'react';

interface StepWelcomeProps {
  agentId: string;
  apiKey: string;
  onContinue: () => void;
}

export function StepWelcome({ agentId, apiKey }: StepWelcomeProps) {
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopyAgent = () => {
    navigator.clipboard.writeText(agentId).catch(() => {});
    setCopiedAgent(true);
    setTimeout(() => setCopiedAgent(false), 1500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey).catch(() => {});
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const maskedKey = apiKey.length > 8
    ? apiKey.substring(0, 8) + '••••••••••••••••'
    : '••••••••••••••••';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 28, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', margin: '0 0 8px' }}>
          Your agent brain is ready.
        </h2>
        <p style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
          Here are your credentials. Save them — you&apos;ll need these to connect your code.
        </p>
      </div>

      {/* Agent ID box */}
      <div>
        <label style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', fontWeight: 500, display: 'block', marginBottom: 6 }}>
          Agent ID
        </label>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: 6, padding: 12 }}>
          <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono, Fira Code, monospace', color: '#18181b', wordBreak: 'break-all' }}>
            {agentId}
          </span>
          <button
            onClick={handleCopyAgent}
            aria-label="Copy agent ID"
            style={{
              fontSize: 11,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#71717a',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 4,
              padding: '4px 8px',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {copiedAgent ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* API Key box */}
      <div>
        <label style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', fontWeight: 500, display: 'block', marginBottom: 6 }}>
          API Key
        </label>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: 6, padding: 12, gap: 8 }}>
          <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono, Fira Code, monospace', color: '#18181b', wordBreak: 'break-all' }}>
            {revealed ? apiKey : maskedKey}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? 'Hide API key' : 'Reveal API key'}
              style={{
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#71717a',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: 4,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              {revealed ? 'Hide' : 'Reveal'}
            </button>
            <button
              onClick={handleCopyKey}
              aria-label="Copy API key"
              style={{
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#71717a',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: 4,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              {copiedKey ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#d97706', margin: '8px 0 0', lineHeight: 1.4 }}>
          This key is shown once in full here. You can always retrieve it from your profile.
        </p>
      </div>
    </div>
  );
}
