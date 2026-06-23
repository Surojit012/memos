import React from 'react';

interface StatsCardProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function StatsCard({ title, children, isLoading, error, action }: StatsCardProps) {
  return (
    <div
      style={{
        border: '1px solid #e4e4e7',
        borderRadius: 8,
        background: 'var(--surface)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#a1a1aa',
            fontWeight: 500,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {title}
        </span>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#ffffff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#f4f4f5', borderRadius: 4, height: 16, width: '60%' }} className="skeleton-pulse" />
            <div style={{ background: '#f4f4f5', borderRadius: 4, height: 12, width: '40%' }} className="skeleton-pulse" />
            <div style={{ background: '#f4f4f5', borderRadius: 4, height: 12, width: '80%' }} className="skeleton-pulse" />
          </div>
        ) : error ? (
          <div>
            <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#dc2626', margin: '0 0 12px', lineHeight: 1.5 }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: '#ffffff',
                background: 'var(--surface)',
                border: '1px solid #e4e4e7',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
            >
              Retry
            </button>
          </div>
        ) : (
          children
        )}
      </div>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .skeleton-pulse {
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
