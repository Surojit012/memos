'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowRight } from 'lucide-react'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setHasScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) return null // prevent hydration mismatch with entry animation

  return (
    <>
      <div className={`fixed top-4 left-0 right-0 z-50 flex justify-center px-4 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}>
        <nav className={`w-full max-w-7xl h-[68px] rounded-3xl premium-shadow border backdrop-blur-md transition-colors duration-300 ${hasScrolled ? 'bg-[rgba(15,18,16,0.88)] border-[rgba(244,241,238,0.08)]' : 'bg-[rgba(244,241,238,0.03)] border-[rgba(244,241,238,0.06)]'} flex items-center justify-between px-6 lg:px-8 relative`}>
          
          {/* Links LEFT */}
          <div className="hidden md:flex items-center gap-8 flex-1">
            <Link href="#features" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Features</Link>
            <Link href="#agents" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Agents</Link>
            <Link href="#technology" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Technology</Link>
          </div>

          {/* Logo CENTERED */}
          <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-xl font-bold text-[#5E7D7E] tracking-tight">
            Memory<span className="text-[#5A6460] font-normal">OS</span>
          </Link>

          {/* Actions RIGHT */}
          <div className="hidden md:flex items-center justify-end gap-4 flex-1">
            <Link href="/playground" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">Playground</Link>
            <Link href="/skills" className="group flex items-center gap-2 bg-[#F4F1EE] text-[#0F1210] px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 hover:bg-[#5E7D7E] hover:text-[#F4F1EE]">
              Marketplace
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex flex-1 justify-end">
            <button onClick={() => setIsOpen(!isOpen)} className="text-[#8A9490] hover:text-[#F4F1EE] p-2" aria-label="Toggle Menu">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </nav>
      </div>

      {/* Mobile Menu Slide-down */}
      <div className={`fixed top-[88px] left-4 right-4 z-40 overflow-hidden transition-all duration-500 ease-in-out rounded-3xl ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#1A1F1C] border border-[rgba(244,241,238,0.06)] p-6 flex flex-col gap-4 premium-shadow">
          <Link href="#features" onClick={() => setIsOpen(false)} className="text-base font-medium text-[#8A9490] hover:text-[#5E7D7E]">Features</Link>
          <Link href="#agents" onClick={() => setIsOpen(false)} className="text-base font-medium text-[#8A9490] hover:text-[#5E7D7E]">Agents</Link>
          <Link href="#technology" onClick={() => setIsOpen(false)} className="text-base font-medium text-[#8A9490] hover:text-[#5E7D7E]">Technology</Link>
          <hr className="border-[rgba(244,241,238,0.05)]" />
          <Link href="/playground" onClick={() => setIsOpen(false)} className="text-base font-medium text-[#8A9490] hover:text-[#5E7D7E]">Playground</Link>
          <Link href="/skills" onClick={() => setIsOpen(false)} className="text-base font-bold text-[#5E7D7E]">Skill Marketplace →</Link>
        </div>
      </div>
    </>
  )
}
