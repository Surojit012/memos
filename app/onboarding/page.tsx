'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';

export default function OnboardingPage() {
  const { isAuthenticated, isLoading, onboardingComplete, agentId, apiKey } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/?auth=required');
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect if already onboarded
  useEffect(() => {
    if (!isLoading && isAuthenticated && onboardingComplete) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, onboardingComplete, router]);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#fafafa',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: '2px solid #e4e4e7',
            borderTop: '2px solid #18181b',
            borderRadius: '50%',
            animation: 'onbSpin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes onbSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Don't render until redirect conditions are resolved
  if (!isAuthenticated || onboardingComplete || !agentId || !apiKey) {
    return null;
  }

  return (
    <OnboardingShell
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      agentId={agentId}
      apiKey={apiKey}
    />
  );
}
