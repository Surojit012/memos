# How memos Uses 0G

memos integrates with the 0G ecosystem instead of rebuilding systems that already exist.

memos owns framework behavior. 0G owns infrastructure.

## Adapter Rule

Brain never talks directly to 0G.

Runtime never talks directly to 0G.

Modules never talk directly to 0G.

All 0G access goes through memos Adapters:

- Storage Adapter
- Compute Adapter
- Chain Adapter

## 0G Storage

memos uses 0G Storage for durable framework state.

Stored on 0G Storage:

- Agent Memories
- Module Manifests
- Runtime Checkpoints

## 0G Compute

memos uses 0G Compute for cognition work.

Executed through 0G Compute:

- Embeddings
- Inference
- Dreams

All LLM providers are replaceable. memos must survive if any provider changes.

## 0G Chain

memos uses 0G Chain for verifiable ownership and economic proof.

Stored or verified on 0G Chain:

- Identity
- Transaction Proofs

## Layer Mapping

| memos Layer | 0G Dependency |
|:--|:--|
| Brain | Uses Adapters for memory, inference, and dreams |
| Runtime | Uses Storage Adapter for checkpoint persistence |
| Modules | Uses Storage Adapter for Module manifests |
| Marketplace | Uses Module manifest references |
| Economy | Uses Chain Adapter for transaction proofs |
| Adapters | Own all direct 0G integration |
| 0G Infrastructure | Storage, Compute, Chain |

## AI-Native Rule

Claude Code, Cursor, 0G AI Context, 0G Agent Skills, 0G Compute Skills, and `@0gfoundation/0g-cc` should integrate through memos framework context and Adapters.

memos does not rebuild those systems.
