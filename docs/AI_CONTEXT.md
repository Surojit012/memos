# AI Context

memos is AI-native.

AI coding tools should understand memos from context before they write code. memos follows 0G's Zero Coding philosophy: developers describe agent behavior, and AI tools connect the framework to 0G infrastructure through memos abstractions.

## Stack

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

## Compatible Systems

memos must remain aligned with:

- 0G AI Context
- 0G Agent Skills
- 0G Compute Skills
- Claude Code
- Cursor
- `@0gfoundation/0g-cc`

memos integrates with these systems. It does not rebuild them.

## AI Tool Responsibilities

When an AI tool builds with memos, it should:

- Treat memos as the primary framework.
- Treat Brain as mandatory.
- Treat LangGraph as optional Runtime.
- Use Module for installable capabilities.
- Use LangGraph Graph for LangGraph execution graphs.
- Use Module Installation for adding Modules to an Agent.
- Use Marketplace for Module distribution.
- Use Economy for pricing, usage metering, and ledger records.
- Use Adapters for 0G access.

## AI Tool Boundaries

An AI tool must not:

- Turn memos into an application shell.
- Turn memos into an orchestrator.
- Turn memos into a LangGraph wrapper.
- Call 0G directly from Brain or LangGraph.
- Promote product features into framework primitives.
- Introduce other runtimes.
- Introduce custom orchestration layers.

## memos Ownership

memos owns:

- Remember
- Reason
- Dream
- Memory
- Marketplace
- Economy
- Adapters
- Checkpoint persistence
- Module Installation

LangGraph owns only execution state, thread state, resume lifecycle, and checkpoint lifecycle when Runtime is used.

## Naming Rules

- Module = installable capability
- LangGraph Graph = LangGraph execution graph
- Module Installation = adding a Module to an Agent through memos
- Marketplace = Module distribution
- Brain = cognition engine

Use these names consistently in docs and framework APIs.
