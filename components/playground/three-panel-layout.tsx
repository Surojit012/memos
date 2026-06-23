'use client';

import { useState } from 'react';

interface ThreePanelLayoutProps {
  inputPanel: React.ReactNode;
  requestPanel: React.ReactNode;
  responsePanel: React.ReactNode;
  inputLabel?: string;
  requestLabel?: string;
  responseLabel?: string;
}

const panelHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#a1a1aa',
  marginBottom: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
};

const panelStyle: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: 8,
  background: 'var(--surface)',
  padding: 16,
  overflowY: 'auto',
  minHeight: 500,
};

export function ThreePanelLayout({
  inputPanel,
  requestPanel,
  responsePanel,
  inputLabel = 'Input',
  requestLabel = 'Request Preview',
  responseLabel = 'Response',
}: ThreePanelLayoutProps) {
  const [showRequest, setShowRequest] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const toggleButtonStyle: React.CSSProperties = {
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: 'var(--text2)',
    background: '#f4f4f5',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    marginTop: 8,
    transition: 'background 150ms ease',
  };

  return (
    <>
      {/* Desktop layout */}
      <div
        className="playground-desktop-panels"
        style={{
          display: 'flex',
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Input Panel */}
        <div style={{ ...panelStyle, flex: 1 }}>
          <div style={panelHeaderStyle}>{inputLabel}</div>
          {inputPanel}
        </div>

        {/* Request Preview Panel */}
        <div style={{ ...panelStyle, width: 320, minWidth: 320, maxWidth: 320 }}>
          <div style={panelHeaderStyle}>{requestLabel}</div>
          {requestPanel}
        </div>

        {/* Response Panel */}
        <div style={{ ...panelStyle, flex: 1 }}>
          <div style={panelHeaderStyle}>{responseLabel}</div>
          {responsePanel}
        </div>
      </div>

      {/* Mobile layout */}
      <div
        className="playground-mobile-panels"
        style={{ display: 'none', flexDirection: 'column', gap: 12 }}
      >
        {/* Input Panel — always visible */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>{inputLabel}</div>
          {inputPanel}
        </div>

        {/* Request Preview — toggle */}
        <button
          style={toggleButtonStyle}
          onClick={() => setShowRequest((p) => !p)}
        >
          {showRequest ? 'Hide Request' : 'Show Request'}
        </button>
        {showRequest && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>{requestLabel}</div>
            {requestPanel}
          </div>
        )}

        {/* Response — toggle */}
        <button
          style={toggleButtonStyle}
          onClick={() => setShowResponse((p) => !p)}
        >
          {showResponse ? 'Hide Response' : 'Show Response'}
        </button>
        {showResponse && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>{responseLabel}</div>
            {responsePanel}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .playground-desktop-panels { display: flex !important; }
          .playground-mobile-panels { display: none !important; }
        }
        @media (max-width: 767px) {
          .playground-desktop-panels { display: none !important; }
          .playground-mobile-panels { display: flex !important; }
        }
      `}</style>
    </>
  );
}
