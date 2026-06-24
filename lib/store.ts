/**
 * lib/store.ts
 *
 * Unified in-memory store for memories, skills, agents.
 *
 * Architecture (0G-Native):
 * - RAM is a hot cache for fast reads
 * - On startup, ensureHydrated() (from lib/hydration.ts) populates
 *   the cache from 0G Storage via the manifest system
 * - On write, data is saved to RAM immediately, then uploaded to 0G
 *   in the background via the write queue
 * - The manifest (stored ON 0G Storage) maps item IDs to 0G root hashes
 *   so data survives server restart — no local files required
 *
 * This file NEVER reads from 0G directly — that's hydration.ts / 0g-manifest.ts.
 */

import { Memory, Skill, AgentIdentity, CreateMemoryInput, CreateSkillInput, PaymentVerification, PlatformStats } from './types'
import { v4 as uuid } from 'uuid'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// ── Runtime state ─────────────────────────────────────────────

let memories: Memory[] = []
let skills: Skill[] = []
let agents: Map<string, AgentIdentity> = new Map()
let platformRevenue = 0
const paymentVerifications = new Map<string, PaymentVerification>()
let _seeded = false

// ── Seed data ─────────────────────────────────────────────────
// These are loaded when the registry is empty (first run or fresh install).
// After the first seed-0g upload, data comes from 0G instead.

const SEED_AGENTS = {
  ARIA: 'agent_aria_support',
  CODEREV: 'agent_coderev_v2',
  ALPHA: 'agent_alpha_trader',
}

function createSeedMemories(): Memory[] {
  const now = Date.now()
  return [
    // ── Aria — Customer Support Bot ──
    {
      id: 'mem_aria_01', agentId: SEED_AGENTS.ARIA, type: 'semantic',
      content: 'Customer prefers email communication over phone. Always suggest email follow-ups after resolving tickets.',
      tags: ['customer', 'preference', 'communication'], importance: 4,
      createdAt: now - 86400000 * 6, updatedAt: now - 86400000 * 6,
      accessCount: 18, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_aria_02', agentId: SEED_AGENTS.ARIA, type: 'episodic',
      content: 'On April 8, customer #7291 reported a critical billing discrepancy of $847. Escalated to finance team. SLA deadline: April 11.',
      tags: ['billing', 'escalation', 'critical', 'sla'], importance: 5,
      createdAt: now - 86400000 * 4, updatedAt: now - 86400000 * 4,
      accessCount: 9, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_aria_03', agentId: SEED_AGENTS.ARIA, type: 'procedural',
      content: 'Ticket escalation workflow: 1) Tag as P1, 2) Notify #ops-critical Slack, 3) Create JIRA with [ESCALATION] prefix, 4) Email customer within 2 hours.',
      tags: ['workflow', 'escalation', 'process'], importance: 5,
      createdAt: now - 86400000 * 2, updatedAt: now - 86400000 * 2,
      accessCount: 31, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_aria_04', agentId: SEED_AGENTS.ARIA, type: 'semantic',
      content: 'Enterprise tier customers have a 4-hour SLA. Standard tier is 24 hours. Always check tier before quoting response times.',
      tags: ['sla', 'enterprise', 'policy'], importance: 4,
      createdAt: now - 86400000 * 3, updatedAt: now - 86400000 * 3,
      accessCount: 14, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_aria_05', agentId: SEED_AGENTS.ARIA, type: 'episodic',
      content: 'Resolved 47 tickets this week with 94% satisfaction rate. Top category: password resets (31%). Suggestion: implement self-service password reset.',
      tags: ['metrics', 'weekly', 'improvement'], importance: 3,
      createdAt: now - 86400000, updatedAt: now - 86400000,
      accessCount: 5, storageHash: undefined, embedding: undefined,
    },

    // ── CodeRev — Coding Assistant ──
    {
      id: 'mem_code_01', agentId: SEED_AGENTS.CODEREV, type: 'semantic',
      content: 'Team uses TypeScript strict mode. All functions must have explicit return types. No `any` types allowed in production code.',
      tags: ['typescript', 'standards', 'code-quality'], importance: 5,
      createdAt: now - 86400000 * 7, updatedAt: now - 86400000 * 7,
      accessCount: 42, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_code_02', agentId: SEED_AGENTS.CODEREV, type: 'procedural',
      content: 'PR review checklist: 1) Run tests locally, 2) Check bundle size delta, 3) Verify no console.logs, 4) Ensure all new functions have JSDoc, 5) Review security implications.',
      tags: ['pr-review', 'checklist', 'process'], importance: 5,
      createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 5,
      accessCount: 28, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_code_03', agentId: SEED_AGENTS.CODEREV, type: 'episodic',
      content: 'Discovered a memory leak in the WebSocket handler on April 10. Root cause: event listeners not cleaned up on disconnect. Fixed in PR #482.',
      tags: ['bug', 'memory-leak', 'websocket', 'fix'], importance: 4,
      createdAt: now - 86400000 * 3, updatedAt: now - 86400000 * 3,
      accessCount: 7, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_code_04', agentId: SEED_AGENTS.CODEREV, type: 'semantic',
      content: 'Project uses Next.js 14 App Router with server components by default. Client components require "use client" directive. API routes use Route Handlers.',
      tags: ['nextjs', 'architecture', 'framework'], importance: 4,
      createdAt: now - 86400000 * 6, updatedAt: now - 86400000 * 6,
      accessCount: 19, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_code_05', agentId: SEED_AGENTS.CODEREV, type: 'procedural',
      content: 'Deployment pipeline: push to main → GitHub Actions CI → build + test → Vercel preview → manual promote to production. Rollback: revert commit + force deploy.',
      tags: ['deployment', 'ci-cd', 'vercel'], importance: 4,
      createdAt: now - 86400000 * 4, updatedAt: now - 86400000 * 4,
      accessCount: 11, storageHash: undefined, embedding: undefined,
    },

    // ── Alpha — Trading/Research Agent ──
    {
      id: 'mem_alpha_01', agentId: SEED_AGENTS.ALPHA, type: 'semantic',
      content: 'Core thesis: AI infrastructure tokens (0G, Render, Akash) are undervalued relative to utility growth. Position size: max 5% per asset.',
      tags: ['thesis', 'ai-infra', 'portfolio'], importance: 5,
      createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 5,
      accessCount: 35, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_alpha_02', agentId: SEED_AGENTS.ALPHA, type: 'semantic',
      content: 'Risk parameters: Stop loss at -12%. Take profit at +30%. Never hold more than 3 leveraged positions simultaneously. Max portfolio drawdown tolerance: 20%.',
      tags: ['risk', 'parameters', 'trading-rules'], importance: 5,
      createdAt: now - 86400000 * 4, updatedAt: now - 86400000 * 4,
      accessCount: 22, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_alpha_03', agentId: SEED_AGENTS.ALPHA, type: 'episodic',
      content: 'April 9 market event: 0G token listed on major DEX. Volume spike 340%. Entered position at $0.042. Current sentiment: bullish with caution.',
      tags: ['0g', 'trading', 'event', 'dex'], importance: 4,
      createdAt: now - 86400000 * 3, updatedAt: now - 86400000 * 3,
      accessCount: 15, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_alpha_04', agentId: SEED_AGENTS.ALPHA, type: 'procedural',
      content: 'Morning routine: 1) Check overnight liquidations on DefiLlama, 2) Review Fear & Greed index, 3) Scan top 10 by volume change, 4) Update thesis if macro data changed.',
      tags: ['routine', 'research', 'process'], importance: 3,
      createdAt: now - 86400000 * 2, updatedAt: now - 86400000 * 2,
      accessCount: 12, storageHash: undefined, embedding: undefined,
    },
    {
      id: 'mem_alpha_05', agentId: SEED_AGENTS.ALPHA, type: 'episodic',
      content: 'Portfolio weekly return: +4.7%. Best performer: 0G (+18%). Worst: ETH (-2.1%). Realized gains locked via on-chain settlement.',
      tags: ['performance', 'weekly', 'portfolio'], importance: 3,
      createdAt: now - 86400000, updatedAt: now - 86400000,
      accessCount: 8, storageHash: undefined, embedding: undefined,
    },
  ]
}

function createSeedSkills(): Skill[] {
  const now = Date.now()
  return [
    // ── Free skills ──
    {
      id: 'skill_ticket_classify', name: 'Support Ticket Classifier', category: 'Support',
      description: 'Automatically classify incoming support tickets by urgency (P1-P4), category, and suggested routing team.',
      prompt: 'You are an expert support ticket classifier. Given a support ticket, return: Priority (P1 critical / P2 high / P3 medium / P4 low), Category (billing/technical/account/feature-request/other), Suggested Team (finance/engineering/account-management/product), and a one-line summary. Be concise and accurate.',
      inputLabel: 'Paste the support ticket text', outputLabel: 'Classification Result',
      price: '0', publisherName: 'Aria Bot', publisherAgentId: SEED_AGENTS.ARIA,
      publisherAddress: ZERO_ADDRESS,
      createdAt: now - 86400000 * 5, usageCount: 234, totalEarned: 0,
      tags: ['support', 'classification', 'free'], storageHash: undefined,
    },
    {
      id: 'skill_market_brief', name: 'Market Brief Generator', category: 'Research',
      description: 'Generate a concise daily market brief from raw market data or news headlines. Perfect for morning research routines.',
      prompt: 'You are a senior market analyst. Given market data or news, produce a brief with: Market Sentiment (bullish/bearish/neutral), Key Movers (top 3), Risk Events (upcoming), and a 2-sentence outlook. Use professional but concise language.',
      inputLabel: 'Paste market data or headlines', outputLabel: 'Market Brief',
      price: '0', publisherName: 'Alpha Trader', publisherAgentId: SEED_AGENTS.ALPHA,
      publisherAddress: ZERO_ADDRESS,
      createdAt: now - 86400000 * 3, usageCount: 89, totalEarned: 0,
      tags: ['market', 'research', 'free'], storageHash: undefined,
    },

    // ── Paid skills ──
    {
      id: 'skill_escalation_predict', name: 'Escalation Predictor', category: 'Support',
      description: 'Predict whether a customer conversation is likely to escalate based on tone, history, and issue type. Returns risk score and recommended preemptive actions.',
      prompt: 'You are a customer experience analyst. Analyze the conversation and return: Escalation Risk (0-100%), Risk Factors (list top 3), Recommended Actions (2-3 specific steps), and Tone Assessment. Be data-driven and specific.',
      inputLabel: 'Paste the customer conversation', outputLabel: 'Escalation Analysis',
      price: '0.001', publisherName: 'Aria Bot', publisherAgentId: SEED_AGENTS.ARIA,
      publisherAddress: '0x1111111111111111111111111111111111111111',
      createdAt: now - 86400000 * 4, usageCount: 67, totalEarned: 0.06365,
      tags: ['support', 'prediction', 'analytics'], storageHash: undefined,
    },
    {
      id: 'skill_code_review', name: 'Code Review Summarizer', category: 'Development',
      description: 'Analyze a code diff or PR and generate a structured review with security concerns, performance impact, and suggested improvements.',
      prompt: 'You are a senior software engineer doing a code review. Analyze the code and return: Summary (what this change does), Security (any concerns), Performance (impact assessment), Suggestions (specific improvements with code snippets), and Verdict (approve/request-changes/discuss). Be thorough but concise.',
      inputLabel: 'Paste the code diff or PR description', outputLabel: 'Code Review',
      price: '0.002', publisherName: 'CodeRev', publisherAgentId: SEED_AGENTS.CODEREV,
      publisherAddress: '0x2222222222222222222222222222222222222222',
      createdAt: now - 86400000 * 6, usageCount: 142, totalEarned: 0.2698,
      tags: ['code-review', 'development', 'quality'], storageHash: undefined,
    },
    {
      id: 'skill_pr_description', name: 'PR Description Generator', category: 'Development',
      description: 'Generate a professional pull request description from a code diff. Includes what changed, why, testing notes, and deployment considerations.',
      prompt: 'You are a developer writing a pull request description. Given the code changes, generate: Title (concise, imperative mood), What Changed (bullet points), Why (motivation), How to Test (specific steps), Deployment Notes (if any), and Breaking Changes (if any). Follow conventional commit style.',
      inputLabel: 'Paste your code diff', outputLabel: 'PR Description',
      price: '0.001', publisherName: 'CodeRev', publisherAgentId: SEED_AGENTS.CODEREV,
      publisherAddress: '0x2222222222222222222222222222222222222222',
      createdAt: now - 86400000 * 5, usageCount: 98, totalEarned: 0.0931,
      tags: ['pr', 'development', 'documentation'], storageHash: undefined,
    },
    {
      id: 'skill_sentiment', name: 'Sentiment Analyzer', category: 'Analytics',
      description: 'Detect emotional tone and market sentiment of any text — positive, negative, or neutral with confidence score and key drivers.',
      prompt: 'Analyze sentiment of the given text. Return: Sentiment (Positive/Negative/Neutral), Confidence (0-100%), Key Drivers (top 3 phrases that drive the sentiment), Market Implication (if applicable), and a one-sentence explanation. Be precise and objective.',
      inputLabel: 'Enter text to analyze', outputLabel: 'Sentiment Report',
      price: '0.0005', publisherName: 'Alpha Trader', publisherAgentId: SEED_AGENTS.ALPHA,
      publisherAddress: '0x3333333333333333333333333333333333333333',
      createdAt: now - 86400000 * 4, usageCount: 178, totalEarned: 0.0846,
      tags: ['nlp', 'analytics', 'sentiment'], storageHash: undefined,
    },
  ]
}

function createSeedAgents(): Map<string, AgentIdentity> {
  const now = Date.now()
  return new Map([
    [SEED_AGENTS.ARIA, {
      agentId: SEED_AGENTS.ARIA, name: 'Aria — Support Bot',
      createdAt: now - 86400000 * 8, memoryCount: 5, skillsPublished: 2,
      totalReads: 77, totalEarned: 0.06365, storageUsed: 4096,
      openClawConnected: true,
    }],
    [SEED_AGENTS.CODEREV, {
      agentId: SEED_AGENTS.CODEREV, name: 'CodeRev — Code Assistant',
      createdAt: now - 86400000 * 7, memoryCount: 5, skillsPublished: 2,
      totalReads: 107, totalEarned: 0.3629, storageUsed: 3072,
      openClawConnected: true,
    }],
    [SEED_AGENTS.ALPHA, {
      agentId: SEED_AGENTS.ALPHA, name: 'Alpha — Trading Agent',
      createdAt: now - 86400000 * 6, memoryCount: 5, skillsPublished: 2,
      totalReads: 92, totalEarned: 0.0846, storageUsed: 2560,
      openClawConnected: true,
    }],
  ])
}

// ── Seed loading ──────────────────────────────────────────────

export function isStoreSeeded(): boolean {
  return _seeded
}

/**
 * Load seed data into the store.
 * Called by hydration.ts when the registry is empty or as a fallback.
 * Idempotent — safe to call multiple times.
 * 
 * Uses deduplication to merge seed data with any items already
 * present from 0G hydration, so seed items never overwrite real data.
 */
export function loadSeedData(): void {
  if (_seeded) return

  const seedMemories = createSeedMemories()
  const seedSkills = createSeedSkills()
  const seedAgents = createSeedAgents()

  // Merge seed items with existing store (from hydration), never overwriting
  let memoriesAdded = 0
  for (const m of seedMemories) {
    if (!memories.find(existing => existing.id === m.id)) {
      memories.push(m)
      memoriesAdded++
    }
  }

  let skillsAdded = 0
  for (const s of seedSkills) {
    if (!skills.find(existing => existing.id === s.id)) {
      skills.push(s)
      skillsAdded++
    }
  }

  let agentsAdded = 0
  for (const [id, a] of Array.from(seedAgents.entries())) {
    if (!agents.has(id)) {
      agents.set(id, a)
      agentsAdded++
    }
  }

  // Calculate initial platform revenue from seed data
  const seedEarnings = skills.reduce((sum, s) => sum + s.totalEarned, 0)
  platformRevenue = seedEarnings * 0.05 / 0.95 // Reverse the 95/5 split to get platform cut

  _seeded = true
  console.log(`📦 Seed data loaded: +${memoriesAdded} memories, +${skillsAdded} skills, +${agentsAdded} agents (${memories.length} total memories)`)
}

// ── Memory CRUD ───────────────────────────────────────────────

export function createMemory(input: CreateMemoryInput): Memory {
  const now = Date.now()
  const memory: Memory = {
    id: `mem_${uuid().slice(0, 8)}`,
    agentId: input.agentId,
    type: input.type,
    content: input.content,
    tags: input.tags ?? [],
    importance: input.importance ?? 3,
    createdAt: now, updatedAt: now, accessCount: 0,
    storageHash: undefined,
    embedding: undefined,
    metadata: input.metadata,
  }
  memories.unshift(memory)
  ensureAgent(input.agentId)
  agents.get(input.agentId)!.memoryCount++
  agents.get(input.agentId)!.storageUsed += input.content.length
  return memory
}

export function updateMemoryEmbedding(id: string, embedding: number[], model: string) {
  const memory = memories.find(m => m.id === id)
  if (!memory) return
  memory.embedding = embedding
  memory.embeddingModel = model
  memory.embeddingUpdatedAt = Date.now()
  memory.updatedAt = Date.now()
}

export function getMemoriesMissingEmbeddings(agentId: string): Memory[] {
  return memories.filter(m => m.agentId === agentId && (!m.embedding || m.embedding.length === 0))
}

export function getMemories(agentId: string, type?: string, limit = 20): Memory[] {
  let r = memories.filter(m => m.agentId === agentId)
  if (type) r = r.filter(m => m.type === type)
  return r.sort((a, b) => b.importance - a.importance || b.createdAt - a.createdAt).slice(0, limit)
}

export function getMemoryById(id: string): Memory | undefined {
  const m = memories.find(m => m.id === id)
  if (m) { m.accessCount++; agents.get(m.agentId) && agents.get(m.agentId)!.totalReads++ }
  return m
}

export function deleteMemory(id: string, agentId: string): boolean {
  const idx = memories.findIndex(m => m.id === id && m.agentId === agentId)
  if (idx === -1) return false
  memories.splice(idx, 1)
  const a = agents.get(agentId)
  if (a) a.memoryCount = Math.max(0, a.memoryCount - 1)
  return true
}

export function searchMemories(agentId: string, query: string): Memory[] {
  const q = query.toLowerCase()
  return memories
    .filter(m => m.agentId === agentId)
    .map(m => ({ m, score: scoreMemory(m, q) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(r => r.m)
}

export function searchMemoriesByEmbedding(agentId: string, queryEmbedding: number[], limit = 10): Memory[] {
  return memories
    .filter(m => m.agentId === agentId && m.embedding && m.embedding.length === queryEmbedding.length)
    .map(memory => {
      const sim = cosineSimilarity(memory.embedding!, queryEmbedding)
      const imp = memory.importance * 0.015
      const ageDays = (Date.now() - memory.updatedAt) / (1000 * 60 * 60 * 24)
      const recency = Math.max(0, 0.05 - (ageDays * 0.001)) // Recency bonus decays over time
      
      return {
        memory,
        score: sim + imp + recency,
      }
    })
    .filter(result => Number.isFinite(result.score) && result.score > 0)
    .sort((a, b) => b.score - a.score || b.memory.createdAt - a.memory.createdAt)
    .slice(0, limit)
    .map(result => result.memory)
}

function scoreMemory(m: Memory, q: string): number {
  let s = 0
  if (m.content.toLowerCase().includes(q)) s += 3
  if (m.tags.some(t => t.toLowerCase().includes(q))) s += 2
  s += m.importance * 0.2
  return s
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0
  let aNorm = 0
  let bNorm = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    aNorm += a[i] * a[i]
    bNorm += b[i] * b[i]
  }

  if (!aNorm || !bNorm) return 0
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm))
}

// ── Skill CRUD ────────────────────────────────────────────────

export function createSkill(input: CreateSkillInput): Skill {
  const skill: Skill = {
    id: `skill_${uuid().slice(0, 8)}`,
    name: input.name,
    description: input.description,
    category: input.category || 'General',
    prompt: input.prompt,
    inputLabel: input.inputLabel || 'Your input',
    outputLabel: input.outputLabel || 'Result',
    price: input.price,
    publisherAddress: input.publisherAddress || ZERO_ADDRESS,
    publisherName: input.publisherName || 'Anonymous',
    publisherAgentId: input.publisherAgentId,
    createdAt: Date.now(), usageCount: 0, totalEarned: 0,
    tags: input.tags || [],
    storageHash: undefined,
  }
  skills.unshift(skill)
  ensureAgent(input.publisherAgentId)
  agents.get(input.publisherAgentId)!.skillsPublished++
  return skill
}

export function getMemoriesByAgent(agentId: string): Memory[] {
  return memories.filter(m => m.agentId === agentId)
}

export function getAllSkills(): Skill[] {
  return [...skills].sort((a, b) => b.usageCount - a.usageCount)
}

export function getSkillsByAgent(agentId: string): Skill[] {
  return skills.filter(s => s.publisherAgentId === agentId)
}

export function getSkillById(id: string): Skill | undefined {
  return skills.find(s => s.id === id)
}

export function recordSkillExecution(id: string): void {
  const skill = skills.find(s => s.id === id)
  if (!skill) return
  skill.usageCount++
  const earned = parseFloat(skill.price)
  const fee = earned * 0.05
  skill.totalEarned += earned - fee
  platformRevenue += fee
  const a = agents.get(skill.publisherAgentId)
  if (a) a.totalEarned += earned - fee
}

// ── Agent ─────────────────────────────────────────────────────

function ensureAgent(agentId: string) {
  if (!agents.has(agentId)) {
    agents.set(agentId, {
      agentId, name: agentId.replace('agent_', ''),
      createdAt: Date.now(), memoryCount: 0, skillsPublished: 0,
      totalReads: 0, totalEarned: 0, storageUsed: 0, openClawConnected: false,
    })
  }
}

export function getAgent(agentId: string): AgentIdentity | undefined {
  if (!_seeded) loadSeedData()
  return agents.get(agentId)
}

export function getAllAgents(ownerAddress?: string): AgentIdentity[] {
  if (!_seeded) loadSeedData()
  const all = Array.from(agents.values())
  if (ownerAddress) {
    return all.filter(a => a.ownerAddress?.toLowerCase() === ownerAddress.toLowerCase())
  }
  return all
}

// ── Seed helpers — used by /api/seed-0g ──────────────────────
// Returns ALL memories/skills regardless of agent, for bulk upload
export function getAllMemoriesForSeed(): Memory[] {
  if (!_seeded) loadSeedData()
  return [...memories]
}

export function getAllSkillsForSeed(): Skill[] {
  if (!_seeded) loadSeedData()
  return [...skills]
}

// ── Platform stats ────────────────────────────────────────────

// ── Hash updaters — called after 0G upload completes ─────────
// These replace the mock hash with the real 0G rootHash

export function updateMemoryHash(id: string, hash: string) {
  const m = memories.find(m => m.id === id)
  if (m) m.storageHash = hash
}

export function upsertHydratedMemory(memory: Memory) {
  const existingIndex = memories.findIndex(item => item.id === memory.id)
  if (existingIndex >= 0) {
    memories[existingIndex] = { ...memories[existingIndex], ...memory }
    return
  }
  memories.unshift(memory)
}

export function updateSkillHash(id: string, hash: string) {
  const s = skills.find(s => s.id === id)
  if (s) s.storageHash = hash
}

export function upsertHydratedSkill(skill: Skill) {
  const existingIndex = skills.findIndex(item => item.id === skill.id)
  if (existingIndex >= 0) {
    skills[existingIndex] = { ...skills[existingIndex], ...skill }
    return
  }
  skills.unshift(skill)
}

export function removeSkillFromStore(id: string) {
  const index = skills.findIndex(skill => skill.id === id)
  if (index >= 0) skills.splice(index, 1)
}

export function getPlatformStats(): PlatformStats {
  return {
    totalMemories: memories.length,
    totalSkills: skills.length,
    totalAgents: agents.size,
    totalExecutions: skills.reduce((s, sk) => s + sk.usageCount, 0),
    totalReads: Array.from(agents.values()).reduce((s, a) => s + a.totalReads, 0),
    platformRevenue,
  }
}

// ── Agent identity hash updater ───────────────────────────────
export function updateAgentHash(agentId: string, hash: string) {
  const a = agents.get(agentId)
  if (a) (a as any).identityHash = hash
}

export function upsertHydratedAgent(agent: AgentIdentity) {
  const existing = agents.get(agent.agentId)
  if (existing) {
    agents.set(agent.agentId, { ...existing, ...agent })
    return
  }
  agents.set(agent.agentId, agent)
}

export function registerOrUpdateAgent(agentId: string, name: string, ownerAddress?: string): AgentIdentity {
  const existing = agents.get(agentId)
  if (existing) {
    // Security: If agent already has an owner, reject updates from a different wallet
    if (ownerAddress && existing.ownerAddress && existing.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      throw new Error(`Agent ID [${agentId}] is already owned by another wallet.`)
    }
    existing.name = name || existing.name
    if (ownerAddress && !existing.ownerAddress) existing.ownerAddress = ownerAddress.toLowerCase()
    return existing
  }
  
  const apiKey = `mos_live_${uuid().replace(/-/g, '').substring(0, 20)}`
  
  const agent: AgentIdentity = {
    agentId, name: name || agentId,
    createdAt: Date.now(),
    memoryCount: 0, skillsPublished: 0,
    totalReads: 0, totalEarned: 0,
    storageUsed: 0, openClawConnected: false,
    ownerAddress: ownerAddress?.toLowerCase(),
    apiKey
  }
  agents.set(agentId, agent)
  return agent
}


export function getPlatformRevenue() {
  return platformRevenue
}

export function getPaymentVerification(txHash: string) {
  return paymentVerifications.get(txHash.toLowerCase())
}

export function markPaymentVerified(verification: PaymentVerification) {
  paymentVerifications.set(verification.txHash.toLowerCase(), verification)
}

export function markPaymentConsumed(txHash: string) {
  const existing = paymentVerifications.get(txHash.toLowerCase())
  if (existing) existing.consumedAt = Date.now()
}

// ── Atomic, in-process payment reservation (double-spend guard) ──────────────
// Node runs this synchronously on a single thread, so check-and-set here is
// race-free WITHIN a process. `reservePaymentTxHash` claims a txHash before the
// (slow, async) on-chain verification runs, closing the TOCTOU window where two
// concurrent requests could each pass a "not consumed yet" check. Cross-restart
// durability is handled separately in lib/db/payments.ts.
const reservedPaymentTxHashes = new Set<string>()

export function reservePaymentTxHash(txHash: string): boolean {
  const key = txHash.toLowerCase()
  if (reservedPaymentTxHashes.has(key)) return false
  reservedPaymentTxHashes.add(key)
  return true
}

export function releasePaymentTxHash(txHash: string): void {
  reservedPaymentTxHashes.delete(txHash.toLowerCase())
}

export function removeMemoryFromStore(id: string) {
  const index = memories.findIndex(memory => memory.id === id)
  if (index >= 0) memories.splice(index, 1)
}

const walletNonces: Record<string, number> = {}
export function getWalletNonce(address: string) { return walletNonces[address] || 0 }
export function incrementWalletNonce(address: string) { walletNonces[address] = getWalletNonce(address) + 1 }
