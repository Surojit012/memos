'use client';

import { useEffect, useRef, useState } from 'react';

interface AgentNameModalProps {
  open: boolean;
  mode: 'onboard' | 'rename';
  currentName: string | null;
  agentId: string | null;
  /** Persists the name. Should resolve true on success, or throw with a message. */
  onSave: (name: string) => Promise<boolean>;
  /** Dismiss without saving. In onboard mode this keeps the opaque ID as-is. */
  onClose: () => void;
}

export function AgentNameModal({ open, mode, currentName, agentId, onSave, onClose }: AgentNameModalProps) {
  const [name, setName] = useState(currentName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset local state each time the modal opens.
  useEffect(() => {
    if (open) {
      setName(currentName ?? '');
      setError(null);
      // Focus shortly after mount so the field is ready to type into.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, currentName]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Give your agent a name.'); return; }
    setSaving(true);
    try {
      const ok = await onSave(name.trim());
      if (ok) onClose();
    } catch (err) {
      setError((err as Error).message || 'Could not save the name.');
    } finally {
      setSaving(false);
    }
  }

  const isOnboard = mode === 'onboard';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isOnboard ? 'Name your agent' : 'Rename your agent'}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'rgba(7, 9, 8, 0.66)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'pgModalFade 160ms ease',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--pg-bg)',
          border: '1px solid var(--pg-border)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          animation: 'pgModalRise 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--pg-serif)',
            fontStyle: 'italic',
            fontSize: 30,
            lineHeight: 1.1,
            color: 'var(--pg-text)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {isOnboard ? 'Name your agent' : 'Rename your agent'}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--pg-text2)', lineHeight: 1.6, margin: '10px 0 0' }}>
          {isOnboard
            ? 'Give your agent a friendly name. It’s just a label — your keys and API calls keep using the same agent ID underneath.'
            : 'Change the display label. This doesn’t affect your agent ID, keys, or stored memories.'}
        </p>

        <label htmlFor="agent-name-input" style={{ display: 'block', fontSize: 12, color: 'var(--pg-text2)', margin: '22px 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Display name
        </label>
        <input
          id="agent-name-input"
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="homeboy, research-bot, my-agent…"
          maxLength={120}
          style={{
            width: '100%',
            fontFamily: 'var(--pg-sans)',
            fontSize: 15,
            color: 'var(--pg-text)',
            background: 'rgba(232,228,220,0.03)',
            border: '1px solid var(--pg-border)',
            borderRadius: 9,
            padding: '11px 13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {agentId && (
          <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--pg-text3)' }}>
            Agent ID stays{' '}
            <span style={{ fontFamily: 'var(--pg-mono)', color: 'var(--pg-text2)' }}>{agentId}</span>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--pg-danger)', fontSize: 13, margin: '14px 0 0' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 26 }}>
          <button type="button" onClick={onClose} className="pg-btn pg-btn-ghost" disabled={saving}>
            {isOnboard ? 'Skip for now' : 'Cancel'}
          </button>
          <button type="submit" className="pg-btn pg-btn-primary" disabled={saving || !name.trim()} style={{ minWidth: 116, justifyContent: 'center' }}>
            {saving ? 'Saving…' : isOnboard ? 'Name agent' : 'Save name'}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes pgModalFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pgModalRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"], [role="dialog"] form { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
