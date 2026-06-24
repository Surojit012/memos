'use client';

interface ComposerLayoutProps {
  inputPanel: React.ReactNode;
  responsePanel: React.ReactNode;
  snippetsPanel: React.ReactNode;
  snippetsOpen: boolean;
  onCloseSnippets: () => void;
}

/**
 * Two-column composer: Input (58%) | Response (42%).
 * The snippets panel is a slide-in drawer overlaying the right column,
 * because "show me the curl" is a copy-out action, not a working surface.
 */
export function ComposerLayout({
  inputPanel,
  responsePanel,
  snippetsPanel,
  snippetsOpen,
  onCloseSnippets,
}: ComposerLayoutProps) {
  return (
    <>
      <div
        className="pg-composer"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.38fr) minmax(0, 1fr)',
          gap: 1,
          background: 'var(--pg-border)',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        <section
          aria-label="Input"
          style={{
            background: 'var(--pg-bg)',
            padding: '24px 28px 32px',
            overflowY: 'auto',
            minWidth: 0,
          }}
        >
          {inputPanel}
        </section>

        <section
          aria-label="Response"
          style={{
            background: 'var(--pg-bg)',
            padding: '24px 28px 32px',
            overflowY: 'auto',
            minWidth: 0,
            position: 'relative',
          }}
        >
          {responsePanel}
        </section>

        {/* Snippet drawer — overlays the response column. */}
        <div
          id="pg-snippets-drawer"
          role="dialog"
          aria-label="Code snippets"
          aria-hidden={!snippetsOpen}
          className={snippetsOpen ? 'pg-drawer pg-drawer-open' : 'pg-drawer'}
        >
          <div className="pg-drawer-head">
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--pg-text2)',
              }}
            >
              Copy as
            </span>
            <button
              type="button"
              onClick={onCloseSnippets}
              className="pg-btn pg-btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              aria-label="Close snippets"
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>{snippetsPanel}</div>
        </div>
      </div>

      <style>{`
        .pg-drawer {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          width: min(440px, 92%);
          background: #12161410;
          background: linear-gradient(180deg, rgba(20,24,22,0.98), rgba(15,18,16,0.98));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-left: 1px solid var(--pg-border);
          transform: translateX(100%);
          transition: transform 240ms cubic-bezier(0.32, 0.72, 0, 1);
          z-index: 20;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }
        .pg-drawer-open {
          transform: translateX(0);
          pointer-events: auto;
          box-shadow: -24px 0 60px -20px rgba(0,0,0,0.55);
        }
        .pg-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px 14px;
        }
        @media (max-width: 880px) {
          .pg-composer {
            grid-template-columns: 1fr !important;
            grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
          }
          .pg-drawer { width: 100%; }
        }
      `}</style>
    </>
  );
}
