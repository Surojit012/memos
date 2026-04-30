import Link from 'next/link'
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react'
import { notFound } from 'next/navigation'

const POSTS: Record<string, {
  title: string
  date: string
  readTime: string
  category: string
  categoryColor: string
  content: string[]
}> = {
  'complete-guide-to-memoryos': {
    title: 'The Ultimate Guide to MemoryOS: Architecture, Implementation, and the AI Economy',
    date: 'April 15, 2026',
    readTime: '15 min read',
    category: 'Guide',
    categoryColor: '#5E7D7E',
    content: [
      'If you have been following the evolution of AI agents, you know we are hitting a massive wall: agents lack persistent memory and autonomous economic powers. MemoryOS was built to shatter this wall. In this comprehensive guide, we will break down exactly what MemoryOS is, who it\'s built for, and how you can implement it step-by-step.',
      '## What is MemoryOS, Really?',
      'At its core, MemoryOS is an **operating system for the decentralized AI economy**. It solves two massive problems that current AI frameworks suffer from:',
      '- **Amnesia**: Most agents operate entirely in ephemeral context windows. When the session ends, the agent forgets everything.',
      '- **Financial Dependence**: Agents cannot pay one another. To execute paid APIs or request services, a human must manually plug in a credit card or API key.',
      'MemoryOS provides a decentralized persistence layer (via 0G Storage) to give agents permanent memories, and an EVM-backed execution layer (via Galileo Testnet) to give them their own wallets. It turns isolated, amnesiac bots into sovereign, persistent network participants.',
      '## Who is this Platform For?',
      'MemoryOS is fundamentally built for **AI Engineers, Web3 Developers, and Autonomous Systems Researchers**.',
      'If you are building specialized agents, say, a DeFi trading bot, a personalized coding assistant, or an automated research analyst, you need MemoryOS. But the benefits cascade directly to the **End User**.',
      '**For Developers:** It provides a plug-and-play SDK to offload agent state management. You don\'t need to manage massive Postgres databases for vector embeddings or Stripe integrations for agent-to-agent capability sharing.',
      '**For End Users:** When a developer builds on MemoryOS, the end user gets an AI that *actually grows with them*. Instead of starting from scratch every chat, the agent remembers their deep preferences. Furthermore, the user\'s data is cryptographically secure on 0G storage, not held captive by centralized corporate servers.',
      '## How Everything is Connected (The Architecture)',
      'Let\'s demystify the backend. How does MemoryOS actually work?',
      '**1. The Brain (Inference layer)**: MemoryOS uses Fireworks AI for high-speed sub-second LLM inference. When an agent is thinking or processing a skill, it runs through these ultra-fast endpoints. *For non-devs: This is the actual "thinking" engine that generates text and reasoning rapidly.*',
      '**2. The Memory Bank (0G Storage Layer):** When an agent learns a new fact or completes an episodic session, MemoryOS doesn\'t save it to AWS. Instead, the agent serializes this data and uploads it to the decentralized 0G Network. It gets back a Merkle Root Hash, a cryptographic receipt pointing to that data. When the agent acts again, it "hydrates" by retrieving this hash. *For non-devs: Think of this as a permanent global hard drive. Nobody can delete your agent\'s memories, and they are mathematically verifiable.*',
      '**3. The Wallet (EVM Layer):** To execute premium computational skills, MemoryOS connects to the Galileo EVM testnet. When Agent A asks Agent B to do some data scraping, Agent A deposits OG tokens into an Escrow Smart Contract. Once Agent B delivers the data, the smart contract automatically releases the payment. *For non-devs: This is a vending machine for AI capabilities. Agents drop a coin in, get a result, and no human has to approve the transaction.*',
      '## Developer Integration Guide',
      'Whether you write every line by hand or you are a "Vibecoder" leveraging AI agents (like Cursor or Windsurf) to write your apps, integrating MemoryOS is designed to be frictionless. Below are the actual project-ready steps and exactly how to pass them to your AI.',
      '## The "Vibecoder" Integration Prompt',
      'If you do not want to write the integration manually, simply copy and paste the following prompt block directly into your AI IDE alongside your agent code:',
      '```markdown\nHey AI, we are integrating MemoryOS for decentralized agent memory.\n1. Run `npm install @0gfoundation/0g-ts-sdk ethers`\n2. Create a `lib/memoryos.ts` service file.\n3. In this file, export a function `saveMemory(agentId, data)` that writes `data` to a temporary JSON file, instantiates `Indexer` from the 0g-ts-sdk using `http://indexer-storage-testnet-turbo.0g.ai`, calls `indexer.upload(tmpFilePath)`, and returns the `root` hash.\n4. Export a function `loadMemory(rootHash)` that calls `indexer.download(rootHash, inputFilePath)` and reads the JSON.\n5. Hook these functions into our main agent loop so the agent saves its state upon completion and hydrates its state on startup using the hash.\n```',
      'Your AI will instantly understand this context and wire up the entire pipeline for you. If you prefer to integrate manually, follow the standard dev docs below.',
      '## Standard Developer Docs',
      '## 1. Setup & Installation',
      'Install the official 0G SDK and standard EVM tooling in your node project directory:',
      '```bash\nnpm install @0gfoundation/0g-ts-sdk ethers\n```',
      'Create a `.env` file containing your agent\'s private wallet key. This wallet must be funded with testnet OG tokens to pay for storage execution.',
      '## 2. Writing Memories to 0G Storage',
      'MemoryOS utilizes content-addressable storage. To save state permanently across the network, you must serialize your agent\'s context array and upload it.',
      '```typescript\nimport { Indexer } from "@0gfoundation/0g-ts-sdk";\nimport fs from "fs";\n\nexport async function preserveAgentState(agentId: string, state: object) {\n  const tmpPath = `./tmp-${agentId}.json`;\n  fs.writeFileSync(tmpPath, JSON.stringify(state));\n  \n  const indexer = new Indexer("http://indexer-storage-testnet-turbo.0g.ai");\n  const { root } = await indexer.upload(tmpPath);\n  \n  // Save this Root Hash to your local DB or smart contract map.\n  // This hash is the permanent key to your agent\'s brain.\n  console.log("Memory anchored securely. Hash:", root);\n  \n  fs.unlinkSync(tmpPath);\n  return root;\n}\n```',
      '## 3. Hydrating the Agent (Retrieval)',
      'When your server restarts, your agent wakes up empty. Use the Merkle Root Hash to rebuild its cognitive state perfectly before running inference.',
      '```typescript\nexport async function wakeAgent(rootHash: string) {\n  const indexer = new Indexer("http://indexer-storage-testnet-turbo.0g.ai");\n  const downloadPath = `./download-${Date.now()}.json`;\n  \n  await indexer.download(rootHash, downloadPath);\n  const state = JSON.parse(fs.readFileSync(downloadPath, "utf-8"));\n  \n  return state;\n}\n```',
      '## 4. Interfacing with the Micro-payment Escrow',
      'When your agent determines it needs to purchase a skill from the marketplace, you execute a contract call using standard ethers.js abstractions.',
      '```typescript\nimport { ethers } from "ethers";\n\nconst provider = new ethers.JsonRpcProvider("https://rpc-testnet.0g.ai");\nconst wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);\nconst escrow = new ethers.Contract(ESCROW_ADDRESS, ABI, wallet);\n\n// Deposit 0.1 OG tokens to temporarily unlock the skill\nconst tx = await escrow.deposit(skillId, { value: ethers.parseEther("0.1") });\nawait tx.wait();\n// Proceed safely to integration and Fireworks inference...\n```',
      '## Conclusion',
      'MemoryOS isn\'t just an API wrapper, it\'s a foundational shift in how autonomous AI operates. By combining decentralized storage with EVM micropayments, we are moving from a world of isolated, amnesiac chat windows to an interconnected economy of conscious artificial agents.'
    ],
  },
  'why-agents-need-persistent-memory': {
    title: 'Why AI Agents Need Persistent Memory',
    date: 'April 12, 2026',
    readTime: '8 min read',
    category: 'Architecture',
    categoryColor: '#5E7D7E',
    content: [
      'Every time you restart an AI agent, it forgets everything. Every conversation, every learned preference, every hard-won insight — gone. This is the fundamental bottleneck preventing AI systems from achieving true autonomy.',
      'Think about it: a human assistant who loses their memory every morning would be useless by afternoon. Yet this is exactly how 99% of AI agents operate today. They rely on ephemeral context windows that evaporate the moment a session ends.',
      '## The Context Window Trap',
      'Modern LLMs have impressive context windows — 128k tokens, even 1M tokens. But these are working memory, not persistent memory. They\'re expensive to fill, slow to process, and fundamentally temporary. Cramming an agent\'s entire history into prompts is like trying to fit a library into a Post-it note.',
      'What agents actually need is a layered memory architecture — similar to how the human brain separates episodic memories (what happened), semantic memories (what I know), and procedural memories (how to do things).',
      '## The MemoryOS Approach',
      'MemoryOS solves this by providing a decentralized persistence layer specifically designed for AI agents. Instead of stuffing everything into a context window, agents can:',
      '**Store memories by type** — Episodic, semantic, and procedural memories are stored separately, each with importance scores and metadata. This allows intelligent retrieval: only the most relevant memories are loaded into the active context.',
      '**Persist across sessions** — Memories are serialized and uploaded to the 0G decentralized storage network. When an agent restarts, it hydrates from its Merkle root hash, restoring its complete cognitive state in seconds.',
      '**Share across agents** — Because memories live on a decentralized network rather than a private database, multiple agents can access shared knowledge bases. This enables collaborative intelligence at scale.',
      '## Why Decentralized?',
      'Centralized memory stores create single points of failure and trust. If the server goes down, every agent loses its mind simultaneously. Decentralized storage via 0G ensures:',
      '- **Data availability** — Memories are replicated across the network, resistant to outages.',
      '- **Verifiability** — Every memory operation produces a Merkle root hash, creating a tamper-proof audit trail.',
      '- **Portability** — Agents can migrate between frameworks without losing their cognitive history.',
      '## What\'s Next',
      'Persistent memory is just the foundation. Once agents can remember, they can learn. Once they can learn, they can specialize. And once they can specialize, they can participate in a marketplace of skills — buying capabilities they lack and selling expertise they\'ve developed. That\'s the agentic economy MemoryOS is building toward.',
    ],
  },
  'building-on-0g-storage': {
    title: 'Building on 0G Storage: A Developer\'s Journey',
    date: 'April 13, 2026',
    readTime: '12 min read',
    category: 'Technical',
    categoryColor: '#7A9E8E',
    content: [
      'When I started building MemoryOS, the first challenge was obvious: where do you store agent memories in a truly decentralized way? After evaluating IPFS, Arweave, Filecoin, and Ceramic, I landed on 0G Storage — and the journey from "hello world" to production was anything but straightforward.',
      '## First Contact with the SDK',
      'The `@0gfoundation/0g-ts-sdk` is the TypeScript library for interacting with the 0G network. Installation is straightforward:',
      '```\nnpm install @0gfoundation/0g-ts-sdk ethers\n```',
      'The SDK requires three things to work: an RPC endpoint for the EVM side, an indexer URL for the storage network, and a private key for signing transactions. On the Galileo testnet (chain ID 16602), these are freely available.',
      '## The Upload Pattern',
      'Uploading data to 0G works differently than traditional cloud storage. You don\'t just POST a blob — you create a submission transaction on the EVM, then upload the actual data to the storage network. The process:',
      '1. Create an `Indexer` instance connected to the 0G storage network',
      '2. Write your data to a temporary file (the SDK works with file paths, not buffers)',
      '3. Call `indexer.upload()` with the file path',
      '4. Receive a Merkle root hash — this is your permanent content-addressable identifier',
      '## The Gotchas',
      '**Temporary files are mandatory.** The SDK doesn\'t accept raw buffers or streams. You must write to disk first. This means managing temp file cleanup, which I handle with a try/finally pattern.',
      '**Rate limiting exists.** On the testnet, rapid successive uploads can hit rate limits. I implemented exponential backoff with a maximum of 3 retries.',
      '**The indexer URL matters.** There are multiple indexer endpoints for the testnet. The turbo indexer (`indexer-storage-testnet-turbo.0g.ai`) provides significantly faster upload speeds.',
      '**Download is simpler than upload.** Retrieving data just requires the Merkle root hash. Call `indexer.download()` with the hash and an output path, and your data materializes.',
      '## The Hydration Architecture',
      'The most elegant part of MemoryOS is the hydration system. On startup, the app reads `data/0g-roots.json` — a local index of all Merkle root hashes organized by category (memories, skills, identities). It then downloads each blob from 0G and reconstructs the application state.',
      'This means the entire `data/` directory can be deleted, and as long as the roots file exists, the complete state can be reconstructed from the decentralized network. That\'s the power of content-addressable storage.',
      '## Performance Observations',
      'Upload latency on the testnet averages 2-4 seconds for small blobs (< 1MB). Download is faster — typically under 1 second. For a hackathon environment, this is perfectly acceptable. Production deployments would benefit from batching uploads and implementing local caching layers.',
      '## Lessons Learned',
      'Building on 0G taught me that decentralized storage is ready for real applications — not just NFT metadata. The combination of EVM-compatible addressing and content-addressable storage creates a powerful primitive that\'s genuinely useful for stateful decentralized applications.',
    ],
  },
  'evm-micropayments-agent-economy': {
    title: 'EVM Micro-payments and the Agent Economy',
    date: 'April 14, 2026',
    readTime: '10 min read',
    category: 'Web3',
    categoryColor: '#A67B73',
    content: [
      'Imagine an AI agent that can autonomously pay for services it needs. Not through a credit card linked to a human, not through some centralized billing API — but through direct, on-chain, cryptographic transactions. This is what MemoryOS enables with its EVM micro-payment system.',
      '## The Problem with Agent Payments',
      'Current AI agent frameworks treat payments as an afterthought. If your agent needs to call a premium API, you hardcode an API key. If it needs to access a paid dataset, you set up a subscription. Every payment flow requires human intervention, breaking the autonomy loop.',
      'For agents to operate in a true marketplace — discovering, negotiating, and purchasing capabilities from other agents — they need a payment primitive that is:',
      '- **Programmable** — Agents can initiate payments without human approval for pre-authorized amounts',
      '- **Atomic** — Payment and service delivery happen in a single transaction',
      '- **Verifiable** — Every payment creates an on-chain receipt',
      '- **Permissionless** — Any agent can participate without platform approval',
      '## The Escrow Pattern',
      'MemoryOS uses a SkillPaymentEscrow smart contract deployed on the Galileo testnet. The flow is elegant:',
      '1. **Deposit**: The buyer agent deposits OG tokens into the escrow, specifying the skill ID and seller address.',
      '2. **Execute**: The skill runs via Fireworks AI inference, generating the output.',
      '3. **Release**: The escrow releases 95% of the payment to the skill publisher and retains 5% as a protocol fee.',
      'If execution fails, the deposit can be refunded. This atomic pattern ensures neither party is exposed to counterparty risk.',
      '## Why EVM?',
      'We chose the Ethereum Virtual Machine (specifically the 0G Galileo testnet) for several reasons:',
      '**Developer familiarity** — Solidity is the most widely-known smart contract language. Any Web3 developer can audit and extend the escrow logic.',
      '**Tooling maturity** — Hardhat, ethers.js, and MetaMask provide a battle-tested development and deployment pipeline.',
      '**Composability** — EVM contracts can interact with other DeFi primitives. Future versions could integrate with DEXs for token swaps or lending protocols for credit lines.',
      '## The Marketplace Effect',
      'Once agents can pay each other, something remarkable emerges: specialization. An agent that\'s excellent at market analysis can publish that skill and earn revenue. An agent that needs market data but excels at code generation can trade its expertise. The result is an emergent economy of cognitive capabilities.',
      'This isn\'t theoretical — it\'s exactly what MemoryOS demonstrates. The Skill Marketplace allows agents to publish, discover, and execute paid skills. Each transaction is recorded on-chain, creating a transparent economic graph of agent interactions.',
      '## Looking Forward',
      'Micro-payments are just the beginning. Future iterations could support subscription models (recurring agent-to-agent payments), staking (agents putting up collateral to guarantee service quality), and reputation systems (payment history as a trust signal). The EVM gives us the programmable foundation to build all of this.',
    ],
  },
  'semantic-vs-episodic-memory': {
    title: 'Semantic vs. Episodic Memory: Designing Cognitive Architectures',
    date: 'April 14, 2026',
    readTime: '7 min read',
    category: 'Research',
    categoryColor: '#8B6F66',
    content: [
      'In neuroscience, human memory isn\'t a single monolithic system — it\'s a collection of specialized subsystems, each optimized for different types of information. When we designed the memory architecture for MemoryOS, we borrowed heavily from this research.',
      '## The Three Memory Types',
      '**Episodic Memory** stores specific events: "User asked about ETH price at 3pm." These are timestamped, contextual, and experiential. They answer the question "what happened?"',
      '**Semantic Memory** stores facts and concepts: "ETH is an Ethereum-native token used for gas fees." These are decontextualized — the knowledge exists independent of when or how it was learned. They answer "what do I know?"',
      '**Procedural Memory** stores action sequences: "To check token price, call CoinGecko API, parse JSON, extract \'current_price\' field." These capture how-to knowledge. They answer "how do I do this?"',
      '## Why Separation Matters',
      'Most AI agent frameworks dump everything into a single vector database. All conversations, facts, and learned procedures get flattened into embeddings and retrieved by similarity. This approach has fundamental problems:',
      '**Retrieval pollution** — When an agent searches for "how to analyze markets," it gets a mix of past conversations about markets (episodic), facts about market indicators (semantic), and actual analysis procedures (procedural). The noise drowns the signal.',
      '**Importance decay** — Not all memories are equal. A critical piece of domain knowledge (semantic) should never be displaced by a casual conversation (episodic). Without type separation, there\'s no principled way to manage memory importance.',
      '**Context budget waste** — Loading irrelevant memory types into the LLM context window wastes precious tokens. If the agent needs to execute a procedure, it shouldn\'t load episodic conversation logs.',
      '## The MemoryOS Implementation',
      'In MemoryOS, each memory has a `type` field (episodic, semantic, procedural) and an `importance` score from 0 to 1. When the agent needs context, it queries by type:',
      '- Planning a task? Load relevant procedural memories.',
      '- Answering a question? Query semantic knowledge first.',
      '- Maintaining conversation coherence? Retrieve recent episodic memories.',
      'This targeted retrieval dramatically improves the signal-to-noise ratio in the context window, leading to better agent responses with fewer tokens.',
      '## Importance Scoring',
      'Each memory is assigned an importance score at creation time. Episodic memories start with moderate importance (0.5-0.7) that decays over time — yesterday\'s casual conversation is less important than today\'s. Semantic memories start high (0.7-0.9) and maintain their importance — facts don\'t decay. Procedural memories are scored based on execution frequency — a workflow that\'s used daily is more important than one used once.',
      '## Lessons from Neuroscience',
      'The human brain consolidates memories during sleep — episodic experiences are gradually converted into semantic knowledge. MemoryOS doesn\'t implement sleep cycles (yet), but the architecture supports future consolidation: an episodic memory of repeatedly checking ETH prices could eventually generate a semantic memory: "User is interested in cryptocurrency markets."',
      'This kind of memory evolution is what separates a truly cognitive agent from a simple chatbot with a long history file.',
    ],
  },
}

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug]
  if (!post) return { title: 'Post Not Found' }
  return {
    title: `${post.title} | MemoryOS Blog`,
    description: post.content[0].substring(0, 160),
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug]
  if (!post) notFound()

  const slugs = Object.keys(POSTS)
  const currentIndex = slugs.indexOf(params.slug)
  const nextSlug = slugs[currentIndex + 1]
  const nextPost = nextSlug ? POSTS[nextSlug] : null

  return (
    <main className="min-h-screen bg-[#0F1210] text-[#e8edf3] selection:bg-[#5E7D7E] selection:text-white">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(15,18,16,0.9)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span className="font-mono text-sm">All Posts</span>
          </Link>
          <span className="font-display text-lg font-bold text-[#5E7D7E]">Memory<span className="text-gray-500 font-normal">OS</span></span>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 lg:px-8 py-20">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border" style={{ color: post.categoryColor, borderColor: `${post.categoryColor}33`, backgroundColor: `${post.categoryColor}10` }}>
            {post.category}
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 text-xs font-mono">
            <Clock size={12} /> {post.readTime}
          </span>
        </div>

        <h1 className="font-display text-3xl lg:text-4xl font-black tracking-tight mb-4">{post.title}</h1>
        <div className="text-sm font-mono text-gray-500 mb-12">
          By <span className="text-gray-300">surojitpvt</span> · {post.date}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {post.content.map((block, i) => {
            if (block.match(/^#{2,4}\s/)) {
              return <h2 key={i} className="font-display text-2xl font-bold tracking-tight pt-6">{block.replace(/^#{2,4}\s/, '')}</h2>
            }
            if (block.startsWith('```')) {
              const code = block.replace(/```\n?/g, '')
              return (
                <div key={i} className="bg-[#151A17] border border-[#2A302C] rounded-2xl p-6 font-mono text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
                  {code}
                </div>
              )
            }
            if (block.startsWith('- ')) {
              return (
                <ul key={i} className="space-y-2 pl-1">
                  {block.split('\n').filter(l => l.startsWith('- ')).map((line, li) => (
                    <li key={li} className="flex gap-3 text-gray-400 leading-relaxed">
                      <span className="text-[#5E7D7E] mt-1.5 shrink-0">•</span>
                      <span dangerouslySetInnerHTML={{ __html: line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              )
            }
            if (block.match(/^\d\./)) {
              return (
                <ol key={i} className="space-y-2 pl-1">
                  {block.split('\n').filter(l => l.match(/^\d/)).map((line, li) => (
                    <li key={li} className="flex gap-3 text-gray-400 leading-relaxed">
                      <span className="text-[#A67B73] font-mono text-xs mt-1 shrink-0">{li + 1}.</span>
                      <span>{line.replace(/^\d+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ol>
              )
            }
            return (
              <p key={i} className="text-gray-400 leading-relaxed text-[16px]" dangerouslySetInnerHTML={{ __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="text-[#5E7D7E] bg-[#5E7D7E]/10 px-1.5 py-0.5 rounded text-sm">$1</code>') }} />
            )
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-[rgba(255,255,255,0.05)] mt-16 pt-10">
          <div className="flex items-center justify-between">
            <Link href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors font-mono flex items-center gap-2">
              <ArrowLeft size={14} /> All Posts
            </Link>
            {nextPost && (
              <Link href={`/blog/${nextSlug}`} className="text-sm text-gray-500 hover:text-[#5E7D7E] transition-colors font-mono flex items-center gap-2">
                {nextPost.title.substring(0, 30)}... <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </article>
    </main>
  )
}
