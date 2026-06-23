'use client';

interface ResponsePanelProps {
  response: object | null;
  error: string | null;
  isLoading: boolean;
  statusCode: number | null;
}

function highlightResponseJson(json: string): string {
  return json
    .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color:#2563eb">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span style="color:#16a34a">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#d97706">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#9333ea">$1</span>');
}

function StatusBadge({ code }: { code: number }) {
  const isSuccess = code >= 200 && code < 300;
  return (
    <span
      style={{
        fontSize: 12,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        color: isSuccess ? '#16a34a' : '#dc2626',
        background: isSuccess ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 6,
        padding: '2px 8px',
        display: 'inline-block',
        marginBottom: 12,
      }}
    >
      {code}
    </span>
  );
}

export function ResponsePanel({ response, error, isLoading, statusCode }: ResponsePanelProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          gap: 6,
        }}
      >
        <span className="response-dot response-dot-1" />
        <span className="response-dot response-dot-2" />
        <span className="response-dot response-dot-3" />
        <style>{`
          .response-dot {
            width: 8px;
            height: 8px;
            background: #a1a1aa;
            border-radius: 50%;
            animation: dotPulse 1.2s ease-in-out infinite;
          }
          .response-dot-1 { animation-delay: 0ms; }
          .response-dot-2 { animation-delay: 200ms; }
          .response-dot-3 { animation-delay: 400ms; }
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid #dc2626',
          borderRadius: 6,
          padding: 12,
        }}
      >
        {statusCode !== null && <StatusBadge code={statusCode} />}
        <p
          style={{
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#dc2626',
            margin: 0,
            marginBottom: 8,
          }}
        >
          {error}
        </p>
        <pre
          style={{
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 12,
            color: '#dc2626',
            background: '#fef2f2',
            borderRadius: 4,
            padding: 8,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error}
        </pre>
      </div>
    );
  }

  if (response === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#a1a1aa',
            textAlign: 'center',
          }}
        >
          Run a request to see the response here
        </p>
      </div>
    );
  }

  const formatted = JSON.stringify(response, null, 2);
  const highlighted = highlightResponseJson(formatted);

  return (
    <div>
      {statusCode !== null && <StatusBadge code={statusCode} />}
      <pre
        style={{
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          fontSize: 12,
          lineHeight: 1.6,
          color: '#18181b',
          background: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: 6,
          padding: 12,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
