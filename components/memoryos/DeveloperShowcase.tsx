'use client'

import { useState } from 'react'
import { Terminal, Code2, Database } from 'lucide-react'
import { useScrollReveal } from './hooks/useScrollReveal'

const CODE_EXAMPLES = {
  python: `from memoryos import Client

# Initialize the 0G-powered client
client = Client(api_key="agt_...", endpoint="...")

# Store episodic memory on 0G Storage
client.memory.add(
    "User loves drinking matcha lattes",
    type="episodic"
)

# Autonomous RAG via 0G Compute
response = client.rag.ask("What should I order them?")
print(response.answer) # "A matcha latte."

# Trigger Agent Dreams (Consolidation)
client.dreams.sleep()`,
  javascript: `import { MemoryOS } from 'memoryos-openclaw'

// Initialize the 0G-powered client
const client = new MemoryOS({ apiKey: 'agt_...' })

// Store episodic memory on 0G Storage
await client.memory.add(
  "User prefers dark mode interfaces",
  { type: "episodic" }
)

// Autonomous RAG via 0G Compute
const response = await client.rag.ask("What theme should we load?")
console.log(response.answer) // "Dark mode."

// Trigger Agent Dreams (Consolidation)
await client.dreams.sleep()`
}

export function DeveloperShowcase() {
  const ref = useScrollReveal()
  const [activeLang, setActiveLang] = useState<'python' | 'javascript'>('python')

  return (
    <section className="py-24 px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#2A302C]/50" ref={ref}>
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Copy */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1F1C] border border-[#2A302C] mb-6">
            <Terminal size={14} className="text-[#5E7D7E]" />
            <span className="text-xs font-mono uppercase tracking-widest text-gray-300">Developer First</span>
          </div>
          
          <h2 className="text-3xl lg:text-5xl font-display font-bold mb-6 tracking-tight leading-tight">
            Integrate 0G memory with two lines of code.
          </h2>
          
          <p className="text-[#8A9490] font-sans text-lg mb-8 leading-relaxed">
            While MemoryOS provides a beautiful visual dashboard, the real power lies in our SDKs. Whether you're building CLI tools in Python or web apps in Next.js, our SDKs abstract away the complexity of decentralized storage and compute.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-[#5E7D7E]/10 flex items-center justify-center shrink-0 border border-[#5E7D7E]/20">
                <Code2 className="text-[#5E7D7E]" size={20} />
              </div>
              <div>
                <h3 className="font-syne font-bold text-white text-lg mb-1">Official SDKs</h3>
                <p className="text-[#8A9490] text-sm leading-relaxed">
                  Available on NPM as <code className="text-[#7A9E8E] bg-[#1A1F1C] px-1 rounded">memoryos-openclaw</code> and PyPI as <code className="text-[#7A9E8E] bg-[#1A1F1C] px-1 rounded">memoryos-py</code>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-[#8B6F66]/10 flex items-center justify-center shrink-0 border border-[#8B6F66]/20">
                <Database className="text-[#8B6F66]" size={20} />
              </div>
              <div>
                <h3 className="font-syne font-bold text-white text-lg mb-1">Advanced Features</h3>
                <p className="text-[#8A9490] text-sm leading-relaxed">
                  Access features not shown in the GUI, including Encrypted Vaults, Agent-to-Agent (A2A) sharing, and direct KV manipulation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Code Window */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#5E7D7E]/20 to-transparent blur-3xl rounded-[2rem] opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
          
          <div className="relative bg-[#0F1210] border border-[#2A302C] rounded-2xl overflow-hidden shadow-2xl">
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A302C] bg-[#151A17]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
                <div className="w-3 h-3 rounded-full bg-[#EAB308]/80" />
                <div className="w-3 h-3 rounded-full bg-[#22C55E]/80" />
              </div>
              
              <div className="flex gap-2 bg-[#0F1210] p-1 rounded-lg border border-[#2A302C]">
                <button 
                  onClick={() => setActiveLang('python')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${activeLang === 'python' ? 'bg-[#2A302C] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  main.py
                </button>
                <button 
                  onClick={() => setActiveLang('javascript')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${activeLang === 'javascript' ? 'bg-[#2A302C] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  app.js
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="p-6 overflow-x-auto bg-[#0a0c0b]">
              <pre className="font-mono text-sm leading-relaxed">
                <code className="text-gray-300">
                  {CODE_EXAMPLES[activeLang].split('\n').map((line, i) => {
                    // Simple syntax highlighting simulation
                    let coloredLine = line;
                    if (line.startsWith('#') || line.startsWith('//')) {
                      return <div key={i} className="text-[#5E7D7E] italic">{line}</div>;
                    }
                    if (activeLang === 'python') {
                      if (line.includes('import')) coloredLine = coloredLine.replace('from', '<span class="text-[#A67B73]">from</span>').replace('import', '<span class="text-[#A67B73]">import</span>');
                      if (line.includes('=')) coloredLine = coloredLine.replace('=', '<span class="text-[#7A9E8E]">=</span>');
                      if (line.includes('print')) coloredLine = coloredLine.replace('print', '<span class="text-[#8B6F66]">print</span>');
                    } else {
                      if (line.includes('import')) coloredLine = coloredLine.replace('import', '<span class="text-[#A67B73]">import</span>').replace('from', '<span class="text-[#A67B73]">from</span>');
                      if (line.includes('await')) coloredLine = coloredLine.replace('await', '<span class="text-[#A67B73]">await</span>');
                      if (line.includes('const')) coloredLine = coloredLine.replace('const', '<span class="text-[#A67B73]">const</span>');
                      if (line.includes('console.log')) coloredLine = coloredLine.replace('console.log', '<span class="text-[#8B6F66]">console.log</span>');
                    }
                    
                    // Color strings
                    coloredLine = coloredLine.replace(/"([^"]*)"/g, '<span class="text-[#7A9E8E]">"$1"</span>');
                    coloredLine = coloredLine.replace(/'([^']*)'/g, "<span class='text-[#7A9E8E]'>'$1'</span>");

                    return (
                      <div key={i} dangerouslySetInnerHTML={{ __html: coloredLine || ' ' }} />
                    );
                  })}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
