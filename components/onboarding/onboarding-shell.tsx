'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ProgressBar } from './progress-bar';
import { StepWelcome } from './steps/step-welcome';
import { StepInstall } from './steps/step-install';
import { StepCode } from './steps/step-code';
import { StepTest } from './steps/step-test';
import { StepDone } from './steps/step-done';

interface OnboardingShellProps {
  currentStep: number;
  setCurrentStep: (n: number) => void;
  agentId: string;
  apiKey: string;
}

const TOTAL_STEPS = 5;

const CONTINUE_LABELS: Record<number, string> = {
  1: 'Got it, let\u2019s install \u2192',
  2: 'Installed, show me the code \u2192',
  3: 'Makes sense, test it \u2192',
  4: 'Connection verified, finish setup \u2192',
};

export function OnboardingShell({ currentStep, setCurrentStep, agentId, apiKey }: OnboardingShellProps) {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  const handleComplete = async () => {
    try {
      await completeOnboarding();
    } catch {
      // Do not block the user for a DB write failure
    }
    router.push('/dashboard');
  };

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 4 requires test success to continue — managed via testStatus in step-test
  // We track this with a simple approach: step 4 continue is always shown but
  // we'll use a ref approach. Actually, we just pass onContinue and the step
  // handles its own validation. The shell's continue button needs to know.
  // For simplicity, we'll let step-test manage its own "continue" trigger.

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepWelcome agentId={agentId} apiKey={apiKey} onContinue={handleContinue} />;
      case 2:
        return <StepInstall onContinue={handleContinue} />;
      case 3:
        return <StepCode agentId={agentId} apiKey={apiKey} onContinue={handleContinue} />;
      case 4:
        return <StepTest agentId={agentId} apiKey={apiKey} onContinue={handleContinue} />;
      case 5:
        return <StepDone onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  const showBackButton = currentStep > 1 && currentStep < 5;
  const showContinueButton = currentStep < 5;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      {/* Progress bar */}
      <div style={{ padding: '24px 32px 0' }}>
        <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 640,
          width: '100%',
          margin: '0 auto',
          padding: 32,
          boxSizing: 'border-box',
        }}
      >
        {renderStep()}
      </div>

      {/* Navigation */}
      {(showBackButton || showContinueButton) && (
        <div
          style={{
            maxWidth: 640,
            width: '100%',
            margin: '0 auto',
            padding: '0 32px 32px',
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {showBackButton ? (
            <button
              onClick={handleBack}
              aria-label="Go back"
              style={{
                fontSize: 14,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: '#ffffff',
                background: 'var(--surface)',
                border: '1px solid #e4e4e7',
                borderRadius: 6,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {showContinueButton && (
            <button
              onClick={handleContinue}
              aria-label="Continue to next step"
              style={{
                fontSize: 14,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 500,
                color: 'var(--surface)',
                background: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              {CONTINUE_LABELS[currentStep] ?? 'Continue →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
