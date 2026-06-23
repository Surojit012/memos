'use client';

import { useState, useCallback } from 'react';
import { AgentContextBar } from './agent-context-bar';
import { SidebarNav, MobileTabBar } from './sidebar-nav';
import { ThreePanelLayout } from './three-panel-layout';
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
  apiKey: string | null;
  onLogin: () => void;
  onLogout: () => void;
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
  apiKey,
  onLogin,
  onLogout,
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

  const handleRequestUpdate = useCallback((req: RequestState) => {
    setRequestState(req);
  }, []);

  const handleResponseUpdate = useCallback((res: ResponseState) => {
    setResponseState(res);
  }, []);

  /* Render tab content (input panel) */
  function renderTabContent(): React.ReactNode {
    switch (activeTab) {
      case 'memory':
        return (
          <MemoryTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'search':
        return (
          <SearchTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'rag':
        return (
          <RagTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'dream':
        return (
          <DreamTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            setActiveTab={setActiveTab}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'skills':
        return (
          <SkillsTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'pipeline':
        return (
          <PipelineTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'identity':
        return (
          <IdentityTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      case 'explorer':
        return (
          <ApiExplorerTab
            isLive={isLive}
            agentId={agentId}
            apiKey={apiKey}
            onRequestUpdate={handleRequestUpdate}
            onResponseUpdate={handleResponseUpdate}
          />
        );
      default:
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              color: '#a1a1aa',
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab — coming in a future phase.
          </div>
        );
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <AgentContextBar
        isLive={isLive}
        agentId={agentId}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Desktop sidebar */}
        <div className="playground-sidebar-desktop">
          <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            padding: 16,
            gap: 12,
          }}
        >
          {/* Mobile tab bar */}
          <div className="playground-sidebar-mobile" style={{ display: 'none' }}>
            <MobileTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <ThreePanelLayout
            inputLabel={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            inputPanel={renderTabContent()}
            requestPanel={
              <RequestPreviewPanel
                method={requestState.method}
                endpoint={requestState.endpoint}
                headers={requestState.headers}
                body={requestState.body}
                agentId={agentId}
                apiKey={apiKey}
              />
            }
            responsePanel={
              <ResponsePanel
                response={responseState.response}
                error={responseState.error}
                isLoading={responseState.isLoading}
                statusCode={responseState.statusCode}
              />
            }
          />
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .playground-sidebar-desktop { display: flex; }
          .playground-sidebar-mobile { display: none !important; }
        }
        @media (max-width: 767px) {
          .playground-sidebar-desktop { display: none !important; }
          .playground-sidebar-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}
