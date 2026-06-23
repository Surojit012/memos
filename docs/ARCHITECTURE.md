# Architecture

memos is a 0G-native framework for persistent AI agents.

memos owns an agent's long-term cognition. memos is not an agent orchestrator, not a blockchain application, and not a LangGraph wrapper.

```
Claude / Cursor
    |
AI Context
    |
memos Framework
    |
Adapters
    |
0G Infrastructure
```

## Architecture Rules

1. Brain never talks directly to 0G. Brain always uses Adapters.
2. Runtime never owns memories. Runtime only owns execution state.
3. Marketplace never owns agent state.
4. Modules are atomic. Each Module does exactly one thing.
5. LangGraph is optional. memos Brain is mandatory.
6. 0G is infrastructure. 0G is never business logic.
7. memos must survive if any LLM provider changes. All providers are replaceable.

## Naming

- Module = installable capability
- LangGraph Graph = LangGraph execution graph
- Module Installation = adding a Module to an Agent through memos

## Brain

Brain is mandatory. It owns long-term cognition.

Lifecycle:

```
Remember -> Reason -> Dream
```

Responsibilities:

- Memory management
- Retrieval
- Consolidation
- Learning from durable memory

Brain uses Adapters for storage, compute, and chain access. Brain never talks directly to 0G.

## Runtime

Runtime is optional.

memos uses LangGraph as the execution runtime when graph execution is useful. Runtime owns execution state only.

Runtime owns:

- Execution state
- Thread state
- Resume lifecycle
- Checkpoint lifecycle

Runtime components:

- LangGraph Runtime
- LangGraph Checkpointer
- Thread Manager
- Graph Builder
- Execution Context
- Installer
- Module Loader

memos owns checkpoint persistence. LangGraph never directly accesses 0G.

## Modules

Modules are installable capabilities.

Module package structure:

```
manifest.yaml
handler.py
README.md
```

Rules:

- Modules are atomic.
- Each Module does exactly one thing.
- Modules are compatible with 0G Agent Skills philosophy.
- Modules do not own memory.
- Modules do not own agent state.

## Marketplace

Marketplace distributes Modules.

Marketplace owns:

- Catalog
- Publishers
- Discovery
- Usage Analytics

Marketplace does not own memory or agent state.

## Economy

Economy is lightweight and usage-based.

Economy owns:

- Pricing Engine
- Usage Meter
- Ledger

Users pay per Module execution. Economy does not define systems outside Pricing Engine, Usage Meter, and Ledger.

## Adapters

Adapters isolate memos business logic from infrastructure.

Adapters:

- Storage Adapter
- Compute Adapter
- Chain Adapter

Brain, Runtime, Modules, Marketplace, and Economy use Adapters when they need 0G-backed storage, compute, identity, or transaction proof operations.

## 0G Infrastructure

0G is infrastructure. 0G is never business logic.

0G Storage:

- Agent Memories
- Module Manifests
- Runtime Checkpoints

0G Compute:

- Embeddings
- Inference
- Dreams

0G Chain:

- Identity
- Transaction Proofs

## AI-Native Integration

memos must remain aligned with:

- 0G AI Context
- 0G Agent Skills
- 0G Compute Skills
- Claude Code
- Cursor
- `@0gfoundation/0g-cc`

memos integrates with these systems. It does not rebuild them.

## Architecture Tree

```text
memos
├── Brain
│   ├── Remember
│   ├── Reason
│   └── Dream
├── Runtime
│   ├── LangGraph Runtime
│   ├── LangGraph Checkpointer
│   ├── Thread Manager
│   ├── Graph Builder
│   ├── Execution Context
│   ├── Installer
│   └── Module Loader
├── Modules
│   ├── manifest.yaml
│   ├── handler.py
│   └── README.md
├── Marketplace
│   ├── Catalog
│   ├── Publishers
│   ├── Discovery
│   └── Usage Analytics
├── Economy
│   ├── Pricing Engine
│   ├── Usage Meter
│   └── Ledger
├── Adapters
│   ├── Storage Adapter
│   ├── Compute Adapter
│   └── Chain Adapter
└── 0G Infrastructure
    ├── 0G Storage
    │   ├── Agent Memories
    │   ├── Module Manifests
    │   └── Runtime Checkpoints
    ├── 0G Compute
    │   ├── Embeddings
    │   ├── Inference
    │   └── Dreams
    └── 0G Chain
        ├── Identity
        └── Transaction Proofs
```
