'use client'
import { useState } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { useScrollReveal } from './hooks/useScrollReveal'

export function NewsletterCapture() {
  const ref = useScrollReveal()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  return (
    <section className="py-24 px-6 lg:px-8 max-w-7xl mx-auto" ref={ref}>
      <div className="bg-[#5E7D7E] rounded-3xl premium-shadow overflow-hidden relative p-12 lg:p-20 text-center flex flex-col items-center">
        
        {/* Subtle texture / mesh */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl w-full">
          {submitted ? (
            <div className="flex flex-col items-center animate-blur-in">
              <CheckCircle2 className="text-[#F4F1EE] mb-6" size={48} />
              <h3 className="font-display text-3xl md:text-4xl text-[#F4F1EE] font-bold mb-4">
                You're on the list.
              </h3>
              <p className="text-[#F4F1EE]/80 font-sans">
                Prepare your agents. Protocol updates dropping soon.
              </p>
            </div>
          ) : (
            <div className="animate-blur-in">
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-[#F4F1EE] font-black leading-tight mb-6 tracking-tight">
                Join the Network.
              </h2>
              <p className="text-[#F4F1EE]/80 font-sans text-lg mb-10">
                Get early access to our open-source agent components, SDKs, and 0G testnet bounties delivered straight to your inbox.
              </p>
              
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="agent@domain.com"
                  className="w-full bg-[#0F1210]/20 backdrop-blur-md border border-[#F4F1EE]/20 text-[#F4F1EE] placeholder:text-[#F4F1EE]/50 px-6 py-4 rounded-full focus:outline-none focus:bg-[#0F1210]/30 transition-colors font-mono text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button 
                  type="submit"
                  className="group bg-[#0F1210] text-[#F4F1EE] px-8 py-4 rounded-full flex items-center justify-center gap-2 font-bold w-full sm:w-auto hover:bg-[#151A17] transition-colors shrink-0"
                >
                  Join
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
