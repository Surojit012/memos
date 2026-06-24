'use client';

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: 'memory',   label: 'Memory',   glyph: '◉' },
  { id: 'search',   label: 'Search',   glyph: '⌕' },
  { id: 'rag',      label: 'RAG',      glyph: '✦' },
  { id: 'dream',    label: 'Dream',    glyph: '☾' },
  { id: 'skills',   label: 'Skills',   glyph: '⌬' },
  { id: 'pipeline', label: 'Pipeline', glyph: '⇶' },
  { id: 'identity', label: 'Identity', glyph: '⬢' },
  { id: 'explorer', label: 'Explorer', glyph: '⌘' },
] as const;

export function SidebarNav({ activeTab, setActiveTab }: SidebarNavProps) {
  return (
    <nav
      aria-label="Playground sections"
      style={{
        width: 64,
        minWidth: 64,
        background: 'transparent',
        borderRight: '1px solid var(--pg-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '14px 0',
        gap: 2,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className="pg-rail-item"
            data-active={isActive ? 'true' : 'false'}
            title={tab.label}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: 8,
                bottom: 8,
                width: 2,
                background: isActive ? 'var(--pg-cyan)' : 'transparent',
                borderRadius: 0,
              }}
            />
            <span style={{ fontSize: 18, lineHeight: 1, fontFamily: 'var(--pg-serif)' }}>
              {tab.glyph}
            </span>
            <span className="pg-rail-label">{tab.label}</span>
          </button>
        );
      })}

      <style>{`
        .pg-rail-item {
          position: relative;
          height: 48px;
          background: transparent;
          border: none;
          color: var(--pg-text2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 140ms ease, background 140ms ease;
        }
        .pg-rail-item:hover { color: var(--pg-text); background: rgba(232,228,220,0.03); }
        .pg-rail-item[data-active="true"] { color: var(--pg-text); }
        .pg-rail-label {
          position: absolute;
          left: 64px;
          top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: var(--pg-bg);
          border: 1px solid var(--pg-border);
          padding: 4px 10px;
          font-size: 12px;
          font-family: var(--pg-sans);
          color: var(--pg-text);
          border-radius: 4px;
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          transition: opacity 120ms ease, transform 120ms ease;
          z-index: 40;
        }
        .pg-rail-item:hover .pg-rail-label,
        .pg-rail-item:focus-visible .pg-rail-label {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
      `}</style>
    </nav>
  );
}

export function MobileTabBar({ activeTab, setActiveTab }: SidebarNavProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 4,
        padding: '10px 16px',
        borderBottom: '1px solid var(--pg-border)',
        background: 'var(--pg-bg)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              whiteSpace: 'nowrap',
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'var(--pg-sans)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--pg-text)' : 'var(--pg-text2)',
              background: isActive ? 'rgba(94,125,126,0.16)' : 'transparent',
              border: '1px solid ' + (isActive ? 'var(--pg-cyan)' : 'var(--pg-border)'),
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'all 140ms ease',
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
