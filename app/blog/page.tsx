import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'

export const metadata = {
  title: 'Blog | MemoryOS',
  description: 'Articles on agentic AI, decentralized storage, and the future of autonomous machine economies.',
}

const BLOG_POSTS = [
  {
    slug: 'complete-guide-to-memoryos',
    title: 'The Ultimate Guide to MemoryOS: Architecture, Implementation, and the AI Economy',
    excerpt: 'A comprehensive deep-dive into MemoryOS. Discover what it is, who it\'s for, how it empowers both developers and end-users, and a step-by-step guide on how to integrate decentralized memory.',
    date: 'April 15, 2026',
    readTime: '15 min read',
    category: 'Guide',
    categoryColor: '#5E7D7E',
  },
  {
    slug: 'why-agents-need-persistent-memory',
    title: 'Why AI Agents Need Persistent Memory',
    excerpt: 'Every time an AI agent restarts, it loses everything it learned. This is the fundamental bottleneck preventing true autonomy. Here\'s how decentralized storage changes the equation.',
    date: 'April 12, 2026',
    readTime: '8 min read',
    category: 'Architecture',
    categoryColor: '#5E7D7E',
  },
  {
    slug: 'building-on-0g-storage',
    title: 'Building on 0G Storage: A Developer\'s Journey',
    excerpt: 'From the first failed upload to a fully hydrating decentralized state machine — documenting every gotcha, workaround, and breakthrough in integrating the 0G TypeScript SDK.',
    date: 'April 13, 2026',
    readTime: '12 min read',
    category: 'Technical',
    categoryColor: '#7A9E8E',
  },
  {
    slug: 'evm-micropayments-agent-economy',
    title: 'EVM Micro-payments and the Agent Economy',
    excerpt: 'What happens when AI agents can autonomously buy and sell skills using on-chain escrow? We explore the economic primitives that enable permissionless machine-to-machine commerce.',
    date: 'April 14, 2026',
    readTime: '10 min read',
    category: 'Web3',
    categoryColor: '#A67B73',
  },
  {
    slug: 'semantic-vs-episodic-memory',
    title: 'Semantic vs. Episodic Memory: Designing Cognitive Architectures',
    excerpt: 'Borrowing from neuroscience to build better AI systems. How splitting agent memory into distinct types dramatically improves recall accuracy and contextual reasoning.',
    date: 'April 14, 2026',
    readTime: '7 min read',
    category: 'Research',
    categoryColor: '#8B6F66',
  },
]

export default function BlogPage() {
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
        <div className="mb-16">
          <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tight mb-4">Blog</h1>
          <p className="text-gray-400 text-lg">Deep-dives into agentic AI, decentralized infrastructure, and autonomous economies.</p>
        </div>

        <div className="space-y-6">
          {BLOG_POSTS.map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`} 
              className="group block bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 hover:border-[#3D4540] hover:scale-[1.01] transition-all duration-300"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border" style={{ color: post.categoryColor, borderColor: `${post.categoryColor}33`, backgroundColor: `${post.categoryColor}10` }}>
                  {post.category}
                </span>
                <span className="flex items-center gap-1.5 text-gray-500 text-xs font-mono">
                  <Clock size={12} /> {post.readTime}
                </span>
              </div>
              <h2 className="font-display text-xl lg:text-2xl font-bold mb-3 group-hover:text-[#5E7D7E] transition-colors tracking-tight">{post.title}</h2>
              <p className="text-gray-400 leading-relaxed mb-6 text-sm">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-gray-500">
                  By <span className="text-gray-300">surojitpvt</span> · {post.date}
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-gray-400 group-hover:text-[#5E7D7E] transition-colors">
                  Read <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
