'use client'
import { useScrollReveal } from './hooks/useScrollReveal'

const TESTIMONIALS = [
  { text: "MemoryOS is what happens when you take 0G Storage seriously. Two layers — immutable Log and mutable KV — replace every centralized database. No AWS. No Supabase. Pure 0G.", author: "0G Foundation", role: "Ecosystem Partner", badge: "Infrastructure" },
  { text: "The Agent Dreams feature is mind-blowing. Our trading bot now consolidates market learnings during off-hours and starts each session with refined semantic knowledge from Llama 70B.", author: "Marcus Chen", role: "Quant Developer", badge: "Intelligence" },
  { text: "We replaced our entire Pinecone + Redis stack with MemoryOS. Memories persist forever on 0G, embeddings are generated via 0G Compute, and we cut costs by 90%.", author: "Sarah Lim", role: "AI Engineer @ Nexus", badge: "Storage" },
  { text: "Cross-agent memory sharing changed our multi-agent architecture. Agent A learns something, grants access to Agent B — no shared database needed, just 0G hashes with revocation.", author: "David Rust", role: "DeFi Architect", badge: "A2A Protocol" },
  { text: "The ERC-7857 Brain INFTs with encrypted transfer are next level. When the NFT transfers, the encryption key gets re-encrypted for the new owner via a two-phase protocol. No other project does this.", author: "Elena V.", role: "Web3 Security Lead", badge: "ERC-7857" },
  { text: "30 distinct 0G use cases across Storage, Compute, and Chain — in a single platform. MemoryOS doesn't just use 0G. It proves 0G can replace every centralized backend.", author: "Jin Woo", role: "Protocol Researcher", badge: "0G Native" },
]

export function TestimonialMarquee() {
  const ref = useScrollReveal()
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS]

  const Col = ({ items, reverse = false }: { items: typeof TESTIMONIALS, reverse?: boolean }) => (
    <div className={`flex flex-col gap-6 ${reverse ? 'animate-scroll-up' : 'animate-scroll-down'} pause-on-hover`}>
      {items.map((t, i) => (
        <div key={i} className="bg-[#1A1F1C] rounded-3xl p-8 premium-shadow break-inside-avoid border border-[#2A302C]">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-wide text-[#8A9490] font-bold">
            {t.badge}
          </div>
          <p className="font-display text-[#F4F1EE] text-lg leading-relaxed mb-6 font-medium">
            &ldquo;{t.text}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5E7D7E]/30 to-[#A67B73]/30 border border-[#2A302C] flex items-center justify-center text-sm font-bold text-[#F4F1EE]">
              {t.author[0]}
            </div>
            <div>
              <div className="text-sm font-bold text-[#F4F1EE] font-display">{t.author}</div>
              <div className="text-xs text-[#8A9490] font-sans">{t.role}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8 relative" ref={ref}>
      
      <div className="text-center mb-16">
        <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4 tracking-tight">
          Built for the 0G Ecosystem
        </h2>
        <p className="text-[#8A9490] font-sans max-w-2xl mx-auto">
          The only agentic platform where every byte of state flows through 0G Storage, 0G Compute, and 0G Chain.
        </p>
      </div>

      <div className="h-[600px] overflow-hidden relative rounded-3xl bg-[#0F1210]">
        
        {/* Gradient Masks */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0F1210] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F1210] to-transparent z-10 pointer-events-none" />

        {/* Marquee Grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-[50%] md:pt-0">
          <div className="hidden md:block">
            <Col items={doubled} />
          </div>
          <div>
            <Col items={doubled} reverse />
          </div>
          <div className="hidden md:block">
            <Col items={doubled} />
          </div>
        </div>
      </div>

    </section>
  )
}
