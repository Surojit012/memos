'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  publisher: string;
}

interface PipelineStep {
  id: string;
  skillId: string;
  skillName: string;
}

interface StepResult {
  stepNumber: number;
  skillId: string;
  skillName: string;
  input: string;
  output: string;
  duration: number;
}

interface PipelineResult {
  pipelineId: string;
  steps: StepResult[];
  finalOutput: string;
  totalDuration: number;
}

interface PipelineTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

/* ─── Constants ─── */

const SANDBOX_SKILLS: Skill[] = [
  { id: 'skill_001', name: 'Text Summarizer', description: 'Condenses long text into key points', category: 'productivity', price: 0, publisher: 'memos Team' },
  { id: 'skill_002', name: 'Sentiment Analyzer', description: 'Detects emotional tone in text', category: 'analysis', price: 0, publisher: 'memos Team' },
  { id: 'skill_003', name: 'Code Reviewer', description: 'Reviews code for bugs, style, and performance', category: 'development', price: 0.001, publisher: 'memos Team' },
  { id: 'skill_004', name: 'Memory Tagger', description: 'Auto-generates tags for memories', category: 'memory', price: 0.001, publisher: 'memos Team' },
];

/* ─── Component ─── */

export function PipelineTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: PipelineTabProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [initialInput, setInitialInput] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* ─── Load skills on mount ─── */
  useEffect(() => {
    if (!isLive) {
      setSkills([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/skills', { headers: authHeaders() });
        const data = await res.json();
        if (cancelled) return;
        const list: Skill[] = Array.isArray(data) ? data : data.skills ?? [];
        setSkills(list);
      } catch {
        if (!cancelled) setSkills([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isLive, authHeaders]);

  /* ─── Step management ─── */
  const addStep = () => {
    if (steps.length >= 5 || skills.length === 0) return;
    const defaultSkill = skills[0];
    setSteps((prev) => [...prev, { id: 'step_' + Date.now(), skillId: defaultSkill.id, skillName: defaultSkill.name }]);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStepSkill = (stepId: string, skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;
    setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, skillId: skill.id, skillName: skill.name } : s));
  };

  const toggleExpand = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) next.delete(stepNumber);
      else next.add(stepNumber);
      return next;
    });
  };

  /* ─── Run pipeline ─── */
  const handleRun = async () => {
    if (steps.length === 0 || !initialInput.trim()) return;

    setRunning(true);
    setResult(null);
    setError(null);
    setExpandedSteps(new Set());

    const endpoint = '/api/pipeline';
    const method = 'POST';
    const headers = authHeaders();
    const bodyPayload = {
      agentId: isLive ? agentId : 'demo_agent',
      steps: steps.map((s) => ({ skillId: s.skillId })),
      input: initialInput.trim(),
    };

    onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
    onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

    try {
      if (isLive) {
        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error ?? 'Pipeline execution failed';
          setError(errMsg);
          onResponseUpdate({ response: data, error: errMsg, isLoading: false, statusCode: res.status });
          return;
        }

        setResult(data as PipelineResult);
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const sandboxResult: PipelineResult = {
          pipelineId: 'pipe_sandbox_' + Date.now(),
          steps: steps.map((s, i) => ({
            stepNumber: i + 1,
            skillId: s.skillId,
            skillName: s.skillName,
            input: i === 0 ? initialInput : 'Output from step ' + i,
            output: s.skillName + ' processed: ' + (i === 0 ? initialInput.slice(0, 50) : 'previous output'),
            duration: 600 + Math.floor(Math.random() * 400),
          })),
          finalOutput: 'Final output from pipeline: processed through ' + steps.length + ' skills',
          totalDuration: steps.length * 800,
        };

        setResult(sandboxResult);
        onResponseUpdate({ response: sandboxResult, error: null, isLoading: false, statusCode: 200 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setRunning(false);
    }
  };

  /* ─── Render ─── */
  return (
    <div>
      {/* Step builder */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, i) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 60,
                  fontSize: 12,
                  fontFamily: 'var(--pg-mono)',
                  color: 'var(--pg-text3)',
                  flexShrink: 0,
                }}
              >
                Step {i + 1}
              </span>
              <select
                value={step.skillId}
                onChange={(e) => updateStepSkill(step.id, e.target.value)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--pg-sans)',
                  fontSize: 13,
                  color: 'var(--pg-text)',
                  background: 'transparent',
                  border: '1px solid var(--pg-border)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
              <button
                onClick={() => removeStep(step.id)}
                disabled={steps.length <= 1}
                style={{
                  fontSize: 16,
                  color: steps.length <= 1 ? 'var(--pg-border)' : 'var(--pg-text2)',
                  background: 'none',
                  border: 'none',
                  cursor: steps.length <= 1 ? 'not-allowed' : 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { if (steps.length > 1) e.currentTarget.style.color = '#C67867'; }}
                onMouseLeave={(e) => { if (steps.length > 1) e.currentTarget.style.color = 'var(--pg-text2)'; }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add step button */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={addStep}
            disabled={steps.length >= 5 || skills.length === 0}
            style={{
              fontSize: 13,
              fontFamily: 'var(--pg-sans)',
              color: steps.length >= 5 ? 'var(--pg-text3)' : 'var(--pg-text)',
              background: 'transparent',
              border: '1px solid var(--pg-border)',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: steps.length >= 5 ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { if (steps.length < 5) e.currentTarget.style.background = 'rgba(232,228,220,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            + Add Step
          </button>
          {steps.length >= 5 && (
            <span style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text3)' }}>
              (Maximum 5 steps)
            </span>
          )}
        </div>
      </div>

      {/* Starting input */}
      <div style={{ marginBottom: 12 }}>
        <label
          htmlFor="pipeline-input"
          style={{ display: 'block', fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 4 }}
        >
          Starting Input
        </label>
        <textarea
          id="pipeline-input"
          rows={2}
          value={initialInput}
          onChange={(e) => setInitialInput(e.target.value)}
          placeholder="Enter the starting input for the pipeline..."
          style={{
            width: '100%',
            fontFamily: 'var(--pg-sans)',
            fontSize: 13,
            color: 'var(--pg-text)',
            background: 'transparent',
            border: '1px solid var(--pg-border)',
            borderRadius: 6,
            padding: '8px 10px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pg-cyan-hi)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
        />
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={steps.length === 0 || !initialInput.trim() || running}
        style={{
          width: '100%',
          height: 40,
          fontSize: 14,
          fontFamily: 'var(--pg-sans)',
          fontWeight: 500,
          color: 'var(--pg-bg)',
          background: steps.length === 0 || !initialInput.trim() || running ? 'var(--pg-text2)' : 'var(--pg-text)',
          border: 'none',
          borderRadius: 6,
          cursor: steps.length === 0 || !initialInput.trim() || running ? 'not-allowed' : 'pointer',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { if (steps.length > 0 && initialInput.trim() && !running) e.currentTarget.style.background = 'var(--pg-cyan-hi)'; }}
        onMouseLeave={(e) => { if (steps.length > 0 && initialInput.trim() && !running) e.currentTarget.style.background = 'var(--pg-cyan)'; }}
      >
        {running ? 'Running...' : 'Run Pipeline'}
      </button>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: '#C67867', marginTop: 8 }}>
          {error}
        </p>
      )}

      {/* Results timeline */}
      {result && (
        <div style={{ marginTop: 20 }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '0 0 16px' }} />

          {result.steps.map((step, i) => {
            const isExpanded = expandedSteps.has(step.stepNumber);
            return (
              <div key={step.stepNumber}>
                {/* Step */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* Bullet */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pg-cyan)' }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)' }}>
                        Step {step.stepNumber} — {step.skillName}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text3)', flexShrink: 0 }}>
                        {step.duration}ms
                      </span>
                    </div>

                    {/* Truncated or expanded */}
                    {!isExpanded ? (
                      <>
                        <div style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 500, color: 'var(--pg-text3)' }}>Input: </span>{step.input}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 500, color: 'var(--pg-text3)' }}>Output: </span>{step.output}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', marginBottom: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          <span style={{ fontWeight: 500, color: 'var(--pg-text3)' }}>Input: </span>{step.input}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', marginBottom: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          <span style={{ fontWeight: 500, color: 'var(--pg-text3)' }}>Output: </span>{step.output}
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => toggleExpand(step.stepNumber)}
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--pg-sans)',
                        color: 'var(--pg-text2)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'color 150ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pg-text)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--pg-text2)'; }}
                    >
                      {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                    </button>
                  </div>
                </div>

                {/* Connector line */}
                {i < result.steps.length - 1 && (
                  <div style={{ width: 1, height: 16, background: 'var(--pg-border)', marginLeft: 3.5 }} />
                )}
              </div>
            );
          })}

          {/* Final output */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pg-text3)', marginBottom: 6, fontWeight: 500, fontFamily: 'var(--pg-sans)' }}>
              Final Output
            </div>
            <div
              style={{
                background: 'rgba(232,228,220,0.04)',
                borderRadius: 6,
                padding: 12,
                fontSize: 13,
                fontFamily: 'var(--pg-sans)',
                color: 'var(--pg-text)',
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              {result.finalOutput}
            </div>
            <div style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text3)' }}>
              Total: {result.totalDuration}ms
            </div>
          </div>

          {/* Run another */}
          <button
            onClick={() => setResult(null)}
            style={{
              width: '100%',
              height: 40,
              marginTop: 16,
              fontSize: 14,
              fontFamily: 'var(--pg-sans)',
              fontWeight: 500,
              color: 'var(--pg-text)',
              background: 'transparent',
              border: '1px solid var(--pg-border)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,228,220,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Run Another Pipeline
          </button>
        </div>
      )}
    </div>
  );
}
