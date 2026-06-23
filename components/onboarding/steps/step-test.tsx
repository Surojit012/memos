'use client';

import { useState } from 'react';

interface StepTestProps {
  agentId: string;
  apiKey: string;
  onContinue: () => void;
}

type TestStatus = 'idle' | 'running' | 'success' | 'error';

export function StepTest({ agentId, apiKey }: StepTestProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const handleTest = async () => {
    setTestStatus('running');
    setTestResult(null);
    setTestError(null);
    setShowJson(false);

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          agentId,
          content: 'memos onboarding test — connection verified',
          type: 'episodic',
          importance: 1,
          tags: ['onboarding', 'test'],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTestStatus('success');
        setTestResult(data as Record<string, unknown>);
      } else {
        setTestStatus('error');
        setTestError((data as Record<string, string>)?.error ?? 'Connection failed');
      }
    } catch {
      setTestStatus('error');
      setTestError('Connection failed');
    }
  };

  const handleReset = () => {
    setTestStatus('idle');
    setTestResult(null);
    setTestError(null);
    setShowJson(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', margin: '0 0 8px' }}>
          Test your connection
        </h2>
        <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0 }}>
          Let&apos;s make a real API call to confirm everything is working.
        </p>
      </div>

      {/* Idle state */}
      {testStatus === 'idle' && (
        <>
          <div style={{ background: '#f4f4f5', borderRadius: 6, padding: 12, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', lineHeight: 1.5 }}>
            This will store a test memory in your agent to verify the connection.
          </div>
          <button
            onClick={handleTest}
            aria-label="Run connection test"
            style={{
              width: '100%',
              height: 44,
              fontSize: 14,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#ffffff',
              background: '#18181b',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Run Connection Test
          </button>
        </>
      )}

      {/* Running state */}
      {testStatus === 'running' && (
        <>
          <button
            disabled
            style={{
              width: '100%',
              height: 44,
              fontSize: 14,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#ffffff',
              background: '#71717a',
              border: 'none',
              borderRadius: 6,
              cursor: 'not-allowed',
            }}
          >
            Testing...
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
            <span className="onb-dot onb-dot-1" />
            <span className="onb-dot onb-dot-2" />
            <span className="onb-dot onb-dot-3" />
            <style>{`
              .onb-dot {
                width: 8px; height: 8px; background: #a1a1aa; border-radius: 50%;
                animation: onbDotPulse 1.2s ease-in-out infinite;
              }
              .onb-dot-1 { animation-delay: 0ms; }
              .onb-dot-2 { animation-delay: 200ms; }
              .onb-dot-3 { animation-delay: 400ms; }
              @keyframes onbDotPulse {
                0%, 80%, 100% { opacity: 0.3; }
                40% { opacity: 1; }
              }
            `}</style>
          </div>
          <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', textAlign: 'center', margin: 0 }}>
            Making a real API call to your agent...
          </p>
        </>
      )}

      {/* Success state */}
      {testStatus === 'success' && (
        <>
          <div style={{ background: '#dcfce7', border: '1px solid #16a34a', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#16a34a', margin: '0 0 4px' }}>
              ✓ Connection successful
            </p>
            <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#166534', margin: 0 }}>
              Your agent received the test memory.
            </p>
          </div>

          {testResult && (
            <div>
              <button
                onClick={() => setShowJson((v) => !v)}
                aria-label={showJson ? 'Hide response JSON' : 'View response JSON'}
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#71717a',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showJson ? 'Hide response ▲' : 'View response ▼'}
              </button>
              {showJson && (
                <pre
                  style={{
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: '#18181b',
                    background: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    borderRadius: 6,
                    padding: 12,
                    marginTop: 8,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              )}
            </div>
          )}

          <button
            onClick={handleTest}
            aria-label="Test again"
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#18181b',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Test again
          </button>
        </>
      )}

      {/* Error state */}
      {testStatus === 'error' && (
        <>
          <div style={{ background: '#fef2f2', border: '1px solid #dc2626', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#dc2626', margin: '0 0 4px' }}>
              ✗ Connection failed
            </p>
            {testError && (
              <p style={{ fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#991b1b', margin: '0 0 12px' }}>
                {testError}
              </p>
            )}
            <ul style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Check that your API key is correct</li>
              <li>Make sure the memos service is reachable</li>
              <li>Try refreshing and logging in again</li>
            </ul>
          </div>
          <button
            onClick={handleReset}
            aria-label="Try again"
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#18181b',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 6,
              padding: '8px 14px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
