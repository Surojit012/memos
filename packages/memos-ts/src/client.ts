import { AuthError, MemosError, NotFoundError, RateLimitError, ServerError } from './errors'
import {
  ClientConfig,
  DreamResult,
  Memory,
  PipelineResult,
  PipelineStep,
  QueryOptions,
  RAGResponse,
  SearchOptions,
  SearchResult,
  Skill,
  SkillResult,
  StoreMemoryOptions
} from './types'

export class MemosClient {
  private readonly apiKey: string
  private readonly agentId: string
  private readonly baseUrl: string
  private readonly timeout: number

  constructor(config: ClientConfig) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new AuthError()
    }
    if (!config.agentId || config.agentId.trim() === '') {
      throw new MemosError('agentId is required')
    }

    this.apiKey = config.apiKey
    this.agentId = config.agentId
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'https://memos.io'
    this.timeout = config.timeout ?? 30000
  }

  private async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'memos/0.1.0'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      if (!response.ok) {
        if (response.status === 401) throw new AuthError()
        if (response.status === 429) throw new RateLimitError()
        if (response.status === 404) throw new NotFoundError()
        if (response.status >= 500) throw new ServerError('Server error', response.status)
        
        const errorText = await response.text()
        throw new MemosError(`Request failed: ${errorText}`, response.status)
      }

      return await response.json() as T
    } catch (error) {
      if (error instanceof MemosError) {
        throw error
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new MemosError('Request timed out')
      }
      throw new MemosError(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Store a new memory for this agent.
   */
  async storeMemory(options: StoreMemoryOptions): Promise<Memory> {
    const data = await this._request<any>('POST', '/api/memory', {
      agentId: this.agentId,
      content: options.content,
      type: options.type ?? 'episodic',
      importance: options.importance ?? 3,
      tags: options.tags ?? []
    })
    return data.memory || data
  }

  /**
   * List all memories for this agent.
   */
  async listMemories(): Promise<Memory[]> {
    const data = await this._request<any>('GET', `/api/memory?agentId=${encodeURIComponent(this.agentId)}`)
    return data.memories || data || []
  }

  /**
   * Delete a memory by ID.
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    await this._request('DELETE', `/api/memory/${encodeURIComponent(memoryId)}`)
    return true
  }

  /**
   * Search agent memories.
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const data = await this._request<any>('POST', '/api/search', {
      agentId: this.agentId,
      query: options.query,
      searchType: options.searchType ?? 'keyword',
      limit: options.limit ?? 10
    })
    return data.results || data || []
  }

  /**
   * Query the agent with memory-backed RAG.
   */
  async query(options: QueryOptions): Promise<RAGResponse> {
    return this._request<RAGResponse>('POST', '/api/rag', {
      agentId: this.agentId,
      query: options.question,
      conversationHistory: options.conversationHistory ?? []
    })
  }

  /**
   * Trigger a dream consolidation cycle.
   */
  async triggerDream(): Promise<DreamResult> {
    const data = await this._request<any>('POST', `/api/agent/${encodeURIComponent(this.agentId)}/dreams`, {})
    // Map the API response fields → DreamResult.
    return {
      memoriesAnalyzed: data.totalMemoriesProcessed ?? 0,
      patternsFound: data.consolidatedCount ?? 0,
      newMemoriesCreated: data.consolidatedCount ?? 0,
      dreamSummary: data.message ?? '',
      newMemories: data.consolidated ?? [],
      duration: data.durationMs ?? 0
    }
  }

  /**
   * List available skills.
   */
  async listSkills(): Promise<Skill[]> {
    const data = await this._request<any>('GET', '/api/skills')
    return data.skills || data || []
  }

  /**
   * Execute a skill.
   */
  async executeSkill(skillId: string, input: string): Promise<SkillResult> {
    const data = await this._request<any>('POST', '/api/execute', {
      agentId: this.agentId,
      skillId,
      userInput: input
    })
    // Map the API response (output/model/tokensUsed) → SkillResult.
    return {
      skillId,
      result: data.output ?? '',
      tokensUsed: data.tokensUsed ?? 0,
      model: data.model ?? '',
      computeProvider: data.computeProvider ?? ''
    }
  }

  /**
   * Run a multi-skill pipeline.
   */
  async runPipeline(steps: PipelineStep[], input: string): Promise<PipelineResult> {
    return this._request<PipelineResult>('POST', '/api/pipeline', {
      agentId: this.agentId,
      steps,
      initialInput: input
    })
  }

  /**
   * Get agent identity and reputation.
   */
  async getIdentity(): Promise<Record<string, unknown>> {
    return this._request<Record<string, unknown>>('GET', `/api/agent/${encodeURIComponent(this.agentId)}/reputation`)
  }
}
