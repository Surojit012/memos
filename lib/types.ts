/**
 * lib/types.ts — all data shapes for MemoryOS
 */

// ── Memory ────────────────────────────────────────────────────

export type MemoryType = 'episodic' | 'semantic' | 'procedural'

export interface Memory {
  id: string
  agentId: string
  type: MemoryType
  content: string
  tags: string[]
  importance: number        // 1–5
  createdAt: number
  updatedAt: number
  accessCount: number
  storageHash?: string      // 0G Storage root hash
  embedding?: number[]
  embeddingModel?: string
  embeddingUpdatedAt?: number
  metadata?: Record<string, string>
}

export interface CreateMemoryInput {
  agentId: string
  type: MemoryType
  content: string
  tags?: string[]
  importance?: number
  metadata?: Record<string, string>
}

// ── Skill ─────────────────────────────────────────────────────

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  prompt: string            // System prompt — the brain of the skill
  inputLabel: string
  outputLabel: string
  price: string             // OG tokens per execution
  publisherAddress: string
  publisherName: string
  publisherAgentId: string  // Links to Agent ID on 0G
  createdAt: number
  usageCount: number
  totalEarned: number       // OG tokens earned by publisher
  tags: string[]
  storageHash?: string      // 0G Storage root hash
  version?: number          // Skill version (increments on update)
  previousVersionHash?: string // 0G hash of the previous version (immutable chain)
}

// ── Execution Receipt ─────────────────────────────────────────

export interface ExecutionReceipt {
  receiptId: string
  skillId: string
  skillName: string
  executorAgentId?: string
  inputHash: string         // SHA-256 of the user input
  outputHash: string        // SHA-256 of the LLM output
  model: string
  tokensUsed: number
  costOg: string
  computeNode: string
  timestamp: number
  storageHash?: string      // 0G Storage root hash of this receipt
  paymentTxHash?: string
  pipelineId?: string       // If part of a pipeline execution
}

export interface CreateSkillInput {
  name: string
  description: string
  category: string
  prompt: string
  inputLabel?: string
  outputLabel?: string
  price: string
  publisherAddress?: string
  publisherName: string
  publisherAgentId: string
  tags?: string[]
}

// ── Agent Identity ────────────────────────────────────────────

export interface AgentIdentity {
  agentId: string
  name: string
  createdAt: number
  memoryCount: number
  skillsPublished: number
  totalReads: number
  totalEarned: number       // OG from skill sales
  storageUsed: number
  openClawConnected: boolean
  identityHash?: string     // 0G Storage hash — the on-chain identity proof
  ownerAddress?: string     // Web3 wallet address that created the agent
  apiKey?: string           // Secret key to authenticate via OpenClaw
  snapshots?: string[]      // Array of 0G Storage hashes for full brain snapshots
}

// ── Platform stats ────────────────────────────────────────────

export interface PlatformStats {
  totalMemories: number
  totalSkills: number
  totalAgents: number
  totalExecutions: number
  totalReads: number
  platformRevenue: number   // OG tokens collected as fees
}

export interface PaymentVerification {
  txHash: string
  skillId: string
  payer: string
  publisherAddress: string
  platformAddress: string
  grossAmountWei: string
  publisherAmountWei: string
  platformFeeWei: string
  blockNumber: number
  chainId: number
  verifiedAt: number
  consumedAt?: number
}

// ── Compute Provider ─────────────────────────────────────────

export type ComputeProvider = 'fireworks' | '0g-compute' | '0g-router'

export interface ZGComputeService {
  provider: string
  model: string
  serviceType: 'chatbot' | 'text-to-image' | 'speech-to-text'
  inputPrice: string
  outputPrice: string
  verifiability: string  // 'TeeML' or ''
  url?: string
}

export interface ZGInferenceResult {
  output: string
  model: string
  tokensUsed: number
  providerAddress: string
  chatID: string
  verified: boolean
  serviceType: string
}

// ── Cross-Agent Memory Sharing (A2A) ─────────────────────────

export interface SharedMemoryGrant {
  id: string
  fromAgentId: string         // Agent sharing the memory
  fromAgentName: string
  toAgentId: string           // Agent receiving access
  toAgentName: string
  memoryIds: string[]         // Which memories are shared
  sharedAt: number
  expiresAt?: number          // Optional TTL
  accessCount: number         // How many times the recipient has read
  revoked: boolean
  message?: string            // Optional message from the sharer
  storageHashes?: string[]    // 0G Storage hashes for the shared memories
}
