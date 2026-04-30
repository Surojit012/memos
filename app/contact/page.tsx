import Link from 'next/link'
import { ArrowLeft, Twitter, Github, Mail, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Contact | MemoryOS',
  description: 'Get in touch with the MemoryOS team.',
}

export default function ContactPage() {
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
        <div className="mb-16 text-center">
          <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tight mb-4">Get in Touch</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Have questions about the protocol, want to collaborate, or just want to say hi? Reach out through any of these channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <a 
            href="https://x.com/surojitpvt" 
            target="_blank" 
            rel="noreferrer"
            className="group bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 hover:border-[#5E7D7E] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#5E7D7E]/10 border border-[#5E7D7E]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Twitter size={28} className="text-[#5E7D7E]" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">X (Twitter)</h3>
            <p className="text-[#5E7D7E] font-mono text-sm mb-3">@surojitpvt</p>
            <p className="text-gray-500 text-sm">Follow for real-time protocol updates, development threads, and hackathon announcements.</p>
          </a>

          {/* GitHub */}
          <a 
            href="https://github.com/Surojit012" 
            target="_blank" 
            rel="noreferrer"
            className="group bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 hover:border-[#8B6F66] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#8B6F66]/10 border border-[#8B6F66]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Github size={28} className="text-[#8B6F66]" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">GitHub</h3>
            <p className="text-[#8B6F66] font-mono text-sm mb-3">Surojit012</p>
            <p className="text-gray-500 text-sm">Star the repo, browse the source code, open issues, or submit pull requests to the MemoryOS protocol.</p>
          </a>

          {/* Email */}
          <div className="group bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 hover:border-[#7A9E8E] transition-all duration-300 flex flex-col items-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#7A9E8E]/10 border border-[#7A9E8E]/20 flex items-center justify-center mb-6">
              <Mail size={28} className="text-[#7A9E8E]" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Email</h3>
            <p className="text-[#7A9E8E] font-mono text-sm mb-3">DM on X preferred</p>
            <p className="text-gray-500 text-sm">For partnership inquiries, integration support, or press — drop a DM on X for the fastest response.</p>
          </div>

          {/* Location */}
          <div className="group bg-[#151A17] border border-[#2A302C] rounded-3xl p-8 hover:border-[#A67B73] transition-all duration-300 flex flex-col items-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#A67B73]/10 border border-[#A67B73]/20 flex items-center justify-center mb-6">
              <MapPin size={28} className="text-[#A67B73]" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Location</h3>
            <p className="text-[#A67B73] font-mono text-sm mb-3">Remote / Global</p>
            <p className="text-gray-500 text-sm">Building from anywhere. The beauty of decentralized infrastructure — no office required.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#5E7D7E]/10 to-[#A67B73]/10 border border-[#2A302C] rounded-3xl p-10 text-center">
          <h2 className="font-display text-2xl font-bold mb-4 tracking-tight">Want to build on MemoryOS?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Check out the documentation or jump straight into the developer sandbox to start experimenting with persistent agent memory.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/docs" className="px-8 py-3 rounded-full bg-[#F4F1EE] text-[#0F1210] font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-[#5E7D7E]/10">
              Read the Docs
            </Link>
            <Link href="/playground" className="px-8 py-3 rounded-full border border-[#2A302C] text-gray-300 font-bold text-sm hover:border-[#5E7D7E] hover:text-white transition-colors">
              Open Playground
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
