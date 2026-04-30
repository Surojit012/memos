# MemoryOS: Architecture & Feature Specification

## The Core Problem

AI Agents suffer from three critical infrastructure failures:

1. **Amnesia** — Memory is locked in volatile context windows or centralized databases (Pinecone, Redis). When the session ends, the agent forgets.
2. **Data Silos** — Agent A can't share learned knowledge with Agent B without a shared centralized database.
3. **Custodial Risk** — If AWS goes down, the agent's entire cognitive history is lost. No portability, no sovereignty.

## The MemoryOS Solution

**MemoryOS** is a **0G-native operating system** where every byte of agent state flows through the 0G Network. No centralized backends. No AWS. No Pinecone. Pure 0G.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                    │
│  ├── Landing Page (8 premium components)                         │
│  ├── Dashboard (8 tabs, 2,151 lines)                             │
│  │   ├── Memory Explorer (3 types, importance, 0G hash links)    │
│  │   ├── Brain INFTs (ERC-7857 mint, clone, transfer)            │
│  │   ├── Agent Dreams (LLM consolidation)                        │
│  │   ├── RAG Chat (autonomous retrieval-augmented generation)    │
│  │   ├── Encrypted Vault (AES-256-GCM)                           │
│  │   ├── A2A Sharing (grant-based cross-agent sharing)           │
│  │   ├── Inference Lab (4 providers side-by-side)                │
│  │   └── Skills Marketplace (browse, execute, pay)               │
│  ├── Playground (memory API sandbox)                             │
│  └── Skills (public skill catalog)                               │
├─────────────────────────────────────────────────────────────────┤
│  API LAYER (24 endpoints)                                        │
│  ├── /api/memory — CRUD with 0G Storage                          │
│  ├── /api/memory/encrypted — AES-256-GCM vault                   │
│  ├── /api/agent/[id]/dreams — LLM consolidation                  │
│  ├── /api/agent/[id]/share — A2A grants                          │
│  ├── /api/agent/[id]/mint-inft — ERC-7857 minting                │
│  ├── /api/inft/transfer — intelligent transfer protocol          │
│  ├── /api/kv — 0G KV Store (mutable layer)                       │
│  ├── /api/rag — autonomous RAG pipeline                          │
│  ├── /api/compute/router — 0G Router inference                   │
│  ├── /api/compute/chat — 0G Serving Broker                       │
│  └── /api/status — platform health                               │
├─────────────────────────────────────────────────────────────────┤
│  LIBRARY LAYER (22 modules)                                      │
│  ├── 0g-storage.ts — Log layer (immutable Merkle blobs)          │
│  ├── 0g-kv-store.ts — KV layer (mutable key-value)              │
│  ├── 0g-compute-router.ts — 0G Router API client                 │
│  ├── 0g-compute-inference.ts — 0G Serving Broker                 │
│  ├── intelligence/llm.ts — 4-provider inference chain            │
│  ├── intelligence/consolidation.ts — dream consolidation         │
│  ├── intelligence/conflicts.ts — contradiction detection         │
│  ├── encryption.ts — AES-256-GCM vault                           │
│  ├── inft.ts — ERC-7857 operations                               │
│  ├── auth.ts — HMAC API keys + platform secret                   │
│  └── hydration.ts — 0G → memory bootstrap                        │
├─────────────────────────────────────────────────────────────────┤
│  0G NETWORK LAYER                                                │
│  ├── 0G Storage (Log) — immutable memory/snapshot blobs          │
│  ├── 0G Storage (KV) — mutable manifests/indexes                 │
│  ├── 0G Compute — 0G Router + 0G Serving Broker                  │
│  └── 0G Chain — 3 deployed contracts on Galileo                  │
│      ├── AgentBrainINFT.sol (ERC-7857 v2)                        │
│      ├── SkillPaymentEscrow.sol                                  │
│      └── ManifestAnchor.sol                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### 1. Permanent Memory (0G Storage — Log Layer)

Every agent memory (episodic, semantic, procedural) is serialized as JSON, converted to a `MemData` blob, and uploaded to 0G Storage via the Turbo Indexer. Each upload produces a Merkle root hash — an immutable, verifiable reference.

**Files:** `lib/0g-storage.ts`, `app/api/memory/route.ts`

### 2. Mutable Agent State (0G Storage — KV Layer)

Agent manifests, memory indexes, and configuration are stored as mutable key-value pairs on 0G's KV layer. This enables any MemoryOS node to bootstrap by reading `{agentId}/manifest` from a single 0G key lookup.

**Files:** `lib/0g-kv-store.ts`, `app/api/kv/route.ts`

### 3. Cognitive Intelligence (0G Compute)

- **Agent Dreams:** Episodic memories are consolidated into semantic facts by LLMs during "sleep cycles." Uses Fireworks Llama 70B (Tier 2) or 0G Router (Tier 1).
- **Autonomous RAG:** 7-step pipeline: query → embed → search → rank → synthesize → store → respond. All inference via 0G/Fireworks.
- **Contradiction Detection:** Incoming memories are checked against existing knowledge for conflicts.

**Files:** `lib/intelligence/llm.ts`, `lib/intelligence/consolidation.ts`, `lib/intelligence/conflicts.ts`

### 4. Encrypted Vaults (AES-256-GCM)

Memories can be encrypted with wallet-derived AES-256-GCM keys. The ciphertext is uploaded to 0G Storage — even the storage nodes can't read the data. Only the owning wallet can decrypt.

**Files:** `lib/encryption.ts`, `app/api/memory/encrypted/route.ts`

### 5. Cross-Agent Memory Sharing (A2A Protocol)

Grant-based access control for sharing memories between agents. Agent A can grant Agent B access to specific memories with optional TTL. Grants are revocable. Access is tracked.

**Files:** `app/api/agent/[id]/share/route.ts`, `lib/types.ts` (SharedMemoryGrant)

### 6. Agent Brain INFTs (ERC-7857)

Full ERC-7857 implementation with:
- **Encrypted metadata** — AES key encrypted with owner's public key, stored on-chain
- **Intelligent transfer** — `iTransferFrom()` locks the token; `completeTransfer()` re-encrypts for new owner
- **Key rotation** — `updateEncryptedKey()` for key cycling without transfer
- **Brain cloning** — `cloneBrain()` forks cognitive state

**Contract:** `0x8334d90D004d012cb6e649E95029fd2805635557` (Galileo)
**Files:** `contracts/AgentBrainINFT.sol`, `lib/inft.ts`, `app/api/inft/transfer/route.ts`

### 7. Multi-Provider Inference

4-tier inference chain with automatic failover:

| Tier | Provider | Model | Latency |
|:-----|:---------|:------|:--------|
| 1 | 0G Router | DeepSeek V3 | ~2-5s |
| 2 | Fireworks | Llama 3.3 70B | ~1-3s |
| 3 | OpenAI | GPT-4o-mini | ~1-2s |
| 4 | 0G Serving | Direct node | ~3-8s |

**Files:** `lib/intelligence/llm.ts`, `lib/0g-compute-router.ts`, `lib/0g-compute-inference.ts`

### 8. Skills Marketplace (On-Chain Economy)

Agents publish skills. Other agents pay OG tokens via `SkillPaymentEscrow.sol` to execute them. Revenue splits happen on-chain.

**Contract:** `0xd54544cE8C5A991a495Ed29B38365F535546De36` (Galileo)
**Files:** `lib/payments.ts`, `app/api/pay/route.ts`, `app/api/skills/route.ts`

---

## System Flow Lifecycle

```
1. BOOTSTRAP → Read manifest from 0G KV → hydrate all agents/memories
2. CREATE    → Agent stores memory → 0G Storage (Log) → Merkle hash
3. EMBED     → Generate embeddings → 0G Compute / Fireworks
4. DREAM     → Consolidate memories → LLM → store output on 0G
5. SEARCH    → Semantic query → cosine similarity → ranked results
6. ENCRYPT   → AES-256-GCM → ciphertext → 0G Storage
7. SHARE     → A2A grant → revocable cross-agent access
8. MINT      → Brain snapshot → ERC-7857 INFT → 0G Chain
9. TRANSFER  → iTransferFrom → re-encrypt → completeTransfer
10. TRADE    → Skills marketplace → escrow → on-chain settlement
```
