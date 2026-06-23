# Modules

Modules are installable capabilities for memos agents.

New docs and framework APIs should use Module.

## Purpose

A Module gives an Agent one atomic capability without taking ownership of the Agent's memory, runtime, identity, Marketplace state, or Economy state.

## Module Rules

- A Module does exactly one thing.
- A Module is installable.
- A Module is callable by a memos Agent.
- A Module can be distributed through Marketplace.
- A Module can be priced through Economy.
- A Module must not own agent memory.
- A Module must not own agent state.
- A Module must not directly access 0G.
- A Module must use memos Adapters for storage, compute, or chain operations.

## Package Structure

```text
manifest.yaml
handler.py
README.md
```

## manifest.yaml

Defines Module metadata:

- Name
- Version
- Description
- Inputs
- Outputs
- Pricing metadata when used by Marketplace
- Required Adapter capabilities when applicable

## handler.py

Contains the Module execution entrypoint.

The handler receives input from memos and returns output to memos. memos decides whether the output should become Memory, trigger Reason, update Ledger, or produce a transaction proof.

## README.md

Explains what the Module does, what input it expects, what output it returns, and how Agents should use it.

## Module Installation

Module Installation is the act of adding a Module to an Agent through memos.

Runtime owns the Installer and Module Loader components. Marketplace owns catalog, publishers, discovery, and usage analytics. Economy owns pricing, metering, and ledger records.

## Relationship To Brain

Modules may support Brain activity, but they do not become the Brain.

- Remember may store useful Module outputs.
- Reason may call a Module as part of an answer.
- Dream may use Module results during consolidation.

## Relationship To Runtime

Modules may be called from a LangGraph Graph when LangGraph Runtime is used.

Runtime executes the LangGraph Graph. memos owns Module Installation, Module access, pricing, usage metering, and persistence.

## Relationship To Marketplace

Marketplace distributes Modules.

Marketplace owns:

- Catalog
- Publishers
- Discovery
- Usage Analytics

Marketplace does not own Module execution semantics, memory, or agent state.

## Relationship To Economy

Economy prices and meters Module execution.

Users pay per Module execution. Economy updates Ledger records.

## Relationship To 0G

0G Storage stores Module manifests.

0G Compute may run inference or embeddings needed by a Module when memos routes execution through the Compute Adapter.

0G Chain stores transaction proofs for paid Module execution.

## Examples

- Ticket classifier
- Code review summarizer
- Market brief generator
- Document parser
- Preference extractor
