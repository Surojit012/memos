'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div>
      <div
        style={{
          width: '100%',
          height: 4,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: '#ffffff',
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#a1a1aa',
          marginTop: 6,
        }}
      >
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
