# MEMOS 🧠

> Persistent Brain for Autonomous AI Agents powered by 0G.

MEMOS gives AI agents durable memory, reasoning, knowledge consolidation, and growth across sessions.

[![Python SDK](https://img.shields.io/badge/Python_SDK-memos--ai-blue.svg)](https://pypi.org/project/memos-ai/)
[![TypeScript SDK](https://img.shields.io/badge/TypeScript_SDK-memos--sdk-blue.svg)](https://www.npmjs.com/package/memos-sdk)
[![PyPI version](https://img.shields.io/pypi/v/memos-ai.svg)](https://pypi.org/project/memos-ai/)
[![npm version](https://img.shields.io/npm/v/memos-sdk.svg)](https://www.npmjs.com/package/memos-sdk)
[![GitHub release](https://img.shields.io/github/v/release/Surojit012/memos.svg)](https://github.com/Surojit012/memos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

### Python

```bash
pip install memos-ai
```

### TypeScript

```bash
npm install memos-sdk
```

## Why MEMOS?

Traditional AI agents are stateless. 

MEMOS provides:

* 🧠 Remember experiences
* 💭 Dream and consolidate knowledge
* 🔎 Reason with citations
* 🌱 Grow with installable Modules

MEMOS is a framework, not an app and not an orchestrator.

## Problem

AI agents forget everything.

Most agents can answer one request, but they do not naturally keep durable memory over time. They lose user preferences, past decisions, learned behavior, and the context that makes them useful after the first session.

## Solution

MEMOS gives agents a persistent brain.

It lets an agent:

- Remember important experiences.
- Dream to consolidate experiences into knowledge.
- Reason from stored memories.
- Grow by installing and using local Modules.

## Cognitive Loop

```text
Remember
   ↓
Dream
   ↓
Reason
   ↓
Grow
```

- **Remember** stores episodic, semantic, and procedural memories.
- **Dream** turns repeated experiences into long-term knowledge.
- **Reason** answers with memory-backed context and citations.
- **Grow** installs and uses atomic Modules.

## Why 0G

MEMOS is built for the 0G stack.

- **0G Storage** stores durable agent memories, module manifests, and runtime checkpoints.
- **0G Compute** supports reasoning, embeddings, inference, and dream consolidation.
- **0G Chain** anchors identity and transaction proofs.

The current V1 framework keeps these boundaries clean through local adapters and hooks. It does not hard-code providers.

## Architecture

```text
Agent
  ↓
Persistent Brain
  ↓
Modules
  ↓
Marketplace
  ↓
0G Infrastructure
```

The Persistent Brain contains:

- Remember Engine
- Dream Engine
- Reason Engine
- Grow Layer
- Runtime Layer
- Agent Core

Modules are local installable capabilities. They are not agents, workflows, or marketplace items.

## Demo Flow

```text
Create Agent
  ↓
Remember
  ↓
Dream
  ↓
Reason
  ↓
Install Module
  ↓
Use Module
```

The demo shows an agent that remembers research activity, consolidates it into semantic memory, reasons with citations, installs a local module, and executes it deterministically.

## Python SDK Example

```python
from memos import MemosClient

client = MemosClient(
    api_key="YOUR_API_KEY",
    agent_id="YOUR_AGENT_ID",
)

client.store_memory(
    content="User likes black coffee."
)

results = client.search(
    query="coffee preferences"
)
```

## TypeScript SDK Example

```ts
import { MemosClient } from "memos-sdk";

const client = new MemosClient({
  apiKey: process.env.MEMOS_API_KEY!,
  agentId: "agent-001",
});

await client.storeMemory({
  content: "User likes black coffee.",
});

const results = await client.search({
  query: "coffee preferences",
});
```

## Links

* [PyPI](https://pypi.org/project/memos-ai/)
* [npm](https://www.npmjs.com/package/memos-sdk)
* [GitHub](https://github.com/Surojit012/memos)

## Project Status

Current Version:

v0.1.0

Published Packages:

* memos-ai (PyPI)
* memos-sdk (npm)

Tests:

61+ tests passing
