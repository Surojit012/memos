'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSkillPayment } from '@/hooks/use-skill-payment';

/* ─── Types ─── */

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string | number;
  prompt?: string;
  publisher?: string;
  publisherName?: string;
  publisherAgentId?: string;
  publisherAddress?: string;
  tags?: string[];
}

interface ExecutionResult {
  result: string;
  model?: string;
  tokensUsed?: number;
  computeProvider?: string;
}

interface SkillsTabProps {
  isLive: boolean;
  agentId: string | null;
  apiKey: string | null;
  onRequestUpdate: (req: { method: string; endpoint: string; headers: Record<string, string>; body: object | null }) => void;
  onResponseUpdate: (res: { response: object | null; error: string | null; isLoading: boolean; statusCode: number | null }) => void;
}

type View = 'marketplace' | 'mine';

interface SkillForm {
  name: string;
  description: string;
  category: string;
  prompt: string;
  price: string;
  publisherAddress: string;
  tags: string;
}

const EMPTY_FORM: SkillForm = { name: '', description: '', category: '', prompt: '', price: '0', publisherAddress: '', tags: '' };

/* ─── Constants ─── */

const SANDBOX_SKILLS: Skill[] = [
  { id: 'skill_001', name: 'Text Summarizer', description: 'Condenses long text into key points', category: 'productivity', price: 0, publisherName: 'memos Team' },
  { id: 'skill_002', name: 'Sentiment Analyzer', description: 'Detects emotional tone in text', category: 'analysis', price: 0, publisherName: 'memos Team' },
  { id: 'skill_003', name: 'Code Reviewer', description: 'Reviews code for bugs, style, and performance', category: 'development', price: 0.001, publisherName: 'memos Team' },
  { id: 'skill_004', name: 'Memory Tagger', description: 'Auto-generates tags for memories', category: 'memory', price: 0.001, publisherName: 'memos Team' },
];

/* ─── Helpers ─── */

const priceNum = (s: Skill) => parseFloat(String(s.price)) || 0;
const isOwned = (s: Skill, agentId: string | null) => !!agentId && s.publisherAgentId === agentId;

/* ─── Component ─── */

export function SkillsTab({ isLive, agentId, apiKey, onRequestUpdate, onResponseUpdate }: SkillsTabProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [inputText, setInputText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);

  // On-chain payment driver (Privy wallet → 0G escrow contract).
  const { payForSkill, hasWallet } = useSkillPayment();

  // A payment that's been MADE on-chain but whose execution hasn't succeeded
  // yet, keyed by skillId. The backend keeps such a txHash reserved-not-consumed
  // and releases it on execution failure — so on retry we reuse the same paid
  // tx instead of charging the user a second time. Cleared once execution
  // succeeds (the payment is then consumed) or the tx is rejected as already used.
  const paidTxRef = useRef<Record<string, string>>({});

  // Marketplace vs. My Skills + publish/edit form
  const [view, setView] = useState<View>('marketplace');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SkillForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canPublish = isLive && !!agentId && !!apiKey;

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  }, [apiKey]);

  /* ─── Load skills ─── */
  const loadSkills = useCallback(async () => {
    if (!isLive) {
      setSkills([]);
      return;
    }
    setLoadingSkills(true);
    try {
      const res = await fetch('/api/skills', { cache: 'no-store' });
      const data = await res.json();
      const list: Skill[] = Array.isArray(data) ? data : data.skills ?? [];
      setSkills(list);
    } catch {
      setSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  }, [isLive]);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  /* ─── Execute skill ─── */
  const handleExecute = async () => {
    if (!selectedSkill || !inputText.trim()) return;

    setExecuting(true);
    setExecResult(null);
    setError(null);
    setPayStatus(null);

    const endpoint = '/api/execute';
    const method = 'POST';
    const headers = authHeaders();
    const skillId = selectedSkill.id;
    const isPaid = priceNum(selectedSkill) > 0;

    const bodyPayload: {
      agentId: string | null;
      skillId: string;
      userInput: string;
      paymentProof?: { txHash: string };
    } = {
      agentId: isLive ? agentId : 'demo_agent',
      skillId,
      userInput: inputText.trim(),
    };

    try {
      if (isLive) {
        // ── Paid skills: pay on-chain first, then attach the proof. ──
        if (isPaid) {
          if (!hasWallet) {
            const msg = 'Connect a wallet to pay for this skill.';
            setError(msg);
            onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
            return;
          }
          try {
            // Reuse a prior paid-but-unconsumed tx for this skill if we have one
            // (e.g. the last execution failed) so the user isn't charged twice.
            let txHash = paidTxRef.current[skillId];
            if (!txHash) {
              txHash = await payForSkill(skillId, setPayStatus);
              paidTxRef.current[skillId] = txHash;
            } else {
              setPayStatus('Reusing your previous payment…');
            }
            bodyPayload.paymentProof = { txHash };
          } catch (payErr) {
            const msg = payErr instanceof Error ? payErr.message : 'Payment failed.';
            setError(msg);
            onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
            return;
          }
        }

        setPayStatus(isPaid ? 'Running the skill…' : null);
        onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
        onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });

        const res = await fetch(endpoint, { method, headers, body: JSON.stringify(bodyPayload) });
        const data = await res.json();

        if (!res.ok) {
          // 409 = this payment was already consumed; the cached tx is dead, so
          // a retry must pay again. Drop it. Any other failure keeps the tx
          // cached (the backend released its reservation) for a free retry.
          if (res.status === 409) delete paidTxRef.current[skillId];
          const errMsg = data.error ?? 'Execution failed';
          setError(errMsg);
          onResponseUpdate({ response: data, error: errMsg, isLoading: false, statusCode: res.status });
          return;
        }

        // Success — the payment is now consumed; forget the tx.
        delete paidTxRef.current[skillId];
        setExecResult({
          result: data.output ?? 'No output returned.',
          model: data.model,
          tokensUsed: data.tokensUsed,
          computeProvider: data.computeProvider,
        });
        onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      } else {
        onRequestUpdate({ method, endpoint, headers, body: bodyPayload });
        onResponseUpdate({ response: null, error: null, isLoading: true, statusCode: null });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const sandboxResult: ExecutionResult = {
          result: 'Simulated result from ' + selectedSkill.name + ': your input has been processed. In live mode this would use the configured LLM provider.',
          model: 'sandbox-mock',
          tokensUsed: 142,
          computeProvider: 'sandbox',
        };
        setExecResult(sandboxResult);
        onResponseUpdate({ response: sandboxResult, error: null, isLoading: false, statusCode: 200 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      onResponseUpdate({ response: null, error: msg, isLoading: false, statusCode: null });
    } finally {
      setExecuting(false);
      setPayStatus(null);
    }
  };

  /* ─── Publish / Edit ─── */
  const openPublish = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      prompt: skill.prompt ?? '',
      price: String(skill.price ?? '0'),
      publisherAddress: skill.publisherAddress && skill.publisherAddress !== '0x0000000000000000000000000000000000000000' ? skill.publisherAddress : '',
      tags: (skill.tags ?? []).join(', '),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim() || !form.prompt.trim()) {
      setFormError('Name and prompt are required.');
      return;
    }
    const price = (parseFloat(form.price) || 0).toString();
    if (parseFloat(price) > 0 && !/^0x[a-fA-F0-9]{40}$/.test(form.publisherAddress.trim())) {
      setFormError('Paid skills need a valid payout wallet address (0x…).');
      return;
    }

    setSaving(true);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const isEdit = !!editingId;
    const endpoint = '/api/skills';
    const method = isEdit ? 'PUT' : 'POST';
    const body: Record<string, unknown> = {
      agentId,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim() || 'General',
      prompt: form.prompt.trim(),
      price,
      tags,
    };
    if (parseFloat(price) > 0) body.publisherAddress = form.publisherAddress.trim();
    if (isEdit) body.skillId = editingId;

    onRequestUpdate({ method, endpoint, headers: authHeaders(), body });

    try {
      const res = await fetch(endpoint, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to save skill.');
        onResponseUpdate({ response: data, error: data.error ?? 'Failed', isLoading: false, statusCode: res.status });
        return;
      }
      onResponseUpdate({ response: data, error: null, isLoading: false, statusCode: res.status });
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setView('mine');
      await loadSkills();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Derived lists ─── */
  const mySkills = skills.filter((s) => isOwned(s, agentId));
  const visibleSkills = view === 'mine' ? mySkills : skills;

  /* ─── Render: loading ─── */
  if (loadingSkills) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--pg-text3)', fontSize: 13, fontFamily: 'var(--pg-sans)' }}>
        Loading skills...
      </div>
    );
  }

  const tabBtn = (v: View, label: string): React.CSSProperties => ({
    fontSize: 13,
    fontFamily: 'var(--pg-sans)',
    fontWeight: 500,
    color: view === v ? 'var(--pg-bg)' : 'var(--pg-text2)',
    background: view === v ? 'var(--pg-text)' : 'transparent',
    border: '1px solid var(--pg-border)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  });

  return (
    <div>
      {/* ─── Toolbar: view toggle + publish ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" style={tabBtn('marketplace', 'Marketplace')} onClick={() => { setView('marketplace'); setFormOpen(false); }}>
          Marketplace
        </button>
        <button type="button" style={tabBtn('mine', 'My Skills')} onClick={() => { setView('mine'); setFormOpen(false); }}>
          My Skills{mySkills.length > 0 ? ` · ${mySkills.length}` : ''}
        </button>
        <div style={{ marginLeft: 'auto' }}>
          {canPublish ? (
            <button
              type="button"
              onClick={openPublish}
              style={{
                fontSize: 13, fontFamily: 'var(--pg-sans)', fontWeight: 500,
                color: 'var(--pg-bg)', background: 'var(--pg-cyan)',
                border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pg-cyan-hi)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--pg-cyan)'; }}
            >
              + Publish Skill
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--pg-text3)', fontFamily: 'var(--pg-sans)' }}>
              Log in to publish skills
            </span>
          )}
        </div>
      </div>

      {/* ─── Publish / Edit form ─── */}
      {formOpen && (
        <div style={{ border: '1px solid var(--pg-border)', borderRadius: 10, padding: 16, marginBottom: 16, background: 'rgba(232,228,220,0.02)' }}>
          <div style={{ fontSize: 14, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 12 }}>
            {editingId ? 'Edit skill' : 'Publish a new skill'}
          </div>

          <FormField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Invoice Parser" />
          <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What this skill does, in one line" />
          <FormField label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="e.g. Finance" />
          <FormField
            label="Prompt (the skill's system instruction)"
            value={form.prompt}
            onChange={(v) => setForm({ ...form, prompt: v })}
            placeholder="You are an expert at... Given the user's input, return..."
            textarea
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FormField label="Price (OG)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="0" />
            </div>
            <div style={{ flex: 2 }}>
              <FormField
                label={`Payout wallet ${parseFloat(form.price) > 0 ? '(required)' : '(paid skills only)'}`}
                value={form.publisherAddress}
                onChange={(v) => setForm({ ...form, publisherAddress: v })}
                placeholder="0x…"
                disabled={!(parseFloat(form.price) > 0)}
              />
            </div>
          </div>
          <FormField label="Tags (comma-separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="finance, parsing" />

          {formError && (
            <p style={{ fontSize: 13, color: '#C67867', fontFamily: 'var(--pg-sans)', margin: '4px 0 10px' }}>{formError}</p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1, height: 38, fontSize: 14, fontFamily: 'var(--pg-sans)', fontWeight: 500,
                color: 'var(--pg-bg)', background: saving ? 'var(--pg-text2)' : 'var(--pg-text)',
                border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setEditingId(null); setFormError(null); }}
              style={{
                height: 38, padding: '0 16px', fontSize: 14, fontFamily: 'var(--pg-sans)',
                color: 'var(--pg-text2)', background: 'transparent', border: '1px solid var(--pg-border)',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Empty state for My Skills ─── */}
      {!formOpen && view === 'mine' && mySkills.length === 0 && (
        <div style={{ border: '1px dashed var(--pg-border)', borderRadius: 10, padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--pg-serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--pg-text2)', margin: 0 }}>
            No published skills yet.
          </p>
          <p style={{ fontSize: 13, color: 'var(--pg-text3)', marginTop: 8, fontFamily: 'var(--pg-sans)' }}>
            {canPublish ? 'Hit “Publish Skill” to add your first one to the marketplace.' : 'Log in to publish your own skills.'}
          </p>
        </div>
      )}

      {/* ─── Skill grid ─── */}
      {!formOpen && !(view === 'mine' && mySkills.length === 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          {visibleSkills.map((skill) => {
            const isSelected = selectedSkill?.id === skill.id;
            const owned = isOwned(skill, agentId);
            const free = priceNum(skill) === 0;
            return (
              <div
                key={skill.id}
                style={{
                  textAlign: 'left',
                  border: isSelected ? '2px solid var(--pg-cyan)' : '1px solid var(--pg-border)',
                  borderRadius: 8, padding: 14, background: 'transparent',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <button
                  onClick={() => { setSelectedSkill(skill); setExecResult(null); setError(null); }}
                  style={{ textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                >
                  <span style={{ fontSize: 14, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)' }}>
                    {skill.name}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', marginTop: 4, lineHeight: 1.4 }}>
                    {skill.description}
                  </span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', background: 'rgba(232,228,220,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                    {skill.category}
                  </span>
                  {owned && (
                    <span style={{ fontSize: 11, fontFamily: 'var(--pg-sans)', color: '#7A9E8E', background: 'rgba(122,158,142,0.12)', borderRadius: 4, padding: '2px 6px' }}>
                      yours
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: free ? '#7A9E8E' : 'var(--pg-text2)', marginLeft: 'auto' }}>
                    {free ? 'Free' : `${skill.price} OG`}
                  </span>
                  {owned && (
                    <button
                      onClick={() => openEdit(skill)}
                      style={{ fontSize: 11, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text2)', background: 'transparent', border: '1px solid var(--pg-border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Execution panel ─── */}
      {!formOpen && selectedSkill && (
        <div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--pg-border)', margin: '0 0 12px' }} />

          <div style={{ fontSize: 14, fontFamily: 'var(--pg-sans)', fontWeight: 500, color: 'var(--pg-text)', marginBottom: 8 }}>
            {selectedSkill.name}
          </div>

          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your input for this skill..."
            style={{
              width: '100%', fontFamily: 'var(--pg-sans)', fontSize: 13, color: 'var(--pg-text)',
              background: 'transparent', border: '1px solid var(--pg-border)', borderRadius: 6,
              padding: '8px 10px', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              marginBottom: 8, transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pg-cyan-hi)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
          />

          {priceNum(selectedSkill) > 0 && isLive && (
            <div style={{ border: '1px solid rgba(166,123,115,0.4)', background: 'rgba(166,123,115,0.08)', borderRadius: 6, padding: 10, marginBottom: 8, fontSize: 13, fontFamily: 'var(--pg-sans)', color: '#A67B73' }}>
              This skill costs <strong>{selectedSkill.price} testnet OG</strong> per execution, paid on-chain to the 0G Galileo <strong>testnet</strong> escrow contract. No real funds — get test tokens from the 0G faucet.
              {paidTxRef.current[selectedSkill.id] && (
                <div style={{ marginTop: 4, color: 'var(--pg-text3)' }}>
                  You already paid for a run that didn’t complete — your next execution reuses it, no extra charge.
                </div>
              )}
              {!hasWallet && (
                <div style={{ marginTop: 4, color: '#C67867' }}>
                  No wallet connected — log in with a wallet to pay.
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={executing || !inputText.trim() || (priceNum(selectedSkill) > 0 && isLive && !hasWallet)}
            style={{
              width: '100%', height: 40, fontSize: 14, fontFamily: 'var(--pg-sans)', fontWeight: 500,
              color: 'var(--pg-bg)', background: executing || !inputText.trim() ? 'var(--pg-text2)' : 'var(--pg-text)',
              border: 'none', borderRadius: 6, cursor: executing || !inputText.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { if (!executing && inputText.trim()) e.currentTarget.style.background = 'var(--pg-cyan-hi)'; }}
            onMouseLeave={(e) => { if (!executing && inputText.trim()) e.currentTarget.style.background = 'var(--pg-text)'; }}
          >
            {executing
              ? (payStatus ?? 'Executing…')
              : priceNum(selectedSkill) > 0 && isLive
                ? `Pay ${selectedSkill.price} OG & Execute`
                : 'Execute Skill'}
          </button>

          {error && (
            <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: '#C67867', marginTop: 8 }}>{error}</p>
          )}

          {execResult && (
            <div style={{ marginTop: 12, background: 'rgba(232,228,220,0.04)', borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pg-text3)', marginBottom: 6, fontWeight: 500, fontFamily: 'var(--pg-sans)' }}>
                Result:
              </div>
              <p style={{ fontSize: 13, fontFamily: 'var(--pg-sans)', color: 'var(--pg-text)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {execResult.result}
              </p>
              {(execResult.model || execResult.tokensUsed != null) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 11, fontFamily: 'var(--pg-mono)', color: 'var(--pg-text3)' }}>
                  {execResult.model && <span>model: {execResult.model}</span>}
                  {execResult.computeProvider && <span>via: {execResult.computeProvider}</span>}
                  {execResult.tokensUsed != null && <span>{execResult.tokensUsed} tokens</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Reusable form field ─── */

function FormField({
  label, value, onChange, placeholder, textarea, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  disabled?: boolean;
}) {
  const shared: React.CSSProperties = {
    width: '100%', fontFamily: 'var(--pg-sans)', fontSize: 13,
    color: disabled ? 'var(--pg-text3)' : 'var(--pg-text)',
    background: 'transparent', border: '1px solid var(--pg-border)', borderRadius: 6,
    padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 150ms ease',
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pg-text3)', marginBottom: 4, fontWeight: 500, fontFamily: 'var(--pg-sans)' }}>
        {label}
      </label>
      {textarea ? (
        <textarea
          rows={4}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...shared, resize: 'vertical' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pg-cyan-hi)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
        />
      ) : (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={shared}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pg-cyan-hi)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pg-border)'; }}
        />
      )}
    </div>
  );
}
