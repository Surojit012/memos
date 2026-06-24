export type MemoryType = 'episodic' | 'semantic' | 'procedural'

export interface Memory {
  id: string
  agentId: string
  content: string
  type: MemoryType
  importance: number
  tags: string[]
  createdAt?: string
  accessCount: number
  decayScore: number
}

export interface SearchResult {
  id: string
  content: string
  type: MemoryType
  importance: number
  score: number
  tags: string[]
}

export interface RAGSource {
  id: string
  content: string
  type: string
}

export interface RAGResponse {
  answer: string
  sources: RAGSource[]
  confidence: number
}

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  price: number
  publisher: string
}

export interface SkillResult {
  skillId: string
  result: string
  tokensUsed: number
  model: string
  computeProvider: string
}

export interface DreamResult {
  memoriesAnalyzed: number
  patternsFound: number
  newMemoriesCreated: number
  dreamSummary: string
  newMemories: string[]
  duration: number
}

export interface PipelineStep {
  skillId: string
}

export interface PipelineStepResult {
  stepNumber: number
  skillId: string
  skillName: string
  input: string
  output: string
  duration: number
}

export interface PipelineResult {
  pipelineId: string
  steps: PipelineStepResult[]
  finalOutput: string
  totalDuration: number
}

export interface ClientConfig {
  apiKey: string
  agentId: string
  baseUrl?: string
  timeout?: number
}

export interface StoreMemoryOptions {
  content: string
  type?: MemoryType
  importance?: number
  tags?: string[]
}

export interface SearchOptions {
  query: string
  searchType?: 'keyword' | 'semantic'
  limit?: number
}

export interface QueryOptions {
  question: string
  includeSources?: boolean
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}
