# memos

TypeScript/JavaScript SDK for [memos](https://memos.io) — persistent brain framework for AI agents.

## Installation
```bash
npm install memos
```

## Requirements
Node.js 18+ (uses native `fetch`)
Works with Next.js, Express, Deno, Bun, and browser environments.

## Quick Start
```typescript
import { MemosClient } from 'memos'

const client = new MemosClient({
  apiKey: 'your_api_key',
  agentId: 'your_agent_id'
})

// Store a memory
await client.storeMemory({
  content: 'User prefers TypeScript',
  type: 'semantic',
  importance: 4
})

// Search memories
const results = await client.search({ query: 'language preferences' })
results.forEach(r => console.log(`${r.score.toFixed(2)} — ${r.content}`))

// Ask with memory context
const response = await client.query({ question: 'What does this user prefer?' })
console.log(response.answer)

// Trigger dream consolidation
const dream = await client.triggerDream()
console.log(`Created ${dream.newMemoriesCreated} new memories`)
```

## Authentication
Get your API key and agent ID from https://memos.io/dashboard

## Usage with Next.js
In server components or API routes:
```typescript
import { MemosClient } from 'memos'

const client = new MemosClient({
  apiKey: process.env.MEM0S_API_KEY!,
  agentId: process.env.MEM0S_AGENT_ID!
})
```

## Methods Reference

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `storeMemory` | `options` ({content, type, importance, tags}) | `Promise<Memory>` | Store a new memory for the agent |
| `listMemories` | None | `Promise<Memory[]>` | List all memories for the agent |
| `deleteMemory` | `memoryId` (string) | `Promise<boolean>` | Delete a specific memory by ID |
| `search` | `options` ({query, searchType, limit}) | `Promise<SearchResult[]>` | Search agent memories |
| `query` | `options` ({question, includeSources, conversationHistory}) | `Promise<RAGResponse>` | Ask a question using RAG |
| `triggerDream` | None | `Promise<DreamResult>` | Trigger a dream consolidation cycle |
| `listSkills` | None | `Promise<Skill[]>` | List all available skills in the marketplace |
| `executeSkill` | `skillId` (string), `input` (string) | `Promise<SkillResult>` | Execute a skill |
| `runPipeline` | `steps` (PipelineStep[]), `input` (string) | `Promise<PipelineResult>` | Run a multi-step pipeline |
| `getIdentity` | None | `Promise<Record<string, unknown>>` | Get the agent's identity and reputation |

## Error Handling
```typescript
import { MemosClient, AuthError, RateLimitError, MemosError } from 'memos'

try {
  await client.storeMemory({ content: '...' })
} catch (e) {
  if (e instanceof AuthError) console.error('Check your API key')
  else if (e instanceof RateLimitError) console.error('Slow down')
  else if (e instanceof MemosError) console.error(`API error ${e.statusCode}: ${e.message}`)
}
```

## License
MIT
