import { MemosClient } from '../src/client'
import { AuthError, MemosError, RateLimitError, ServerError } from '../src/errors'

function mockFetch(status: number, data: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as Response)
}

describe('MemosClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('throws AuthError when apiKey is empty', () => {
    expect(() => new MemosClient({ apiKey: '', agentId: 'agent' })).toThrow(AuthError)
  })

  test('throws MemosError when agentId is empty', () => {
    expect(() => new MemosClient({ apiKey: 'key', agentId: '' })).toThrow(MemosError)
  })

  test('storeMemory returns Memory on 200', async () => {
    mockFetch(200, { id: 'mem_1', agentId: 'agent', content: 'test', type: 'episodic', importance: 3, tags: [], accessCount: 0, decayScore: 1.0 })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    const result = await client.storeMemory({ content: 'test' })
    expect(result.id).toBe('mem_1')
    expect(result.content).toBe('test')
  })

  test('storeMemory throws AuthError on 401', async () => {
    mockFetch(401, { error: 'Unauthorized' })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    await expect(client.storeMemory({ content: 'test' })).rejects.toThrow(AuthError)
  })

  test('storeMemory throws RateLimitError on 429', async () => {
    mockFetch(429, { error: 'Rate limited' })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    await expect(client.storeMemory({ content: 'test' })).rejects.toThrow(RateLimitError)
  })

  test('storeMemory throws ServerError on 500', async () => {
    mockFetch(500, { error: 'Internal server error' })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    await expect(client.storeMemory({ content: 'test' })).rejects.toThrow(ServerError)
  })

  test('listMemories returns Memory array', async () => {
    mockFetch(200, [{ id: 'mem_1', agentId: 'agent', content: 'test', type: 'episodic', importance: 3, tags: [], accessCount: 0, decayScore: 1.0 }])
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    const result = await client.listMemories()
    expect(Array.isArray(result)).toBe(true)
    expect(result[0].id).toBe('mem_1')
  })

  test('search returns SearchResult array', async () => {
    mockFetch(200, { results: [{ id: 'mem_1', content: 'test', type: 'semantic', importance: 4, score: 0.92, tags: [] }] })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    const result = await client.search({ query: 'test' })
    expect(Array.isArray(result)).toBe(true)
    expect(result[0].score).toBe(0.92)
  })

  test('query returns RAGResponse', async () => {
    mockFetch(200, { answer: 'Python', sources: [], confidence: 0.95 })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    const result = await client.query({ question: 'what language?' })
    expect(result.answer).toBe('Python')
    expect(result.confidence).toBe(0.95)
  })

  test('triggerDream returns DreamResult', async () => {
    // Mock the REAL /api/agent/[id]/dreams response shape.
    mockFetch(200, { totalMemoriesProcessed: 5, consolidatedCount: 1, message: 'test', consolidated: ['a fact'], durationMs: 1200 })
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent' })
    const result = await client.triggerDream()
    expect(result.memoriesAnalyzed).toBe(5)
    expect(result.newMemoriesCreated).toBe(1)
    expect(result.newMemories).toEqual(['a fact'])
  })

  test('request times out and throws MemosError', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      new Promise((_, reject) => setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100))
    )
    const client = new MemosClient({ apiKey: 'key', agentId: 'agent', timeout: 50 })
    await expect(client.storeMemory({ content: 'test' })).rejects.toThrow(MemosError)
  })
})
