'use client';

import { useState } from 'react';

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: 'memory', label: 'Memory' },
  { id: 'search', label: 'Search' },
  { id: 'rag', label: 'RAG Chat' },
  { id: 'dream', label: 'Dream' },
  { id: 'skills', label: 'Skills' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'identity', label: 'Identity' },
  { id: 'explorer', label: 'API Explorer' },
] as const;

export function SidebarNav({ activeTab, setActiveTab }: SidebarNavProps) {
  return (
    <nav
      style={{
        width: 220,
        minWidth: 220,
        borderRight: '1px solid #e4e4e7',
        background: 'var(--surface)',
        paddingTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 12,
              paddingRight: 12,
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: isActive ? 500 : 400,
              color: '#ffffff',
              background: isActive ? '#f4f4f5' : 'transparent',
              border: 'none',
              borderLeft: isActive ? '2px solid #18181b' : '2px solid transparent',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 150ms ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#f9f9f9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileTabBar({ activeTab, setActiveTab }: SidebarNavProps) {
  return (
    <div
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 6,
        padding: '8px 12px',
        borderBottom: '1px solid #e4e4e7',
        background: 'var(--surface)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              whiteSpace: 'nowrap',
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#ffffff' : 'var(--text2)',
              background: isActive ? '#f4f4f5' : 'transparent',
              border: '1px solid ' + (isActive ? 'var(--border)' : 'transparent'),
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 150ms ease',
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
