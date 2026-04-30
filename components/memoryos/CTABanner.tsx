'use client'
import { ArrowRight, Database, ShieldCheck, Cpu, Brain, Lock, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useScrollReveal } from './hooks/useScrollReveal'

export function CTABanner() {
  const ref = useScrollReveal()

  return (
    <section className="py-24 px-6 lg:px-8 max-w-7xl mx-auto" ref={ref}>
      <div className="relative rounded-3xl min-h-[400px] overflow-hidden premium-shadow bg-[#1A1F1C] border border-[#2A302C] flex flex-col md:flex-row items-center p-12 lg:p-16 gap-12 group hover:border-[#3D4540] transition-colors duration-500">
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-[#5E7D7E]/10 to-transparent pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#8B6F66]/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex-1 relative z-10">
          <h2 className="text-4xl lg:text-5xl font-display font-black text-[#F4F1EE] leading-[1.1] mb-6 tracking-tight">
            Every byte on 0G.<br/>Zero centralized services.
          </h2>
          <p className="text-[#8A9490] font-sans text-lg mb-10 max-w-md">
            Launch the MemoryOS Dashboard to manage agents, trigger dream cycles, encrypt memories, and share knowledge across your agent fleet.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link 
              href="/dashboard" 
              className="bg-[#F4F1EE] text-[#0F1210] px-8 py-3.5 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all duration-300"
            >
              Launch Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link 
              href="/playground" 
              className="px-8 py-3.5 rounded-full text-sm font-bold text-[#F4F1EE] border border-[#3D4540] hover:border-[#5E7D7E] transition-all duration-300"
            >
              Try Playground
            </Link>
          </div>
        </div>

        <div className="flex-1 relative z-10 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(94,125,126,0.1)] border border-[rgba(94,125,126,0.25)] flex items-center justify-center shrink-0">
              <Database size={18} className="text-[#5E7D7E]" />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#F4F1EE] mb-1">Two-Layer 0G Storage</h4>
              <p className="text-sm font-sans text-[#8A9490]">Log layer (immutable blobs) + KV layer (mutable manifests). Zero local persistence — bootstrap from 0G.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(94,125,126,0.1)] border border-[rgba(94,125,126,0.25)] flex items-center justify-center shrink-0">
              <Brain size={18} className="text-cyan-400" />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#F4F1EE] mb-1">Cognitive Intelligence</h4>
              <p className="text-sm font-sans text-[#8A9490]">Dreams, RAG, contradiction detection — agents that think while they sleep.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(166,123,115,0.12)] border border-[rgba(166,123,115,0.25)] flex items-center justify-center shrink-0">
              <Lock size={18} className="text-emerald-400" />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#F4F1EE] mb-1">Encrypted Vaults & ERC-7857</h4>
              <p className="text-sm font-sans text-[#8A9490]">AES-256-GCM vaults, HMAC API keys, and Brain INFTs with two-phase encrypted transfer protocol.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(139,111,102,0.12)] border border-[rgba(139,111,102,0.25)] flex items-center justify-center shrink-0">
              <Cpu size={18} className="text-[#8B6F66]" />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#F4F1EE] mb-1">Multi-Provider Compute</h4>
              <p className="text-sm font-sans text-[#8A9490]">0G Router, Fireworks Llama 70B, OpenAI, and direct 0G Serving Broker with auto-failover.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
