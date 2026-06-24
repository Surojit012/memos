'use client';

interface ResponsePanelProps {
  response: object | null;
  error: string | null;
  isLoading: boolean;
  statusCode: number | null;
}

/* Warm-toned JSON syntax colouring — sage / rose / bone / mono. */
function highlightResponseJson(json: string): string {
  return json
    .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color:#8A9490">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span style="color:#7A9E8E">"$1"</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span style="color:#A67B73">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#74989a">$1</span>');
}

function StatusBadge({ code, ms }: { code: number; ms?: number }) {
  const isSuccess = code >= 200 && code < 300;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--pg-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: isSuccess ? 'var(--pg-green)' : 'var(--pg-danger)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isSuccess ? 'var(--pg-green)' : 'var(--pg-danger)',
        }}
      />
      {code} {code >= 200 && code < 300 ? 'OK' : ''}
      {typeof ms === 'number' && (
        <span style={{ color: 'var(--pg-text3)' }}>· {ms}ms</span>
      )}
    </span>
  );
}

export function ResponsePanel({ response, error, isLoading, statusCode }: ResponsePanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          minHeight: 22,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pg-text2)',
            fontFamily: 'var(--pg-sans)',
          }}
        >
          Response
        </span>
        {statusCode !== null && !isLoading && <StatusBadge code={statusCode} />}
      </div>

      {isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--pg-text2)',
            fontSize: 13,
          }}
        >
          <span className="pg-dot" />
          <span className="pg-dot" style={{ animationDelay: '160ms' }} />
          <span className="pg-dot" style={{ animationDelay: '320ms' }} />
          <span style={{ marginLeft: 6 }}>Awaiting response…</span>
          <style>{`
            .pg-dot {
              width: 6px; height: 6px; border-radius: 50%;
              background: var(--pg-cyan);
              display: inline-block;
              animation: pgDot 1.2s ease-in-out infinite;
            }
            @keyframes pgDot {
              0%,80%,100% { opacity: 0.25; transform: translateY(0); }
              40% { opacity: 1; transform: translateY(-2px); }
            }
          `}</style>
        </div>
      )}

      {!isLoading && error && (
        <div
          style={{
            border: '1px solid rgba(198,120,103,0.32)',
            borderRadius: 8,
            padding: 14,
            background: 'rgba(198,120,103,0.05)',
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontFamily: 'var(--pg-sans)',
              color: 'var(--pg-danger)',
              margin: '0 0 8px',
            }}
          >
            {error}
          </p>
        </div>
      )}

      {!isLoading && !error && response === null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            alignItems: 'flex-start',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--pg-text3)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--pg-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--pg-text2)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Nothing yet.
          </p>
          <p style={{ fontSize: 13, margin: 0, color: 'var(--pg-text3)' }}>
            Press <span className="pg-kbd">⌘↵</span> to run the request and see the result here.
          </p>
        </div>
      )}

      {!isLoading && response && (
        <pre
          style={{
            fontFamily: 'var(--pg-mono)',
            fontSize: 12.5,
            lineHeight: 1.65,
            color: 'var(--pg-text)',
            background: 'rgba(232,228,220,0.02)',
            border: '1px solid var(--pg-border)',
            borderRadius: 8,
            padding: 16,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}
          dangerouslySetInnerHTML={{
            __html: highlightResponseJson(JSON.stringify(response, null, 2)),
          }}
        />
      )}
    </div>
  );
}
