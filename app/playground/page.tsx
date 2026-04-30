'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPublic0GNetworkConfig } from '@/lib/0g-network'
import { Memory, Skill, PlatformStats, AgentIdentity } from '@/lib/types'

const TYPE_ICONS = { episodic: '⏱', semantic: '◈', procedural: '⟳' }
const PUBLIC_0G = getPublic0GNetworkConfig()

function Dots({ n }: { n: number }) {
  return <div className="importance">{[1,2,3,4,5].map(i => <div key={i} className={`dot ${i<=n?'dot-on':'dot-off'}`}/>)}</div>
}

export default function Home() {
  const [stats, setStats] = useState<PlatformStats>({ totalMemories:0, totalSkills:0, totalAgents:0, totalExecutions:0, totalReads:0, platformRevenue:0 })
  const [skills, setSkills] = useState<Skill[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [agents, setAgents] = useState<AgentIdentity[]>([])
  const [tab, setTab] = useState<'write'|'read'|'search'>('write')
  const [agentId, setAgentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [form, setForm] = useState({ type:'semantic', content:'', tags:'', importance:'3' })
  const [zerogStatus, setZerogStatus] = useState<{state:'checking'|'live'|'offline'; registry?:{total:number}}>({ state:'checking' })

  useEffect(() => {
    fetch('/api/status').then(r=>r.json()).then(d=>{
      setZerogStatus({
        state: d.configured ? 'live' : 'offline',
        registry: d.registry,
      })
    }).catch(()=>setZerogStatus({ state:'offline' }))
  }, [])
  const [searchQ, setSearchQ] = useState('')
  const [result, setResult] = useState<Memory[]>([])
  const [searchMethod, setSearchMethod] = useState<string>('')

  function showToast(msg:string, type:'success'|'error') { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [s, sk, a] = await Promise.all([
      fetch('/api/memory', { cache: 'no-store' }).then(r=>r.json()),
      fetch('/api/skills', { cache: 'no-store' }).then(r=>r.json()),
      fetch('/api/identity', { cache: 'no-store' }).then(r=>r.json()),
    ])
    setStats(s)
    setSkills(sk.skills?.slice(0,4) ?? [])
    const loadedAgents = a.agents ?? []
    setAgents(loadedAgents)
    
    let currentAgentId = agentId
    if (!currentAgentId && loadedAgents.length > 0) {
      currentAgentId = loadedAgents[0].agentId
      setAgentId(currentAgentId)
    }

    if (currentAgentId) {
      const m = await fetch(`/api/memory?agentId=${currentAgentId}&limit=6`, { cache: 'no-store' }).then(r=>r.json())
      setMemories(m.memories ?? [])
    }
    
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 8 seconds while any memory has a pending hash
  useEffect(() => {
    const interval = setInterval(() => {
      const hasPending = memories.some(m => !m.storageHash?.startsWith('0x'))
      if (hasPending) load()
    }, 8000)
    return () => clearInterval(interval)
  }, [memories, load])

  async function writeMemory(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ agentId, type:form.type, content:form.content, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean), importance:parseInt(form.importance) }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      showToast('Memory stored on 0G ✓', 'success')
      setForm({ type:'semantic', content:'', tags:'', importance:'3' })
      load()
    } catch(e:any) { showToast(e.message,'error') } finally { setLoading(false) }
  }

  async function readMem() {
    setLoading(true)
    const r = await fetch(`/api/memory?agentId=${agentId}`)
    const d = await r.json()
    setResult(d.memories ?? [])
    setLoading(false)
  }

  async function searchMem() {
    if (!searchQ.trim()) return
    setLoading(true)
    try {
      const r = await fetch('/api/search', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({agentId, query:searchQ}) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setResult(d.memories ?? [])
      setSearchMethod(d.searchMethod || '')
    } catch (e: any) {
      showToast(e.message, 'error')
      setResult([])
    } finally {
      setLoading(false)
    }
  }

  async function deleteMem(id:string) {
    await fetch(`/api/memory/${id}?agentId=${agentId}`, {method:'DELETE'})
    showToast('Memory forgotten','success')
    setMemories(p=>p.filter(m=>m.id!==id))
    setResult(p=>p.filter(m=>m.id!==id))
  }

  return (
    <>
      <nav className="nav flex items-center justify-between px-6 lg:px-8 py-4 border-b border-[#2A302C] bg-[rgba(15,18,16,0.9)] backdrop-blur-md sticky top-0 z-50">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/" className="font-display text-xl font-bold text-[#5E7D7E] tracking-tight">
            Memory<span className="text-[#5A6460] font-normal">OS</span>
          </Link>
          <span style={{fontFamily:'var(--mono)',fontSize:10,padding:'3px 10px',borderRadius:20,
            background: zerogStatus.state==='live' ? 'rgba(122,158,142,0.1)' : zerogStatus.state==='checking' ? 'rgba(166,123,115,0.1)' : 'rgba(194,112,101,0.1)',
            color: zerogStatus.state==='live' ? '#7A9E8E' : zerogStatus.state==='checking' ? '#A67B73' : '#C27065',
            border: zerogStatus.state==='live' ? '1px solid rgba(122,158,142,0.25)' : '1px solid rgba(166,123,115,0.2)',
          }}>
            {zerogStatus.state==='live'
              ? `⬡ 0G Live · ${PUBLIC_0G.label}${zerogStatus.registry?.total ? ` · ${zerogStatus.registry.total} items persisted` : ''}`
              : zerogStatus.state==='checking' ? '⬡ connecting...' : '⬡ 0G offline'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/playground" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Playground</Link>
          <Link href="/skills" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Skills</Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Dashboard</Link>
          <Link href="/skills/publish" className="bg-[#5E7D7E] text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 hover:bg-[#6E8D8E]">
            + Publish Skill
          </Link>
        </div>
      </nav>

      <main className="page">
        {/* Hero */}
        <div className="hero py-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#5E7D7E]/20 bg-[#5E7D7E]/5 text-[#5E7D7E] text-xs font-mono mb-8">
            <div className="pulse"/>LIVE ON 0G NETWORK · TRACK 1 + TRACK 3
          </div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tight mb-8">
            The <span className="text-[#5E7D7E]">memory</span> +<br/>
            <span className="text-[#7A9E8E]">skills</span> <span className="text-[#8A9490]">layer for</span> agents
          </h1>
          <p className="text-[#8A9490] text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            Middleware that any OpenClaw agent plugs into. Persistent memory on 0G Storage. Skills marketplace with on-chain payments. Semantic search via 0G Compute.
          </p>
          <div className="hero-actions flex justify-center gap-4">
            <a href="#memory" className="bg-[#5E7D7E] text-white px-8 py-3.5 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-[#5E7D7E]/10">
              Try Memory API →
            </a>
            <Link href="/skills" className="px-8 py-3.5 rounded-full border border-[#2A302C] text-[#8A9490] hover:text-[#F4F1EE] hover:border-[#5E7D7E] transition-all font-bold text-sm">
              Browse Skills
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          {loading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="stat skeleton-box" style={{height: 70, minWidth: 120, border: 'none'}} />
            ))
          ) : (
            [
              { v: stats.totalMemories, l: 'Memories', c: '#7A9E8E' },
              { v: stats.totalSkills,   l: 'Skills',   c: '#5E7D7E' },
              { v: stats.totalAgents,   l: 'Agents',   c: '#8B6F66' },
              { v: stats.totalExecutions, l: 'Skill Runs', c: '#A67B73' },
              { v: stats.platformRevenue.toFixed(4)+' OG', l: 'Platform Revenue', c: '#C27065' },
            ].map(s => (
              <div key={s.l} className="stat border-r border-[#2A302C] last:border-r-0">
                <div className="stat-value font-display text-2xl font-bold mb-1" style={{color:s.c}}>{s.v}</div>
                <div className="stat-label font-mono text-[10px] text-[#5A6460] uppercase tracking-wider">{s.l}</div>
              </div>
            ))
          )}
        </div>

        {/* Memory Playground */}
        <div id="memory" style={{marginBottom:56}}>
          <div className="section-header">
            <div className="section-title">Memory API Playground</div>
            <span className="section-sub">LIVE — real API calls to 0G Storage</span>
          </div>
          <div className="box">
            <div className="form-group">
              <label className="form-label">Agent ID</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {agents.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>No agents registered yet. Use the Dashboard to register one.</span>
                ) : (
                  agents.map(a => (
                    <button key={a.agentId} className="btn" onClick={() => { setAgentId(a.agentId); setResult([]) }}
                      style={{
                        padding:'5px 12px', fontSize:11, fontFamily:'var(--mono)',
                        background: agentId===a.agentId ? '#1F2623' : 'transparent',
                        color: agentId===a.agentId ? '#F4F1EE' : '#5A6460',
                        border: `1px solid ${agentId===a.agentId ? '#3D4540' : '#2A302C'}`,
                        borderRadius: '20px'
                      }}>
                      {a.name}
                    </button>
                  ))
                )}
              </div>
              <div className="form-hint" style={{marginTop:6}}>
                {agentId}
              </div>
            </div>
            <div className="tabs mb-8 flex gap-2 p-1 bg-[#151A17] border border-[#2A302C] rounded-2xl w-fit">
              {(['write','read','search'] as const).map(t=>(
                <button key={t} className={`px-6 py-2.5 rounded-xl transition-all font-mono text-xs ${tab===t?'bg-[#1F2623] text-white border border-[#3D4540] shadow-inner':'text-[#5A6460] hover:text-[#8A9490]'}`} onClick={()=>{setTab(t);setResult([]);setSearchMethod('')}}>
                  {t==='write'?'✦ Write':t==='read'?'◈ Read':'⌕ Semantic Search'}
                </button>
              ))}
            </div>

            {tab==='write' && (
              <form onSubmit={writeMemory}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                      <option value="episodic">Episodic — something that happened</option>
                      <option value="semantic">Semantic — a fact or preference</option>
                      <option value="procedural">Procedural — how to do something</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Importance (1–5)</label>
                    <input className="form-input" type="number" min={1} max={5} value={form.importance} onChange={e=>setForm(f=>({...f,importance:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea className="form-textarea" placeholder="User hates spicy food and always asks for mild options..." value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input className="form-input" placeholder="user, food, preference" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}/>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                  <button type="submit" className="bg-[#5E7D7E] text-white px-8 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-[#5E7D7E]/10" disabled={loading}>
                    {loading?<><span className="spinner"/> Storing on 0G...</>:'Store Memory →'}
                  </button>
                  <span className="text-[#5E7D7E] text-[10px] font-mono border border-[#5E7D7E]/20 bg-[#5E7D7E]/5 px-3 py-1.5 rounded-full">⬡ Uploaded to 0G Storage with verifiable hash</span>
                </div>
              </form>
            )}

            {tab==='read' && (
              <div>
                <button className="bg-[#5E7D7E] text-white px-8 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-[#5E7D7E]/10 mb-8" onClick={readMem} disabled={loading}>
                  {loading?<><span className="spinner"/> Loading from 0G...</>:'Fetch Memories →'}
                </button>
                {loading && (
                  <div className="memory-grid">
                    {[1,2,3].map(i => <div key={i} className="memory-card skeleton-box" style={{height: 120, border: 'none'}} />)}
                  </div>
                )}
                {!loading && result.length>0 && (
                  <div className="memory-grid">
                    {result.map(m=>(
                      <div key={m.id} className={`memory-card ${m.type}`}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span className={`type-pill type-${m.type}`}>{TYPE_ICONS[m.type]} {m.type}</span>
                          <div style={{display:'flex',alignItems:'center',gap:8}}><Dots n={m.importance}/><button className="btn btn-danger" style={{padding:'2px 8px',fontSize:10}} onClick={()=>deleteMem(m.id)}>forget</button></div>
                        </div>
                        <div style={{fontSize:13,color:'var(--text)',lineHeight:1.6}}>{m.content}</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{m.tags.map(t=><span key={t} className="skill-tag">#{t}</span>)}</div>
                        <div style={{paddingTop:8,borderTop:'1px solid var(--border)'}}>
                          {m.storageHash?.startsWith('0x') ? (
                            <a href={`${PUBLIC_0G.storageExplorerBase}/${m.storageHash}`} target='_blank' rel='noreferrer' className='hash-live'>
                              ⬡ {m.storageHash?.slice(0,26)}... ↗
                            </a>
                          ) : (
                            <span className='hash-pending'>⬡ uploading to 0G Storage...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab==='search' && (
              <div>
                <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                  <input className="form-input" style={{flex:1,minWidth:200}} placeholder="food preferences, deployment steps, trading strategy..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchMem()}/>
                  <button className="btn btn-primary" onClick={searchMem} disabled={loading}>
                    {loading?<><span className="spinner"/> Searching...</>:'Semantic Search →'}
                  </button>
                </div>
                {searchMethod && (
                  <div className="mb-6">
                    <span className="text-[#5E7D7E] text-[10px] font-mono border border-[#5E7D7E]/20 bg-[#5E7D7E]/5 px-3 py-1.5 rounded-full">⌕ {searchMethod}</span>
                  </div>
                )}
                {result.length>0 && (
                  <div className="memory-grid">
                    {result.map(m=>(
                      <div key={m.id} className={`memory-card ${m.type}`}>
                        <span className={`type-pill type-${m.type}`}>{TYPE_ICONS[m.type]} {m.type}</span>
                        <div style={{fontSize:13,color:'var(--text)',lineHeight:1.6}}>{m.content}</div>
                        {m.storageHash?.startsWith('0x') ? (
                            <a href={`${PUBLIC_0G.storageExplorerBase}/${m.storageHash}`} target='_blank' rel='noreferrer' className='hash-live'>
                              ⬡ {m.storageHash?.slice(0,26)}... ↗
                            </a>
                          ) : (
                            <span className='hash-pending'>⬡ uploading to 0G Storage...</span>
                          )}
                      </div>
                    ))}
                  </div>
                )}
                {result.length===0&&searchQ&&!loading&&<div className="empty"><div className="empty-title">No semantic matches found</div><div style={{color:'var(--text3)',fontSize:13,marginTop:8}}>Try a different query or write more memories first</div></div>}
              </div>
            )}
          </div>
        </div>

        {/* Skills preview */}
        <div style={{marginBottom:56}}>
          <div className="section-header">
            <div className="section-title">Skills Marketplace</div>
            <Link href="/skills" className="btn btn-outline" style={{fontSize:12,padding:'5px 14px'}}>View all →</Link>
          </div>
          <div className="skills-grid">
            {skills.map(skill=>(
              <Link key={skill.id} href={`/skills/${skill.id}`} className="skill-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="skill-category">{skill.category}</span>
                  <span className="skill-price" style={{color: parseFloat(skill.price) === 0 ? 'var(--green)' : 'var(--cyan)'}}>
                    {parseFloat(skill.price) === 0 ? 'Free' : `${skill.price} OG`}
                  </span>
                </div>
                <div className="skill-name">{skill.name}</div>
                <div className="skill-desc">{skill.description}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{skill.tags.map(t=><span key={t} className="skill-tag">#{t}</span>)}</div>
                <div className="skill-footer">
                  <span>by {skill.publisherName}</span>
                  <span>{skill.usageCount} runs</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* OpenClaw integration */}
        <div id="openclaw" style={{marginBottom:56}}>
          <div className="section-header">
            <div className="section-title">OpenClaw Integration</div>
            <span className="text-[#8B6F66] text-[10px] font-mono border border-[#8B6F66]/20 bg-[#8B6F66]/5 px-3 py-1.5 rounded-full">⬡ 1 line config</span>
          </div>
          <div className="box">
            <div className="box-title">Add to your OpenClaw agent — memory + skills in one plugin</div>
            <pre className="code-block">{`import { MemoryOSPlugin } from 'memoryos-openclaw'

const agent = new OpenClawAgent({
  plugins: [
    MemoryOSPlugin({
      apiUrl: 'https://your-memoryos.vercel.app',
      agentId: 'agent_your_unique_id',
    })
  ]
})

// Now your agent auto-saves important memories:
await agent.memory.save('User hates spicy food', { type: 'semantic', importance: 4 })

// And retrieves them next session:
const context = await agent.memory.search('food preferences')
// → [{ content: 'User hates spicy food', ... }]

// Plus run skills from the marketplace:
const summary = await agent.skills.run('skill_summarizer', { input: longText })
// Agent B paid → 0G Chain recorded it → you earned OG tokens`}</pre>
            <div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}>
              <span className="text-[#5E7D7E] text-[10px] font-mono border border-[#5E7D7E]/20 bg-[#5E7D7E]/5 px-3 py-1.5 rounded-full">⬡ Memories on 0G Storage</span>
              <span className="text-[#5E7D7E] text-[10px] font-mono border border-[#5E7D7E]/20 bg-[#5E7D7E]/5 px-3 py-1.5 rounded-full">⌕ Semantic search via 0G Compute</span>
              <span className="text-[#8B6F66] text-[10px] font-mono border border-[#8B6F66]/20 bg-[#8B6F66]/5 px-3 py-1.5 rounded-full">⬡ OpenClaw compatible</span>
              <span style={{fontFamily:'var(--mono)',fontSize:10,color:'#5A6460',padding:'5px 0'}}>5% platform fee on all skill sales</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{borderTop:'1px solid var(--border)',padding:'32px 0',marginBottom:32}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:24,justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontFamily:'var(--display)',fontSize:16,fontWeight:700,color:'var(--cyan)',marginBottom:8}}>Memory<span style={{color:'var(--text3)',fontWeight:400}}>OS</span></div>
              <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)',lineHeight:1.8}}>
                Memory + Skills middleware for AI agents<br/>
                Powered by 0G Network · Built for 0G APAC Hackathon 2026<br/>
                Track 1: Agentic Infrastructure + Track 3: Agentic Economy
              </div>
            </div>
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              <a href={PUBLIC_0G.chainExplorerBase} target="_blank" rel="noreferrer" className="nav-link" style={{fontSize:11}}>Chain Explorer ↗</a>
              <a href={PUBLIC_0G.storageExplorerBase.replace('/file','')} target="_blank" rel="noreferrer" className="nav-link" style={{fontSize:11}}>Storage Explorer ↗</a>
              <a href="https://docs.0g.ai" target="_blank" rel="noreferrer" className="nav-link" style={{fontSize:11}}>0G Docs ↗</a>
            </div>
          </div>
        </footer>
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
