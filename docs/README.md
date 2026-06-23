# memos

memos is a 0G-native framework for persistent AI agents.

memos owns an AI agent's long-term cognition. It is not a landing page, not an agent orchestrator, and not a blockchain application.

## Framework Stack

```
Claude / Cursor
    |
AI Context
    |
memos
    |
Adapters
    |
0G Infrastructure
```

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

## Rules

- Brain never talks directly to 0G. Brain always uses Adapters.
- Runtime never owns memories. Runtime only owns execution state.
- Marketplace never owns agent state.
- Modules are atomic. Each Module does exactly one thing.
- LangGraph is optional. memos Brain is mandatory.
- 0G is infrastructure. 0G is never business logic.
- memos must survive if any LLM provider changes. All providers are replaceable.

## Naming

- Module = installable capability
- LangGraph Graph = LangGraph execution graph
- Module Installation = adding a Module to an Agent through memos

## Core Docs

- [PRODUCT.md](./PRODUCT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [FRAMEWORK_PRIMITIVES.md](./FRAMEWORK_PRIMITIVES.md)
- [RUNTIME_SPEC.md](./RUNTIME_SPEC.md)
- [MODULES.md](./MODULES.md)
- [AI_CONTEXT.md](./AI_CONTEXT.md)
- [HOW_WE_USE_0G.md](./HOW_WE_USE_0G.md)
