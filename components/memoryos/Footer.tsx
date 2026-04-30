'use client'
import Link from 'next/link'
import { Twitter, Github } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative bg-[#0F1210] border-t border-[rgba(244,241,238,0.05)] pt-24 pb-12 overflow-hidden mt-12 z-0">
      
      {/* Giant Watermark Background */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[120px] sm:text-[200px] md:text-[300px] lg:text-[400px] font-black font-display text-[#F4F1EE] opacity-[0.02] leading-none pointer-events-none select-none w-full text-center tracking-tighter mix-blend-overlay -z-10">
        MEMORYOS
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-20 mb-24">
          
          {/* Brand Info */}
          <div className="md:col-span-1">
            <Link href="/" className="font-display text-xl font-bold text-[#5E7D7E] tracking-tight mb-6 inline-block">
              Memory<span className="text-[#5A6460] font-normal">OS</span>
            </Link>
            <p className="text-sm text-[#8A9490] font-sans leading-relaxed mb-8">
              The operating system for the agentic economy. 30 0G use cases. Powered by 0G Storage, Compute, and Chain.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://x.com/surojitpvt" target="_blank" rel="noreferrer" aria-label="X (Twitter)" className="w-10 h-10 rounded-full bg-[#1A1F1C] border border-[#2A302C] flex items-center justify-center text-[#8A9490] hover:text-[#F4F1EE] hover:border-[#5E7D7E] hover:bg-[#5E7D7E]/10 transition-colors">
                <Twitter size={16} />
              </a>
              <a href="https://github.com/Surojit012" target="_blank" rel="noreferrer" aria-label="GitHub" className="w-10 h-10 rounded-full bg-[#1A1F1C] border border-[#2A302C] flex items-center justify-center text-[#8A9490] hover:text-[#F4F1EE] hover:border-[#5E7D7E] hover:bg-[#5E7D7E]/10 transition-colors">
                <Github size={16} />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-display font-bold text-[#F4F1EE] mb-6 uppercase tracking-wider text-xs">Platform</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/docs#0g-network" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">0G Network</Link></li>
              <li><Link href="/docs#micropayments" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Micro-payments</Link></li>
              <li><Link href="/skills" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Skill Marketplace</Link></li>
              <li><Link href="/playground" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Developer Sandbox</Link></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-display font-bold text-[#F4F1EE] mb-6 uppercase tracking-wider text-xs">Resources</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/docs" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Documentation</Link></li>
              <li><Link href="/docs#api-reference" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">API Reference</Link></li>
              <li><Link href="/docs#contracts" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Smart Contracts</Link></li>
              <li><a href="https://github.com/Surojit012" target="_blank" rel="noreferrer" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Source Code</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-bold text-[#F4F1EE] mb-6 uppercase tracking-wider text-xs">Company</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/about" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">About</Link></li>
              <li><Link href="/blog" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="text-sm text-[#8A9490] hover:text-[#5E7D7E] transition-colors">Contact</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[rgba(244,241,238,0.05)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#5A6460] font-mono">
            &copy; {new Date().getFullYear()} MemoryOS Protocol. All rights reserved. Built for 0G.
          </div>
          <div className="flex gap-6">
            <Link href="/docs" className="text-xs text-[#5A6460] hover:text-[#F4F1EE] transition-colors">Privacy Policy</Link>
            <Link href="/docs" className="text-xs text-[#5A6460] hover:text-[#F4F1EE] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
