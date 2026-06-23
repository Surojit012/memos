'use client';

import { useRouter } from 'next/navigation';

interface StepDoneProps {
  onComplete: () => void;
}

export function StepDone({ onComplete }: StepDoneProps) {
  const router = useRouter();

  const cards: { title: string; subtext: string; onClick: () => void }[] = [
    {
      title: 'Explore the Playground',
      subtext: 'Try every feature interactively — memory, search, RAG, dreams, skills.',
      onClick: () => router.push('/playground'),
    },
    {
      title: 'Go to your Dashboard',
      subtext: 'Monitor your agent\'s memory health, dreams, and storage status.',
      onClick: () => onComplete(),
    },
    {
      title: 'Read the docs',
      subtext: 'Full API reference, SDK guides, and integration examples.',
      onClick: () => window.open('https://docs.memos.io', '_blank', 'noopener'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 28, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#ffffff', margin: '0 0 8px' }}>
          You&apos;re all set.
        </h2>
        <p style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', margin: 0 }}>
          Your agent brain is live. Start building.
        </p>
      </div>

      {/* Next-step cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            aria-label={card.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              border: '1px solid #e4e4e7',
              borderRadius: 8,
              padding: 16,
              background: 'var(--surface)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f9f9f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <span style={{ fontSize: 15, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, color: '#ffffff' }}>
              {card.title}
            </span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginTop: 4, lineHeight: 1.4 }}>
              {card.subtext}
            </span>
          </button>
        ))}
      </div>

      {/* Primary action */}
      <button
        onClick={onComplete}
        aria-label="Open Dashboard"
        style={{
          width: '100%',
          height: 44,
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          color: 'var(--surface)',
          background: '#ffffff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Open Dashboard →
      </button>
    </div>
  );
}
