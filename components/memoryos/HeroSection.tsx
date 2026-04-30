'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center text-center px-6 lg:px-8 max-w-7xl mx-auto min-h-[90vh] justify-center">

      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#5E7D7E]/20 to-[#A67B73]/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      {/* Secondary glow */}
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-bl from-cyan-500/10 to-transparent blur-[100px] rounded-full pointer-events-none -z-10 animate-pulse" />

      {/* Label */}
      <div
        className="opacity-0 animate-blur-in inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(122,158,142,0.3)] bg-[rgba(122,158,142,0.08)] text-[#7A9E8E] text-sm font-mono mb-8"
        style={{ animationDelay: '0.2s' }}
      >
        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7A9E8E] opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[#7A9E8E]" /></span>
        <span>30 0G Use Cases Live • Galileo Testnet</span>
      </div>

      {/* Headline */}
      <h1
        className="opacity-0 animate-blur-in font-display mt-4 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-[#F4F1EE] max-w-5xl leading-[1.05]"
        style={{ animationDelay: '0.4s' }}
      >
        The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E7D7E] to-[#A67B73]">operating system</span> for autonomous AI agents.
      </h1>

      {/* Subtext */}
      <p
        className="opacity-0 animate-blur-in mt-8 text-lg sm:text-xl text-[#8A9490] max-w-2xl leading-relaxed font-sans"
        style={{ animationDelay: '0.6s' }}
      >
        Permanent memory, cognitive intelligence, encrypted vaults, cross-agent sharing, ERC-7857 Brain INFTs, and a skills marketplace — all powered <strong className="text-[#F4F1EE]">exclusively</strong> by 0G Network. No AWS. No Pinecone. Pure 0G.
      </p>

      {/* CTAs */}
      <div
        className="opacity-0 animate-blur-in mt-12 flex flex-col sm:flex-row items-center gap-4 justify-center w-full"
        style={{ animationDelay: '0.8s' }}
      >
        <Link
          href="/dashboard"
          className="group relative overflow-hidden bg-[#F4F1EE] text-[#0F1210] px-8 py-4 rounded-full text-base font-bold flex items-center gap-2 hover:scale-105 transition-all duration-300 w-full sm:w-auto justify-center"
        >
          <span className="relative z-10">Launch Dashboard</span>
          <ArrowRight size={18} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          <div className="absolute inset-0 bg-[#5E7D7E] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
        </Link>

        <Link
          href="/docs"
          className="px-8 py-4 rounded-full text-base font-bold text-[#F4F1EE] border border-[#3D4540] hover:border-[#5E7D7E] bg-[rgba(244,241,238,0.03)] hover:bg-[rgba(94,125,126,0.08)] transition-all duration-300 w-full sm:w-auto justify-center flex"
        >
          Zero Coding Docs
        </Link>

        <Link
          href="/playground"
          className="px-8 py-4 rounded-full text-base font-bold text-[#F4F1EE] border border-[#3D4540] hover:border-[#5E7D7E] bg-[rgba(244,241,238,0.03)] hover:bg-[rgba(94,125,126,0.08)] transition-all duration-300 w-full sm:w-auto justify-center flex"
        >
          Try Playground
        </Link>
      </div>

      {/* Live Stats Bar */}
      <div 
        className="opacity-0 animate-blur-in mt-20 w-full max-w-3xl"
        style={{ animationDelay: '1.0s' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#2A302C] rounded-2xl overflow-hidden border border-[#2A302C]">
          {[
            { value: '30', label: '0G Use Cases', color: '#5E7D7E' },
            { value: '3', label: 'Smart Contracts', color: '#7A9E8E' },
            { value: '4', label: 'AI Providers', color: '#A67B73' },
            { value: '8', label: 'Dashboard Tabs', color: '#8B6F66' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#151A17] px-6 py-5 text-center">
              <div className="font-display text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="font-mono text-[10px] text-[#5A6460] uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
