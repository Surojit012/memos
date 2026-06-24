'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AgentContextBar } from './agent-context-bar';
import { SidebarNav, MobileTabBar } from './sidebar-nav';
import { ComposerLayout } from './composer-layout';
import { CommandBar } from './command-bar';
import { RequestPreviewPanel } from './request-preview-panel';
import { ResponsePanel } from './response-panel';
import { MemoryTab } from './tabs/memory-tab';
import { SearchTab } from './tabs/search-tab';
import { RagTab } from './tabs/rag-tab';
import { DreamTab } from './tabs/dream-tab';
import { SkillsTab } from './tabs/skills-tab';
import { PipelineTab } from './tabs/pipeline-tab';
import { IdentityTab } from './tabs/identity-tab';
import { ApiExplorerTab } from './tabs/api-explorer-tab';

interface PlaygroundShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLive: boolean;
  agentId: string | null;
  agentName: string | null;
  apiKey: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onRename: () => void;
}

interface RequestState {
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  body: object | null;
}

interface ResponseState {
  response: object | null;
  error: string | null;
  isLoading: boolean;
  statusCode: number | null;
}

export function PlaygroundShell({
  activeTab,
  setActiveTab,
  isLive,
  agentId,
  agentName,
  apiKey,
  onLogin,
  onLogout,
  onRename,
}: PlaygroundShellProps) {
  const [requestState, setRequestState] = useState<RequestState>({
    method: 'POST',
    endpoint: '/api/memory',
    headers: { 'Content-Type': 'application/json' },
    body: null,
  });

  const [responseState, setResponseState] = useState<ResponseState>({
    response: null,
    error: null,
    isLoading: false,
    statusCode: null,
  });

  const [snippetsOpen, setSnippetsOpen] = useState(false);

  const inputColRef = useRef<HTMLDivElement | null>(null);

  const handleRequestUpdate = useCallback((req: RequestState) => {
    setRequestState(req);
  }, []);

  const handleResponseUpdate = useCallback((res: ResponseState) => {
    setResponseState(res);
  }, []);

  // Run = submit the primary form inside the active tab, or click its
  // primary action button. Keeps each tab's logic untouched.
  const runActiveTab = useCallback(() => {
    const root = inputColRef.current;
    if (!root) return;

    const form = root.querySelector('form') as HTMLFormElement | null;
    if (form) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      return;
    }
    const btn = root.querySelector<HTMLButtonElement>(
      'button[type="submit"], button[data-pg-run="true"], button.pg-primary-action'
    );
    if (btn && !btn.disabled) btn.click();
  }, []);

  // Cmd/Ctrl + Enter from anywhere in the canvas runs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runActiveTab();
      }
      if (e.key === 'Escape' && snippetsOpen) {
        setSnippetsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runActiveTab, snippetsOpen]);

  // When user switches tabs, close the snippets drawer.
  useEffect(() => { setSnippetsOpen(false); }, [activeTab]);

  function renderTabContent(): React.ReactNode {
    const common = {
      isLive,
      agentId,
      apiKey,
      onRequestUpdate: handleRequestUpdate,
      onResponseUpdate: handleResponseUpdate,
    };
    switch (activeTab) {
      case 'memory':   return <MemoryTab {...common} />;
      case 'search':   return <SearchTab {...common} />;
      case 'rag':      return <RagTab {...common} />;
      case 'dream':    return <DreamTab {...common} setActiveTab={setActiveTab} />;
      case 'skills':   return <SkillsTab {...common} />;
      case 'pipeline': return <PipelineTab {...common} />;
      case 'identity': return <IdentityTab {...common} />;
      case 'explorer': return <ApiExplorerTab {...common} />;
      default:
        return (
          <div style={{ color: 'var(--pg-text2)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
            {activeTab} — coming soon.
          </div>
        );
    }
  }

  const canRun = useMemo(() => true, []);

  return (
    <div
      data-pg
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--pg-bg)',
      }}
    >
      <AgentContextBar
        isLive={isLive}
        agentId={agentId}
        agentName={agentName}
        onLogin={onLogin}
        onLogout={onLogout}
        onRename={onRename}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div className="playground-sidebar-desktop">
          <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            background: 'var(--pg-bg)',
          }}
        >
          <div className="playground-sidebar-mobile" style={{ display: 'none' }}>
            <MobileTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <CommandBar
            method={requestState.method}
            endpoint={requestState.endpoint}
            isLoading={responseState.isLoading}
            canRun={canRun}
            onRun={runActiveTab}
            onToggleSnippets={() => setSnippetsOpen((p) => !p)}
            snippetsOpen={snippetsOpen}
          />

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ComposerLayout
              snippetsOpen={snippetsOpen}
              onCloseSnippets={() => setSnippetsOpen(false)}
              inputPanel={<div ref={inputColRef}>{renderTabContent()}</div>}
              responsePanel={
                <ResponsePanel
                  response={responseState.response}
                  error={responseState.error}
                  isLoading={responseState.isLoading}
                  statusCode={responseState.statusCode}
                />
              }
              snippetsPanel={
                <RequestPreviewPanel
                  method={requestState.method}
                  endpoint={requestState.endpoint}
                  headers={requestState.headers}
                  body={requestState.body}
                  agentId={agentId}
                  apiKey={apiKey}
                />
              }
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 880px) {
          .playground-sidebar-desktop { display: flex; }
          .playground-sidebar-mobile { display: none !important; }
        }
        @media (max-width: 879px) {
          .playground-sidebar-desktop { display: none !important; }
          .playground-sidebar-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}
