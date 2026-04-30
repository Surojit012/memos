'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATS = ['Support', 'Development', 'Analytics', 'Research', 'Productivity', 'Writing', 'Code', 'Finance', 'General']

export default function PublishSkillPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', category: 'General', prompt: '',
    inputLabel: '', outputLabel: '', price: '0.001',
    publisherName: '', publisherAgentId: '', publisherAddress: '', tags: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function showToast(msg: string, type: 'success' | 'error') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          inputLabel: form.inputLabel || 'Your input',
          outputLabel: form.outputLabel || 'Result',
          publisherAgentId: form.publisherAgentId || `agent_${form.publisherName.toLowerCase().replace(/\s+/g, '_')}`,
          publisherAddress: form.publisherAddress.trim(),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      showToast('Skill published on 0G ✓', 'success')
      setTimeout(() => router.push('/skills'), 1400)
    } catch (e: any) { showToast(e.message, 'error') } finally { setLoading(false) }
  }

  return (
    <>
      <nav className="nav flex items-center justify-between px-6 lg:px-8 py-4 border-b border-[#2A302C] bg-[rgba(15,18,16,0.9)] backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-display text-xl font-bold text-[#5E7D7E] tracking-tight">
          Memory<span className="text-[#5A6460] font-normal">OS</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/skills" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">← Skills</Link>
        </div>
      </nav>

      <div className="page" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 80 }}>
        <div className="mb-12">
          <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tight text-[#F4F1EE] mb-4">Agent Skill Registry</h1>
          <p className="text-[#8A9490] text-lg max-w-2xl leading-relaxed">
            Register a skill workflow so other agents can discover and call it via semantic search. Stored permanently on 0G Storage with a verifiable hash.
          </p>
        </div>

        <div className="bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 mb-12">
          <div className="font-mono text-[10px] text-[#5A6460] uppercase tracking-widest mb-6">Autonomous Publishing (API)</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Agents can self-publish skills programmatically using the OpenClaw SDK:
          </div>
          <pre className="code-block" style={{ margin: 0, padding: 16, background: 'var(--bg0)' }}>{`const skill = await agent.skills.publish({
  name: "Stock Analyzer",
  description: "Analyzes sentiment and risks for a given ticker.",
  price: 0.005, // OG Tokens
  payoutAddress: "0xYourWalletAddress"
});
// Skill is now live on the 0G network and indexed in MemoryOS`}</pre>
        </div>

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Skill Name *</label>
              <input className="form-input" placeholder="Stock Analyzer" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <input className="form-input" placeholder="One sentence: what does this skill do?" value={form.description} onChange={e => set('description', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">System Prompt * — the brain of your skill</label>
            <textarea className="form-textarea" style={{ minHeight: 130 }}
              placeholder="You are an expert stock analyst. Given a company name or ticker, return: current sentiment, key risks, and a one-line recommendation."
              value={form.prompt} onChange={e => set('prompt', e.target.value)} required />
            <div className="form-hint">This is the instruction the AI follows when running your skill. Be specific.</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Input Label</label>
              <input className="form-input" placeholder="Enter company name or ticker" value={form.inputLabel} onChange={e => set('inputLabel', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Output Label</label>
              <input className="form-input" placeholder="Analysis Report" value={form.outputLabel} onChange={e => set('outputLabel', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price (OG per run) *</label>
              <input className="form-input" type="number" step="0.0001" min="0" placeholder="0.001" value={form.price} onChange={e => set('price', e.target.value)} required />
              <div className="form-hint">You keep 95%. MemoryOS takes 5% platform fee.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Publisher Name</label>
              <input className="form-input" placeholder="YourAgentName" value={form.publisherName} onChange={e => set('publisherName', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Your Agent ID</label>
              <input className="form-input" placeholder="agent_your_id" value={form.publisherAgentId} onChange={e => set('publisherAgentId', e.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: 13 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Payout Wallet</label>
              <input className="form-input" placeholder="0x... payout address" value={form.publisherAddress} onChange={e => set('publisherAddress', e.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: 13 }} />
              <div className="form-hint">Required for paid skills so on-chain payouts reach the publisher wallet.</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input className="form-input" placeholder="finance, analysis, stocks" value={form.tags} onChange={e => set('tags', e.target.value)} />
            </div>
            <div className="form-group" />
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            <span className="text-[#5E7D7E] text-[10px] font-mono border border-[#5E7D7E]/20 bg-[#5E7D7E]/5 px-4 py-2 rounded-full">⬡ Stored on 0G Storage with verifiable hash</span>
            <span className="text-[#5A6460] text-[10px] font-mono">Agent ID registered on 0G network</span>
          </div>

          <button type="submit" className="w-full bg-[#5E7D7E] text-white py-4 rounded-2xl font-bold text-base hover:scale-[1.01] transition-all shadow-lg shadow-[#5E7D7E]/10" disabled={loading}>
            {loading ? <><span className="spinner" /> Publishing to 0G...</> : 'Publish Skill →'}
          </button>
        </form>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
