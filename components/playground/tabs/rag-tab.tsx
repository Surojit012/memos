'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Types ─── */

interface Source {
  id: string;
  content: string;
  type: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isError?: boolean;
}

interface RagTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

/* ─── Constants ─── */

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hello! I'm your agent's memory interface. Ask me anything — I'll answer using stored memories and cite my sources.",
};

const SANDBOX_RESPONSES = [
  {
    answer: "Based on your agent's memories, you prefer Python over JavaScript for backend tasks. This was recorded as a high-importance semantic memory.",
    sources: [{ id: 'mem_demo_001', content: 'User prefers Python over JavaScript for backend tasks', type: 'semantic' }],
    confidence: 0.94,
  },
  {
    answer: 'Your agent remembers that you are building an AI coding assistant for TypeScript projects. Onboarding was completed on January 15th on the developer plan.',
    sources: [
      { id: 'mem_demo_004', content: 'User is building an AI coding assistant for TypeScript projects', type: 'semantic' },
      { id: 'mem_demo_002', content: 'Completed onboarding flow on January 15th, chose developer plan', type: 'episodic' },
    ],
    confidence: 0.89,
  },
];

/* ─── Source Pill with Tooltip ─── */

function SourcePill({ source }: { source: Source }) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          fontSize: 12,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          color: 'var(--text2)',
          background: '#f4f4f5',
          border: '1px solid #e4e4e7',
          borderRadius: 4,
          padding: '2px 8px',
          cursor: 'default',
        }}
      >
        {source.id.slice(0, 12)}
      </span>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            background: 'var(--surface)',
            border: '1px solid #e4e4e7',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#ffffff',
            lineHeight: 1.5,
            maxWidth: 280,
            width: 'max-content',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            zIndex: 10,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {source.content}
        </div>
      )}
    </span>
  );
}

/* ─── Component ─── */

export function RagTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: RagTabProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sandboxIndex, setSandboxIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* Auto-scroll */
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /* Clear conversation */
  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setSandboxIndex(0);
  };

  /* Send message */
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const endpoint = '/api/rag';
    const method = 'POST';
    const headers = authHeaders();
    const conversationHistory = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    const bodyPayload = {
      agentId: isLive ? agentId : 'demo_agent',
      query: trimmed,
      conversationHistory,
    };

    onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
    onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

    try {
      if (isLive) {
        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error ?? 'Request failed';
          const assistantMsg: Message = { role: 'assistant', content: errMsg, isError: true };
          setMessages((prev) => [...prev, assistantMsg]);
          onResponseUpdate({ response: data, error: errMsg, isLoading: false, statusCode: res.status });
          return;
        }

        const answer = data.answer || 'The agent found no relevant memories to answer this. Try adding more memories in the Memory tab.';
        const sources: Source[] = data.sources ?? [];
        const assistantMsg: Message = { role: 'assistant', content: answer, sources };
        setMessages((prev) => [...prev, assistantMsg]);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        // Sandbox
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const sandbox = SANDBOX_RESPONSES[sandboxIndex % SANDBOX_RESPONSES.length];
        setSandboxIndex((p) => p + 1);

        const assistantMsg: Message = { role: 'assistant', content: sandbox.answer, sources: sandbox.sources };
        setMessages((prev) => [...prev, assistantMsg]);
        onResponseUpdate({ response: sandbox, error: null, isLoading: false, statusCode: 200 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const assistantMsg: Message = { role: 'assistant', content: 'Request failed — check your connection.', isError: true };
      setMessages((prev) => [...prev, assistantMsg]);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setIsLoading(false);
    }
  };

  /* Enter to send */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ─── Render ─── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 460 }}>
      {/* Header with clear */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={handleClear}
          style={{
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--text2)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text2)'; }}
        >
          Clear conversation
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: 12,
          minHeight: 0,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? '#ffffff' : '#f4f4f5',
                color: msg.role === 'user' ? 'var(--surface)' : '#ffffff',
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.6,
                borderLeft: msg.isError ? '3px solid #dc2626' : 'none',
              }}
            >
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#a1a1aa',
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    Sources
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {msg.sources.map((src) => (
                      <SourcePill key={src.id} source={src} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                background: '#f4f4f5',
                color: '#a1a1aa',
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <span className="rag-loading-dots">
                <span className="rag-dot">.</span>
                <span className="rag-dot">.</span>
                <span className="rag-dot">.</span>
              </span>
              <style>{`
                .rag-loading-dots { display: inline-flex; gap: 1px; }
                .rag-dot {
                  animation: ragDotPulse 1.2s ease-in-out infinite;
                  font-size: 18px;
                  line-height: 1;
                }
                .rag-dot:nth-child(1) { animation-delay: 0ms; }
                .rag-dot:nth-child(2) { animation-delay: 200ms; }
                .rag-dot:nth-child(3) { animation-delay: 400ms; }
                @keyframes ragDotPulse {
                  0%, 80%, 100% { opacity: 0.3; }
                  40% { opacity: 1; }
                }
              `}</style>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid #e4e4e7',
          paddingTop: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask about your agent's memories..."
          style={{
            flex: 1,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: '#ffffff',
            background: 'var(--surface)',
            border: '1px solid #e4e4e7',
            borderRadius: 6,
            padding: '8px 10px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#ffffff'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            height: 40,
            padding: '0 16px',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            color: 'var(--surface)',
            background: !input.trim() || isLoading ? 'var(--text2)' : '#ffffff',
            border: 'none',
            borderRadius: 6,
            cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
            transition: 'background 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { if (input.trim() && !isLoading) e.currentTarget.style.background = '#27272a'; }}
          onMouseLeave={(e) => { if (input.trim() && !isLoading) e.currentTarget.style.background = '#ffffff'; }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
