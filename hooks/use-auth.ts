'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_AGENT_ID = 'memos_agent_id';
const STORAGE_KEY_API_KEY = 'memos_api_key';
const STORAGE_KEY_ONBOARDING_COMPLETE = 'memos_onboarding_complete';
const STORAGE_KEY_IS_NEW_USER = 'memos_is_new_user';

export function useAuth() {
  const privyContext = usePrivy();

  const hasPrivy = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  const authenticated = hasPrivy ? privyContext.authenticated : false;
  const ready = hasPrivy ? privyContext.ready : true;
  const privyUser = hasPrivy ? privyContext.user : null;
  
  const login = hasPrivy 
    ? privyContext.login 
    : () => alert('Please add NEXT_PUBLIC_PRIVY_APP_ID to your .env.local to enable login.');
    
  const privyLogout = hasPrivy ? privyContext.logout : async () => {};
  const getAccessToken = hasPrivy ? privyContext.getAccessToken : async () => null;

  const [agentId, setAgentId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (agentId && apiKey) return;

    // Check sessionStorage first
    const cachedAgentId = sessionStorage.getItem(STORAGE_KEY_AGENT_ID);
    const cachedApiKey = sessionStorage.getItem(STORAGE_KEY_API_KEY);

    if (cachedAgentId && cachedApiKey) {
      setAgentId(cachedAgentId);
      setApiKey(cachedApiKey);
      setOnboardingComplete(sessionStorage.getItem(STORAGE_KEY_ONBOARDING_COMPLETE) === 'true');
      setIsNewUser(sessionStorage.getItem(STORAGE_KEY_IS_NEW_USER) === 'true');
      return;
    }

    // Provision via API
    let cancelled = false;

    async function provision() {
      setProvisioning(true);
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;

        const res = await fetch('/api/auth/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyToken: token }),
        });

        if (!res.ok) {
          console.error('[useAuth] Provision failed:', res.status);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        setAgentId(data.agentId);
        setApiKey(data.apiKey);
        setIsNewUser(data.isNewUser ?? false);
        setOnboardingComplete(data.onboardingComplete ?? false);

        sessionStorage.setItem(STORAGE_KEY_AGENT_ID, data.agentId);
        sessionStorage.setItem(STORAGE_KEY_API_KEY, data.apiKey);
        sessionStorage.setItem(STORAGE_KEY_ONBOARDING_COMPLETE, String(data.onboardingComplete ?? false));
        sessionStorage.setItem(STORAGE_KEY_IS_NEW_USER, String(data.isNewUser ?? false));
      } catch (err) {
        console.error('[useAuth] Provision error:', err);
      } finally {
        if (!cancelled) setProvisioning(false);
      }
    }

    provision();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, agentId, apiKey, getAccessToken]);

  const updateApiKey = useCallback((newKey: string) => {
    setApiKey(newKey);
    sessionStorage.setItem(STORAGE_KEY_API_KEY, newKey);
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyToken: token }),
      });

      if (res.ok) {
        setOnboardingComplete(true);
        setIsNewUser(false);
        sessionStorage.setItem(STORAGE_KEY_ONBOARDING_COMPLETE, 'true');
        sessionStorage.setItem(STORAGE_KEY_IS_NEW_USER, 'false');
      }
    } catch (err) {
      console.error('[useAuth] completeOnboarding error:', err);
    }
  }, [getAccessToken]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(STORAGE_KEY_AGENT_ID);
    sessionStorage.removeItem(STORAGE_KEY_API_KEY);
    sessionStorage.removeItem(STORAGE_KEY_ONBOARDING_COMPLETE);
    sessionStorage.removeItem(STORAGE_KEY_IS_NEW_USER);
    setAgentId(null);
    setApiKey(null);
    setIsNewUser(false);
    setOnboardingComplete(false);
    await privyLogout();
  }, [privyLogout]);

  return {
    isAuthenticated: authenticated,
    isLive: authenticated && !!agentId && !!apiKey,
    isLoading: !ready || provisioning,
    ready,
    privyUser,
    agentId,
    apiKey,
    isNewUser,
    onboardingComplete,
    login,
    logout,
    updateApiKey,
    getAccessToken,
    completeOnboarding,
  };
}
