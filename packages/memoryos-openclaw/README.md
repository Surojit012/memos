# memoryos-openclaw

One import, one config object, and your OpenClaw-style agent gets MemoryOS memory, skills, and identity helpers.

## Install

```bash
npm install memoryos-openclaw
```

## Usage

```js
import { MemoryOSPlugin } from "memoryos-openclaw";

const plugin = MemoryOSPlugin({
  apiUrl: "https://your-memoryos.vercel.app",
  agentId: "agent_researcher_01",
});

const agent = plugin.attach({});

await agent.memory.save("User prefers short answers", {
  type: "semantic",
  tags: ["user", "style"],
  importance: 4,
});

const search = await agent.memory.search("response preferences");
const result = await agent.skills.run("skill_summarizer", "Summarize this text");
```

## Exports

- `MemoryOSPlugin(config)` creates an adapter with `memory`, `skills`, and `identity` helpers
- `MemoryOSClient(config)` gives direct API access without attaching to an agent object

## Notes

- The package is transport-only. It talks to your MemoryOS app APIs.
- Skill execution and semantic search quality depend on the backend model/provider configured in MemoryOS.
