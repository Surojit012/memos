import Link from 'next/link'
import { ArrowLeft, Zap, Globe, Shield, Target } from 'lucide-react'

export const metadata = {
  title: 'About | MemoryOS',
  description: 'Learn about the MemoryOS project — decentralized persistent memory for the agentic economy.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0F1210] text-[#e8edf3] selection:bg-[#5E7D7E] selection:text-white">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(15,18,16,0.9)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span className="font-mono text-sm">Back to Home</span>
          </Link>
          <span className="font-display text-lg font-bold text-[#5E7D7E]">Memory<span className="text-gray-500 font-normal">OS</span></span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-20">
        {/* Hero */}
        <div className="mb-20 text-center">
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tight mb-8">
            Building the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E7D7E] to-[#A67B73]">cognitive layer</span> for autonomous agents.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
            MemoryOS was born from a singular frustration: AI agents forget everything between sessions. We set out to build the missing infrastructure — permanent, verifiable, decentralized memory — so agents can truly learn and evolve.
          </p>
        </div>

        {/* Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {[
            { icon: Globe, color: '#5E7D7E', title: 'Decentralized by Default', text: 'No centralized database, no single point of failure. Every byte of agent memory lives on-chain via the 0G Storage network, replicated across globally distributed nodes.' },
            { icon: Shield, color: '#7A9E8E', title: 'Verifiable & Auditable', text: 'Every memory operation generates a Merkle root hash. This creates a tamper-proof audit trail, giving agent operators and users complete transparency into the cognitive history.' },
            { icon: Zap, color: '#A67B73', title: 'Instant Execution', text: 'Powered by Fireworks AI for sub-second inference latency. Skills execute in real-time, streaming results back while simultaneously posting verifiable records on-chain.' },
            { icon: Target, color: '#8B6F66', title: 'Agent-Native Economics', text: 'The built-in EVM payment escrow enables agents to autonomously buy and sell skills in a permissionless marketplace — creating the foundations of a true machine economy.' },
          ].map((card) => (
            <div key={card.title} className="group bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 hover:border-[#3D4540] transition-colors">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${card.color}10`, borderColor: `${card.color}30` }}>
                <card.icon size={22} style={{ color: card.color }} />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">{card.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{card.text}</p>
            </div>
          ))}
        </div>

        {/* Builder */}
        <div className="bg-[#151A17] border border-[#2A302C] rounded-3xl p-10 text-center">
          <h2 className="font-display text-3xl font-bold mb-4 tracking-tight">Built by surojitpvt</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
            A solo hackathon submission for the 0G Network Hackathon. Designed, developed, and deployed from concept to production in a single sprint.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="https://x.com/surojitpvt" target="_blank" rel="noreferrer" className="px-6 py-3 rounded-full bg-[#0F1210] border border-[#2A302C] text-sm text-gray-300 hover:text-white hover:border-[#5E7D7E] transition-colors font-mono">
              @surojitpvt
            </a>
            <a href="https://github.com/Surojit012" target="_blank" rel="noreferrer" className="px-6 py-3 rounded-full bg-[#0F1210] border border-[#2A302C] text-sm text-gray-300 hover:text-white hover:border-[#5E7D7E] transition-colors font-mono">
              GitHub →
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
