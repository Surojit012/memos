# memos

## Persistent Brain for AI Agents

memos gives AI agents memory, reasoning, consolidation, and growth across sessions.

---

## Problem

AI agents forget everything.

Most agents can answer one request, but they do not naturally keep durable memory over time. They lose user preferences, past decisions, learned behavior, and the context that makes them useful after the first session.

---

## Solution

memos gives agents a persistent brain.

It lets an agent:

- Remember important experiences.
- Dream to consolidate experiences into knowledge.
- Reason from stored memories.
- Grow by installing and using local Modules.

memos is a framework, not an app and not an agent orchestrator.

---

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

---

## Why 0G

memos is built for the 0G stack.

- **0G Storage** stores durable agent memories, module manifests, and runtime checkpoints.
- **0G Compute** supports reasoning, embeddings, inference, and dream consolidation.
- **0G Chain** anchors identity and transaction proofs.

The current V1 framework keeps these boundaries clean through local adapters and hooks. It does not hard-code providers.

---

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

---

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

---

## Quick Start

### Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pydantic pytest
```

### Run Tests

```bash
pytest tests/unit tests/integration tests/demo
```

### Run Demo

```bash
pytest tests/demo/test_memos_brain.py tests/demo/test_persistent_brain.py tests/demo/test_agent_growth.py
```

---

## Hackathon Alignment

memos is:

- **AI-native**: built for AI coding tools and agent frameworks.
- **0G-native**: designed around 0G Storage, 0G Compute, and 0G Chain.
- **Zero Coding aligned**: developers describe agent behavior while memos handles memory, reasoning, dreams, and modules.
- **Persistent-agent focused**: agents keep context, learn over time, and explain answers with citations.

memos V1 is the foundation for persistent AI agents on 0G.
