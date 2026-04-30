'use client'

import { useState } from 'react'

export default function SupportAgent() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: 'Hello! I am a MemoryOS Support Agent. I remember everything you tell me forever, stored across the 0G Network. How can I help?' }
  ])
  const [loading, setLoading] = useState(false)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()
      
      setMessages(prev => [...prev, { role: 'agent', text: data.reply || 'System Error' }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: 'Error connecting to the API.' }])
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#0a0a09] text-[#e0e0d8] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111110] border border-[#2b2b2b] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="bg-[#1a1a19] border-b border-[#2b2b2b] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            <h1 className="font-semibold text-[#f8f8f2]">0G Support Agent</h1>
          </div>
          <span className="text-xs bg-[#2b2b2b] px-2 py-1 rounded text-[#a0a095]">memoryos-openclaw enabled</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl p-4 whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-[#E35444] text-white rounded-br-none' 
                    : 'bg-[#2b2b2b] text-[#e0e0d8] rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#2b2b2b] rounded-2xl rounded-bl-none p-4 w-16 flex justify-center gap-1">
                <div className="w-2 h-2 bg-[#8b8b80] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#8b8b80] rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-[#8b8b80] rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-[#2b2b2b] bg-[#1a1a19]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tell me something to remember..."
              className="w-full bg-[#111110] border border-[#3b3b3a] rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-[#E35444] text-[#f8f8f2] transition-colors"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 text-[#E35444] hover:text-[#ff6b5a] disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z"/>
              </svg>
            </button>
          </div>
        </form>

      </div>
    </main>
  )
}
