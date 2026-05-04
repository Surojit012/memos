'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Copy, Check, Database, Brain, Shield, Zap, Lock, Share2, Moon, Cpu, BookOpen, Terminal, Code2, Sparkles } from 'lucide-react'

/* ── Section label ── */
function SectionLabel({ number, title }: { number: string; title: string }) {
  return (
    <div className="font-mono text-xs tracking-[0.3em] uppercase text-[#5A6460] mb-12">
      <span className="text-[#5E7D7E]">§ {number}</span> · {title}
    </div>
  )
}

/* ── Copyable prompt card ── */
function PromptCard({ title, tags, prompt }: { title: string; tags: string[]; prompt: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="bg-[#151A17] border border-[#2A302C] rounded-2xl p-6 flex flex-col justify-between hover:border-[#3D4540] transition-colors group">
      <div>
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-mono text-sm font-bold text-[#F4F1EE] uppercase tracking-wider">{title}</h3>
          <div className="flex gap-2 shrink-0">
            {tags.map(t => (
              <span key={t} className="font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#1F2623] border border-[#2A302C] text-[#8A9490]">{t}</span>
            ))}
          </div>
        </div>
        <div className="bg-[#0F1210] border border-[#1F2623] rounded-xl p-4 mb-4">
          <p className="font-mono text-[13px] text-[#8A9490] leading-relaxed whitespace-pre-wrap">{prompt}</p>
        </div>
      </div>
      <button onClick={handleCopy} className="flex items-center gap-2 text-[#5E7D7E] hover:text-[#7A9E8E] transition-colors font-mono text-xs">
        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy prompt</>}
      </button>
    </div>
  )
}

/* ── Resource card ── */
function ResourceCard({ badge, badgeColor, title, desc, href, external }: { badge: string; badgeColor: string; title: string; desc: string; href: string; external?: boolean }) {
  return (
    <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
      className="group bg-[#151A17] border border-[#2A302C] rounded-2xl p-6 hover:border-[#3D4540] transition-all no-underline block"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border" style={{ borderColor: badgeColor + '40', color: badgeColor, backgroundColor: badgeColor + '10' }}>{badge}</span>
        {external && <ArrowUpRight size={16} className="text-[#5A6460] group-hover:text-[#5E7D7E] transition-colors" />}
      </div>
      <h3 className="font-mono text-sm font-bold text-[#F4F1EE] uppercase tracking-wider mb-2">{title}</h3>
      <p className="text-sm text-[#8A9490] font-sans leading-relaxed">{desc}</p>
    </Link>
  )
}

/* ── Numbered step row ── */
function StepRow({ num, title, desc, action, href, external }: { num: string; title: string; desc: string; action: string; href: string; external?: boolean }) {
  return (
    <div className="flex items-center justify-between py-8 border-b border-[#1F2623] group">
      <div className="flex items-start gap-8">
        <span className="font-display text-5xl lg:text-6xl font-black text-[#1F2623] group-hover:text-[#2A302C] transition-colors select-none leading-none">{num}</span>
        <div>
          <h3 className="font-display text-xl lg:text-2xl font-bold text-[#F4F1EE] mb-1">{title}</h3>
          <p className="text-sm text-[#8A9490] font-sans max-w-lg">{desc}</p>
        </div>
      </div>
      <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
        className="hidden md:flex items-center gap-2 text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors font-medium shrink-0"
      >
        {action} {external ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
      </Link>
    </div>
  )
}

/* ── API reference row ── */
function ApiRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = { GET: '#7A9E8E', POST: '#5E7D7E', DELETE: '#A67B73' }
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#1F2623] font-mono text-sm group">
      <span className="w-14 text-center text-[11px] font-bold rounded-md py-1 shrink-0" style={{ color: colors[method] || '#8A9490', backgroundColor: (colors[method] || '#8A9490') + '15' }}>{method}</span>
      <span className="text-[#F4F1EE] flex-1 truncate">{path}</span>
      <span className="hidden md:block text-[#5A6460] text-xs font-sans truncate max-w-xs">{desc}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function DocsPage() {
  const [showAllApi, setShowAllApi] = useState(false)

  const allApis = [
    { method: 'POST', path: '/api/memory', desc: 'Create a new memory' },
    { method: 'GET', path: '/api/memory?agentId=X', desc: 'List memories for agent' },
    { method: 'GET', path: '/api/memory/[id]', desc: 'Get single memory' },
    { method: 'DELETE', path: '/api/memory/[id]', desc: 'Delete a memory' },
    { method: 'POST', path: '/api/memory/encrypted', desc: 'Encrypt & store a memory' },
    { method: 'GET', path: '/api/memory/encrypted', desc: 'List encrypted vault entries' },
    { method: 'POST', path: '/api/rag', desc: 'Autonomous RAG pipeline' },
    { method: 'GET', path: '/api/search', desc: 'Semantic memory search' },
    { method: 'POST', path: '/api/agent/[id]/dreams', desc: 'Trigger dream consolidation' },
    { method: 'GET', path: '/api/agent/[id]/dreams', desc: 'Get dream history' },
    { method: 'POST', path: '/api/agent/[id]/share', desc: 'Grant A2A access' },
    { method: 'DELETE', path: '/api/agent/[id]/share', desc: 'Revoke A2A access' },
    { method: 'POST', path: '/api/agent/[id]/mint-inft', desc: 'Mint Brain INFT (ERC-7857)' },
    { method: 'GET', path: '/api/agent/[id]/mint-inft', desc: 'List brain INFTs' },
    { method: 'POST', path: '/api/inft/transfer', desc: 'Intelligent transfer (ERC-7857)' },
    { method: 'GET', path: '/api/inft/transfer', desc: 'Check pending transfer' },
    { method: 'GET', path: '/api/kv', desc: '0G KV Store operations' },
    { method: 'POST', path: '/api/kv', desc: 'Write to 0G KV Store' },
    { method: 'POST', path: '/api/compute/router', desc: '0G Router inference' },
    { method: 'POST', path: '/api/compute/chat', desc: '0G Serving Broker chat' },
    { method: 'GET', path: '/api/compute/providers', desc: 'List compute providers' },
    { method: 'POST', path: '/api/execute', desc: 'Execute a skill' },
    { method: 'POST', path: '/api/pay', desc: 'Pay for a skill' },
    { method: 'GET', path: '/api/status', desc: 'Platform health & stats' },
  ]

  const visibleApis = showAllApi ? allApis : allApis.slice(0, 8)

  return (
    <main className="min-h-screen bg-[#0F1210] text-[#F4F1EE] selection:bg-[#5E7D7E] selection:text-[#F4F1EE]">

      {/* ── Sticky top bar ── */}
      <nav className="sticky top-0 z-50 bg-[rgba(15,18,16,0.92)] backdrop-blur-xl border-b border-[#1F2623]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-[#5E7D7E] tracking-tight">
            Memory<span className="text-[#5A6460] font-normal">OS</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-[#8A9490] hover:text-[#F4F1EE] transition-colors hidden md:block">Home</Link>
            <Link href="/dashboard" className="text-sm text-[#8A9490] hover:text-[#F4F1EE] transition-colors hidden md:block">Dashboard</Link>
            <span className="text-sm font-medium text-[#5E7D7E]">Docs</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#5E7D7E]/10 to-[#A67B73]/8 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(122,158,142,0.3)] bg-[rgba(122,158,142,0.08)] text-[#7A9E8E] text-sm font-mono mb-6">
          <BookOpen size={14} /> Developer Documentation
        </div>
        <h1 className="font-display text-4xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
          Build with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E7D7E] to-[#A67B73]">MemoryOS</span>
        </h1>
        <p className="text-lg text-[#8A9490] font-sans max-w-2xl leading-relaxed">
          Everything you need to integrate permanent AI agent memory, encrypted vaults, cross-agent sharing, and Brain INFTs into your application — all powered by 0G Network.
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-32">

        {/* ═══ § 01 · GET STARTED ═══ */}
        <section className="mb-24">
          <SectionLabel number="01" title="GET STARTED" />
          <StepRow num="01" title="Launch Dashboard" desc="The full-featured developer console for managing agents, memories, dreams, and INFTs." action="Open Dashboard" href="/dashboard" />
          <StepRow num="02" title="Memory Playground" desc="Interactive sandbox to create, search, and query memories via the MemoryOS API." action="Try Playground" href="/playground" />
          <StepRow num="03" title="Skills Marketplace" desc="Browse, execute, and pay for agent skills with on-chain escrow settlement." action="Browse Skills" href="/skills" />
          <StepRow num="04" title="0G Storage Explorer" desc="Verify any memory hash on the 0G Storage Scan. Every blob is cryptographically verifiable." action="Open Explorer" href="https://storagescan-galileo.0g.ai" external />
          <StepRow num="05" title="0G Chain Explorer" desc="View deployed contracts, transactions, and INFT transfers on the Galileo testnet." action="Open Chain Scan" href="https://chainscan-galileo.0g.ai" external />
        </section>

        {/* ═══ § 02 · RESOURCES ═══ */}
        <section className="mb-24">
          <SectionLabel number="02" title="RESOURCES FOR BUILDING" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResourceCard badge="Recommended" badgeColor="#7A9E8E" title="Architecture Overview" desc="Full system architecture: 4-layer stack, 22 library modules, 24 API endpoints, and 3 deployed smart contracts." href="/docs#architecture" />
            <ResourceCard badge="ERC-7857" badgeColor="#A67B73" title="Brain INFT Protocol" desc="Encrypted metadata, two-phase intelligent transfer with re-encryption, brain cloning, and key rotation." href="/docs#erc7857" />
            <ResourceCard badge="0G Storage" badgeColor="#5E7D7E" title="Two-Layer Storage" desc="Log layer for immutable Merkle blobs. KV layer for mutable manifests and indexes. Zero local persistence." href="/docs#storage" />
            <ResourceCard badge="Security" badgeColor="#7A9E8E" title="Encryption & Vaults" desc="AES-256-GCM client-side encryption, HMAC API keys, wallet-scoped isolation, and encrypted vault storage on 0G." href="/docs#security" />
            <ResourceCard badge="0G Skills" badgeColor="#8B6F66" title="0G Agent Skills" desc="14 skills, 6 architecture references, and 3 IDE setups for building on 0G with AI coding assistants." href="https://github.com/0gfoundation/0g-agent-skills" external />
            <ResourceCard badge="0G Docs" badgeColor="#5E7D7E" title="0G Official Documentation" desc="Complete 0G Network documentation — Storage SDK, Compute SDK, Chain reference, and testnet faucet." href="https://docs.0g.ai" external />
          </div>
        </section>

        {/* ═══ § 03 · PROMPT TEMPLATES ═══ */}
        <section className="mb-24">
          <SectionLabel number="03" title="PROMPT TEMPLATES (VIBE CODING)" />
          <p className="text-[#8A9490] font-sans mb-8 -mt-6">Copy these prompts to get started quickly with AI coding assistants (Cursor, Windsurf).</p>
          
          <div className="bg-[#151A17] border border-[#5E7D7E]/50 rounded-2xl p-6 mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#5E7D7E]/10 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="text-[#5E7D7E]" size={20} />
                  <h3 className="font-display text-xl font-bold text-[#F4F1EE]">AI Assistant System Prompt</h3>
                </div>
                <p className="text-[#8A9490] font-sans text-sm max-w-2xl leading-relaxed">
                  Before you start vibe coding, make sure your AI understands how to use MemoryOS. Tell your AI to read the <code className="text-[#7A9E8E] bg-[#0F1210] px-1 rounded">ZERO_CODING_GUIDE.md</code> file (or set it as your <code className="text-[#7A9E8E] bg-[#0F1210] px-1 rounded">.cursorrules</code>) so it stops asking you for low-level 0G network configurations.
                </p>
              </div>
              <Link href="https://github.com/0gfoundation/memoryos-v2/blob/main/ZERO_CODING_GUIDE.md" target="_blank" className="shrink-0 px-6 py-2.5 rounded-full bg-[#1A1F1C] border border-[#5E7D7E]/30 text-[#F4F1EE] text-sm font-bold hover:bg-[#5E7D7E] hover:text-[#0F1210] transition-colors flex items-center gap-2">
                <Code2 size={16} /> View Guide
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PromptCard title="0G Storage" tags={['Storage', 'TypeScript']}
              prompt="Help me integrate 0G Storage for decentralized file storage. Use @0gfoundation/0g-ts-sdk to upload files with the two-layer architecture (Log for immutable data, KV for mutable). Show me how to get 200 MBPS retrieval speed." />
            <PromptCard title="ERC-7857 Brain INFT" tags={['Chain', 'Solidity']}
              prompt="Create an Agentic ID using the ERC-7857 standard that extends ERC-721. Implement encrypted metadata for AI agents, secure re-encryption for ownership transfers, and enable trading AI systems as tokenized assets." />
            <PromptCard title="0G Compute" tags={['Compute', 'AI/ML']}
              prompt="Help me run AI inference on 0G Compute's decentralized GPU marketplace. Use the OpenAI SDK-compatible API for drop-in replacement. Set up pay-per-use model with TEE support for secure processing." />
            <PromptCard title="Agent Dreams" tags={['Intelligence', 'LLM']}
              prompt="Build an agent dream cycle that consolidates episodic memories into semantic facts using Llama 70B. The agent should sleep-process its memories and output refined knowledge, stored back on 0G Storage." />
            <PromptCard title="Encrypted Vault" tags={['Security', 'AES-256']}
              prompt="Implement AES-256-GCM encrypted memory storage. Encrypt data client-side with wallet-derived keys, upload ciphertext to 0G Storage. Only the owning wallet should be able to decrypt. Make it HIPAA-compliant." />
            <PromptCard title="Cross-Agent Sharing" tags={['A2A', 'Protocol']}
              prompt="Build a grant-based cross-agent memory sharing protocol. Agent A grants Agent B access to specific memories via 0G hashes. Support TTL-based expiry and instant revocation. No shared database needed." />
          </div>
        </section>

        {/* ═══ § 04 · API REFERENCE ═══ */}
        <section className="mb-24" id="api-reference">
          <SectionLabel number="04" title="API REFERENCE" />
          <p className="text-[#8A9490] font-sans mb-8 -mt-6">24 REST endpoints. All routes return JSON. Base URL: <code className="text-[#5E7D7E] bg-[#151A17] px-2 py-0.5 rounded text-xs">http://localhost:3000</code></p>
          <div className="bg-[#151A17] border border-[#2A302C] rounded-2xl p-6">
            {visibleApis.map((api, i) => <ApiRow key={i} {...api} />)}
          </div>
          {!showAllApi && (
            <button onClick={() => setShowAllApi(true)} className="mx-auto mt-6 flex items-center gap-2 px-6 py-3 rounded-full bg-[#1A1F1C] border border-[#2A302C] text-sm text-[#8A9490] hover:text-[#F4F1EE] hover:border-[#3D4540] transition-all font-mono">
              View all {allApis.length} ↓
            </button>
          )}
        </section>

        {/* ═══ § 05 · DEPLOYED CONTRACTS ═══ */}
        <section className="mb-24" id="contracts">
          <SectionLabel number="05" title="DEPLOYED CONTRACTS" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'AgentBrainINFT', version: 'v2', standard: 'ERC-7857', address: '0x8334d90D004d012cb6e649E95029fd2805635557', features: ['Encrypted metadata', 'Intelligent transfer', 'Brain cloning', 'Key rotation'] },
              { name: 'SkillPaymentEscrow', version: 'v1', standard: 'Custom', address: '0xd54544cE8C5A991a495Ed29B38365F535546De36', features: ['Skill payments', 'Revenue splits', 'Execution verification', 'Platform fees'] },
              { name: 'ManifestAnchor', version: 'v1', standard: 'Custom', address: 'See .env.local', features: ['Hash anchoring', 'Version tracking', 'Trustless bootstrap', 'Global singleton'] },
            ].map(c => (
              <div key={c.name} className="bg-[#151A17] border border-[#2A302C] rounded-2xl p-6 hover:border-[#3D4540] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-mono text-sm font-bold text-[#F4F1EE]">{c.name}</h3>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-[#5E7D7E]/10 border border-[#5E7D7E]/30 text-[#5E7D7E]">{c.version}</span>
                </div>
                <p className="font-mono text-[10px] text-[#5A6460] mb-4">{c.standard} · Galileo Testnet</p>
                <code className="block text-[11px] text-[#8A9490] bg-[#0F1210] rounded-lg px-3 py-2 mb-4 truncate">{c.address}</code>
                <ul className="flex flex-col gap-1.5">
                  {c.features.map(f => (
                    <li key={f} className="text-xs text-[#5A6460] flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#5E7D7E]" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ § 06 · TECH STACK ═══ */}
        <section className="mb-24" id="architecture">
          <SectionLabel number="06" title="TECH STACK" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Database, label: '0G Storage', sub: 'Log + KV layers', color: '#5E7D7E' },
              { icon: Cpu, label: '0G Compute', sub: '4 inference providers', color: '#A67B73' },
              { icon: Shield, label: '0G Chain', sub: '3 deployed contracts', color: '#7A9E8E' },
              { icon: Brain, label: 'Intelligence', sub: 'Dreams, RAG, conflicts', color: '#8B6F66' },
              { icon: Lock, label: 'Encryption', sub: 'AES-256-GCM', color: '#5E7D7E' },
              { icon: Share2, label: 'A2A Protocol', sub: 'Grant-based sharing', color: '#A67B73' },
              { icon: Moon, label: 'Agent Dreams', sub: 'LLM consolidation', color: '#7A9E8E' },
              { icon: Sparkles, label: 'ERC-7857', sub: 'Intelligent NFTs', color: '#8B6F66' },
            ].map(t => (
              <div key={t.label} className="bg-[#151A17] border border-[#2A302C] rounded-2xl p-5 text-center hover:border-[#3D4540] transition-colors group">
                <t.icon size={24} className="mx-auto mb-3 group-hover:scale-110 transition-transform" style={{ color: t.color }} />
                <div className="font-display text-sm font-bold text-[#F4F1EE] mb-1">{t.label}</div>
                <div className="font-mono text-[10px] text-[#5A6460]">{t.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-black tracking-tight mb-4">
            Ready to build?
          </h2>
          <p className="text-[#8A9490] font-sans mb-8 max-w-md mx-auto">
            30 0G use cases. 24 API endpoints. 3 deployed contracts. Everything you need is live on Galileo.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/dashboard" className="bg-[#F4F1EE] text-[#0F1210] px-8 py-3.5 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all">
              Launch Dashboard <ArrowRight size={16} />
            </Link>
            <Link href="/" className="px-8 py-3.5 rounded-full text-sm font-bold text-[#F4F1EE] border border-[#3D4540] hover:border-[#5E7D7E] transition-all">
              Back to Home
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}
