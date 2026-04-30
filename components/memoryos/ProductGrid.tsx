'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Database, Brain, Shield, Zap, Moon, Share2, Lock, Cpu } from 'lucide-react'
import { useScrollReveal } from './hooks/useScrollReveal'

const CATEGORIES = ['All', 'Storage', 'Intelligence', 'Security', 'Compute', 'Chain']

const ITEMS = [
  { id: 1, title: 'Permanent Memory', desc: 'Episodic, semantic, procedural — immutable on 0G Log layer', cat: 'Storage', icon: Database, color: '#5E7D7E', link: '/dashboard' },
  { id: 2, title: 'KV Store', desc: 'Mutable agent manifests and indexes on 0G KV layer', cat: 'Storage', icon: Database, color: '#7A9E8E', link: '/dashboard' },
  { id: 3, title: 'Agent Dreams', desc: 'Sleep-cycle memory consolidation via Llama 70B', cat: 'Intelligence', icon: Moon, color: '#8B6F66', link: '/dashboard' },
  { id: 4, title: 'Autonomous RAG', desc: '7-step pipeline: embed → search → rank → infer → store', cat: 'Intelligence', icon: Brain, color: '#A67B73', link: '/dashboard' },
  { id: 5, title: 'Encrypted Vaults', desc: 'AES-256-GCM ciphertext on 0G — HIPAA-ready', cat: 'Security', icon: Lock, color: '#7A9E8E', link: '/dashboard' },
  { id: 6, title: 'A2A Sharing', desc: 'Grant-based cross-agent memory access with revoke', cat: 'Security', icon: Share2, color: '#5E7D7E', link: '/dashboard' },
  { id: 7, title: 'Brain INFTs', desc: 'ERC-7857 with encrypted transfer protocol', cat: 'Chain', icon: Shield, color: '#A67B73', link: '/dashboard' },
  { id: 8, title: 'Skills Marketplace', desc: 'On-chain escrow payments for agent skills', cat: 'Chain', icon: Cpu, color: '#8B6F66', link: '/skills' },
  { id: 9, title: 'Inference Lab', desc: 'Test 4 compute providers side-by-side', cat: 'Compute', icon: Zap, color: '#8B6F66', link: '/dashboard' },
  { id: 10, title: '0G Router', desc: 'TEE-verified decentralized inference API', cat: 'Compute', icon: Cpu, color: '#5E7D7E', link: '/dashboard' },
]

export function ProductGrid() {
  const ref = useScrollReveal()
  const [activeTab, setActiveTab] = useState('All')
  const [isAnimating, setIsAnimating] = useState(false)

  const handleTabChange = (cat: string) => {
    if (cat === activeTab) return
    setIsAnimating(true)
    setTimeout(() => {
      setActiveTab(cat)
      setIsAnimating(false)
    }, 150)
  }

  const filtered = activeTab === 'All' ? ITEMS : ITEMS.filter(i => i.cat === activeTab)

  return (
    <section id="technology" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto" ref={ref}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4 tracking-tight">
            Capabilities Ecosystem
          </h2>
          <p className="text-[#8A9490] font-sans max-w-xl">
            Every feature uses 0G Storage, 0G Compute, or 0G Chain — most use all three. No centralized fallbacks.
          </p>
        </div>

        {/* Sliding Pill Control */}
        <div className="bg-[#151A17] p-1.5 rounded-full inline-flex relative shadow-inner border border-[#2A302C] self-start items-center">
          <div 
            className="absolute top-1.5 bottom-1.5 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0 bg-[#2A302C] border border-[#3D4540] shadow-sm"
            style={{
              width: '96px',
              left: '6px',
              transform: `translateX(calc(${CATEGORIES.indexOf(activeTab)} * 96px))`,
            }}
          />
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => handleTabChange(c)}
              className={`relative z-10 py-2 text-[13px] font-medium font-mono rounded-full transition-colors duration-300 text-center w-[96px] ${activeTab === c ? 'text-[#F4F1EE]' : 'text-[#8A9490] hover:text-[#F4F1EE]'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        {filtered.map((item) => (
          <Link href={item.link} key={item.id} className="group premium-shadow bg-[#1A1F1C] border border-[#2A302C] rounded-3xl aspect-square p-6 flex flex-col justify-between hover:border-[#3D4540] hover:scale-[1.02] transition-all duration-300 relative overflow-hidden no-underline">
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />

            <div className="flex justify-between items-start relative z-20">
              <span className="font-mono text-[10px] tracking-wider uppercase px-3 py-1 bg-[#0F1210] border border-[#2A302C] rounded-full text-[#8A9490]">
                {item.cat}
              </span>
              <div className="w-10 h-10 rounded-full bg-[#151A17] flex items-center justify-center border border-[#2A302C] group-hover:bg-[#1F2623] transition-colors">
                <item.icon size={18} color={item.color} />
              </div>
            </div>

            <div className="relative z-20 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 pb-2">
              <h4 className="font-display font-bold text-lg mb-2 text-[#F4F1EE]">{item.title}</h4>
              <p className="text-xs text-[#8A9490] mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.desc}</p>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A9490] group-hover:text-[#F4F1EE] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Open Dashboard <ArrowRight size={14} className="text-[#5E7D7E]" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
