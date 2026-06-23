# memos-openclaw

One import, one config object, and your OpenClaw-style agent gets memos memory, skills, and identity helpers.

## Install

```bash
npm install memos-openclaw
```

## Quick Start

```js
import { memosClient } from "memos-openclaw";

const client = new memosClient({
  apiUrl: "http://localhost:3000",
  agentId: "agent_researcher_01",
});

// Save a memory
await client.memory.save("User prefers short answers", {
  type: "semantic",
  tags: ["user", "style"],
  importance: 4,
});

// Semantic search
const results = await client.memory.search("response preferences");

// Execute a skill
const output = await client.skills.run("skill_summarizer", "Summarize this text");

// Clean up
client.close();
```

## Plugin Mode (attach to existing agent)

```js
import { memosPlugin } from "memos-openclaw";

const plugin = memosPlugin({
  apiUrl: "https://your-memos.vercel.app",
  agentId: "agent_researcher_01",
});

const agent = plugin.attach({});

await agent.memory.save("User prefers short answers", { type: "semantic" });
await agent.dreams.sleep();  // Memory consolidation
```

## Full API Reference

| Namespace | Method | Description |
|:----------|:-------|:------------|
| `memory` | `.save(content, options?)` | Save a memory to 0G |
| `memory` | `.list(options?)` | List agent memories |
| `memory` | `.get(id)` | Get a specific memory |
| `memory` | `.search(query)` | Semantic search via 0G Compute |
| `memory` | `.delete(id)` | Delete a memory |
| `skills` | `.list()` | List marketplace skills |
| `skills` | `.publish(skill)` | Publish a new skill |
| `skills` | `.run(id, input, proof?)` | Execute a skill |
| `skills` | `.pay(action, id, txHash?)` | Prepare/verify payment |
| `identity` | `.get()` | Get agent identity |
| `identity` | `.register(name?)` | Register on 0G |
| `rag` | `.ask(query)` | Contextual RAG over memories |
| `dreams` | `.sleep()` | Trigger memory consolidation |
| `dreams` | `.history()` | Get dream cycle history |
| `snapshot` | `.create()` | Full brain snapshot to 0G |
| `snapshot` | `.list()` | List brain snapshots |
| `vault` | `.save(content, options?)` | Save encrypted memory |
| `vault` | `.list()` | List encrypted memories |
| `pipeline` | `.run(steps, input)` | Multi-skill pipeline |
| `sharing` | `.grant(agentId, ids, opts?)` | Share memories with another agent |
| `sharing` | `.list()` | List sharing grants |
| `sharing` | `.revoke(grantId)` | Revoke a share |
| `inft` | `.mint()` | Mint ERC-7857 brain INFT |
| `inft` | `.list()` | List minted INFTs |
| `status` | `()` | Platform health check |

## TypeScript

Full type definitions are included. All methods return properly typed promises:

```ts
import { memosClient, MemorySaveResponse, MemorySearchResponse } from "memos-openclaw";

const client = new memosClient({ apiUrl: "...", agentId: "..." });
const result: MemorySaveResponse = await client.memory.save("...");
const search: MemorySearchResponse = await client.memory.search("query");
```

## Notes

- The package is transport-only. It talks to your memos app APIs.
- Skill execution and semantic search quality depend on the backend model/provider configured in memos.
- All methods are async and return typed promises.
