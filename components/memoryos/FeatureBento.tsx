'use client'
import { Database, Coins, Zap, Brain, Shield, Share2 } from 'lucide-react'
import { useScrollReveal } from './hooks/useScrollReveal'

export function FeatureBento() {
  const ref1 = useScrollReveal()
  const ref2 = useScrollReveal()
  const ref3 = useScrollReveal()
  const ref4 = useScrollReveal()
  const ref5 = useScrollReveal()

  return (
    <section id="features" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-16">
        <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4 tracking-tight">
          Infrastructure for the Agentic Economy
        </h2>
        <p className="text-[#8A9490] text-lg max-w-2xl font-sans">
          Every byte of state — identity, memory, skills, indexes, embeddings, audit logs — lives on 0G. That's not a feature. That's the whole point.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: 0G Storage */}
        <div 
          ref={ref1}
          className="md:col-span-2 bg-[#151A17] premium-shadow rounded-3xl p-10 border border-[#2A302C] opacity-0 scale-95 transition-all duration-700 ease-out flex flex-col justify-between group hover:border-[#3D4540] relative overflow-hidden"
          style={{ transitionDelay: '0ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#5E7D7E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="bg-[#1F2623] w-14 h-14 rounded-2xl flex items-center justify-center border border-[#2A302C] mb-8 group-hover:scale-105 transition-transform duration-300">
            <Database className="text-[#5E7D7E]" size={24} />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold mb-3 tracking-tight">Two-Layer 0G Storage</h3>
            <p className="text-[#8A9490] font-sans leading-relaxed">
              <strong className="text-[#F4F1EE]">Log Layer (immutable):</strong> Memories, brain snapshots, encrypted vaults, and audit logs uploaded as Merkle trees. <strong className="text-[#F4F1EE]">KV Layer (mutable):</strong> Agent manifests, memory indexes, and config stored as key-value pairs. Any MemoryOS node bootstraps its entire state from a single 0G key lookup. Zero local persistence.
            </p>
          </div>
        </div>

        {/* Card 2: EVM Payments */}
        <div 
          ref={ref2}
          className="bg-[#151A17] premium-shadow rounded-3xl p-10 border border-[#2A302C] opacity-0 scale-95 transition-all duration-700 ease-out flex flex-col justify-between group hover:border-[#3D4540] relative overflow-hidden"
          style={{ transitionDelay: '80ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#A67B73]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="bg-[#1F2623] w-14 h-14 rounded-2xl flex items-center justify-center border border-[#2A302C] mb-8 group-hover:scale-105 transition-transform duration-300">
            <Coins className="text-[#A67B73]" size={24} />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold mb-3 tracking-tight">On-Chain Agent Economy</h3>
            <p className="text-[#8A9490] font-sans leading-relaxed">
              Skill escrow payments, compute ledger management, and Agent Brain INFTs (ERC-7857) with encrypted metadata and two-phase intelligent transfer — all settled on 0G Chain. 3 deployed contracts.
            </p>
          </div>
        </div>

        {/* Card 3: Agent Intelligence */}
        <div 
          ref={ref3}
          className="bg-[#151A17] premium-shadow rounded-3xl p-10 border border-[#2A302C] opacity-0 scale-95 transition-all duration-700 ease-out flex flex-col justify-between group hover:border-[#3D4540] relative overflow-hidden"
          style={{ transitionDelay: '120ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="bg-[#1F2623] w-14 h-14 rounded-2xl flex items-center justify-center border border-[#2A302C] mb-8 group-hover:scale-105 transition-transform duration-300">
            <Brain className="text-cyan-400" size={24} />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold mb-3 tracking-tight">Cognitive Intelligence</h3>
            <p className="text-[#8A9490] font-sans leading-relaxed">
              Agent Dreams consolidate episodic memories into semantic facts. Autonomous RAG synthesizes answers from stored knowledge. Contradiction detection prevents cognitive conflicts.
            </p>
          </div>
        </div>

        {/* Card 4: Encrypted Vaults + A2A */}
        <div 
          ref={ref4}
          className="md:col-span-2 bg-[#151A17] premium-shadow rounded-3xl p-10 border border-[#2A302C] opacity-0 scale-95 transition-all duration-700 ease-out flex flex-col md:flex-row items-start md:items-center justify-between gap-10 group hover:border-[#3D4540] relative overflow-hidden"
          style={{ transitionDelay: '160ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="flex-1">
            <div className="flex gap-3 mb-8">
              <div className="bg-[#1F2623] w-14 h-14 rounded-2xl flex items-center justify-center border border-[#2A302C] group-hover:scale-105 transition-transform duration-300">
                <Shield className="text-emerald-400" size={24} />
              </div>
              <div className="bg-[#1F2623] w-14 h-14 rounded-2xl flex items-center justify-center border border-[#2A302C] group-hover:scale-105 transition-transform duration-300">
                <Share2 className="text-cyan-400" size={24} />
              </div>
            </div>
            <h3 className="font-display text-2xl font-bold mb-3 tracking-tight">Encrypted Vaults & Cross-Agent Sharing</h3>
            <p className="text-[#8A9490] font-sans leading-relaxed max-w-xl">
              AES-256-GCM encrypted memories stored as ciphertext on 0G — only the owning wallet can decrypt. Grant-based A2A protocol lets agents share specific memories with revocable access control. HIPAA/GDPR-ready by design.
            </p>
          </div>

          <div className="flex-1 w-full flex justify-end">
            <div className="flex flex-col gap-3 w-full max-w-xs font-mono text-[11px]">
              <div className="bg-[#1F2623] border border-[#2A302C] rounded-lg p-3 text-[#5E7D7E]">
                <span className="text-emerald-400">🔐</span> encrypt(memory, walletKey) → 0G
              </div>
              <div className="bg-[#1F2623] border border-[#2A302C] rounded-lg p-3 text-[#5E7D7E]">
                <span className="text-cyan-400">🤝</span> share(Agent_A → Agent_B, grantId)
              </div>
              <div className="bg-[#1F2623] border border-[#2A302C] rounded-lg p-3 text-red-400/60">
                <span>❌</span> revoke(grantId) → access removed
              </div>
            </div>
          </div>

        </div>

        {/* Card 5: Inference */}
        <div 
          ref={ref5}
          className="md:col-span-3 bg-[#151A17] premium-shadow rounded-3xl p-10 border border-[#2A302C] opacity-0 scale-95 transition-all duration-700 ease-out flex flex-col md:flex-row items-start md:items-center justify-between gap-10 group hover:border-[#3D4540] relative overflow-hidden"
          style={{ transitionDelay: '200ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-bl from-[#8B6F66]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="flex-1">
            <div className="bg-[#1F2623] w-14 h-14 rounded-2xl flex items-center justify-center border border-[#2A302C] mb-8 group-hover:scale-105 transition-transform duration-300">
              <Zap className="text-[#8B6F66]" size={24} />
            </div>
            <h3 className="font-display text-2xl font-bold mb-3 tracking-tight">Multi-Provider Decentralized Compute</h3>
            <p className="text-[#8A9490] font-sans leading-relaxed max-w-xl">
              Four inference providers with automatic failover: 0G Router API, Fireworks AI (Llama 70B), OpenAI, and direct 0G Serving Broker. The Inference Lab lets you test every provider in real-time from the dashboard.
            </p>
          </div>

          <div className="flex-1 w-full flex justify-end">
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {[
                { name: '0G Router', status: 'TEE Verified', color: '#5E7D7E' },
                { name: 'Fireworks', status: 'Llama 3.3 70B', color: '#A67B73' },
                { name: '0G Serving', status: 'Direct Node', color: '#7A9E8E' },
                { name: 'OpenAI', status: 'Fallback', color: '#8B6F66' },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#1F2623] border border-[#2A302C] rounded-lg px-4 py-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-[#F4F1EE] font-medium flex-1">{p.name}</span>
                  <span className="font-mono text-[10px] text-[#5A6460] uppercase">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
