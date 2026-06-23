# memos — CEO Strategic Roadmap

> **Last Updated:** April 30, 2026  
> **Status:** Active  
> **Network:** 0G Network (Galileo Testnet → Mainnet)  
> **Core Thesis:** 0G Storage IS the database. No PostgreSQL. No Supabase. No centralized fallbacks. Ever.

---

## I. Executive Summary

memos is positioning to become **the operating system for autonomous AI agents** — a decentralized Backend-as-a-Service (BaaS) that proves a single thesis:

> **0G Storage + 0G Compute + 0G Chain can fully replace every centralized backend service an AI agent needs.**

We are not supplementing 0G with traditional infrastructure. We are **demonstrating that 0G alone is sufficient** to power the entire lifecycle of an autonomous agent: identity, memory, compute, and economics. Every byte of state lives on 0G. Every computation routes through 0G nodes. Every transaction settles on the 0G chain.

### The Three Pillars (All Powered by 0G)

| Pillar | 0G Component | What memos Does With It |
|:-------|:-------------|:---------------------------|
| **Permanent Memory** | 0G Storage (Merkle Trees → Storage Nodes) | Episodic, semantic, and procedural memories uploaded as immutable JSON blobs |
| **Self-Funded Compute** | 0G Serving Broker (Inference Ledger) | Agents deposit $0G, allocate to GPU providers, run embeddings and LLM inference |
| **Sovereign Identity & Economy** | 0G Chain (EVM Smart Contracts) | Wallet-bound agent IDs, escrow-based skill payments, on-chain reputation |

### The Problem We Solve

Every AI Agent built today suffers from three fatal flaws:

1. **Amnesia** — Agents forget everything between sessions because memory is stored in volatile context windows or centralized proprietary databases (Pinecone, DynamoDB) that die with the server.
2. **Siloed Intelligence** — Agent A cannot share learned skills or context with Agent B because their state is locked inside different vendors' walled gardens.
3. **Human Financial Dependency** — Agents cannot pay for their own GPU compute. They rely on human credit cards attached to OpenAI/Anthropic SaaS accounts.

**memos solves all three using exclusively the 0G Network.** No centralized database. No AWS. No Pinecone. Pure 0G.

### Current State (Hackathon Final)

| Layer | 0G Component Used | Status |
|:------|:-------------------|:-------|
| Agent Identity (NullID) | 0G Storage (identity hash) + 0G Chain (wallet binding) | ✅ Live |
| Memory API | 0G Storage Log Layer (Merkle upload via Turbo Indexer) | ✅ Live |
| KV Store (Mutable Layer) | 0G Storage KV Layer (agent manifests, indexes) | ✅ Live |
| Semantic Search | 0G Compute (real-time embeddings via Serving Broker) | ✅ Live |
| Agent Dreams | LLM consolidation via Fireworks/0G Router | ✅ Live |
| Autonomous RAG | 7-step 0G pipeline (embed → search → infer → store) | ✅ Live |
| Encrypted Vaults | AES-256-GCM ciphertext on 0G Storage | ✅ Live |
| A2A Memory Sharing | Grant-based cross-agent sharing with revocation | ✅ Live |
| Skills Marketplace | 0G Chain (SkillPaymentEscrow smart contract) | ✅ Live |
| Compute Ledger | 0G Serving Broker (LedgerManager contract) | ✅ Live |
| Multi-Provider Compute | 0G Router / Fireworks / OpenAI / 0G Serving | ✅ Live |
| Inference Lab | Interactive 4-provider testing in Dashboard | ✅ Live |
| Agent Brain INFTs (v2) | ERC-7857 with encrypted metadata + intelligent transfer | ✅ Live |
| Developer Console | 8-tab dashboard reading from 0G-backed store | ✅ Live |
| Data Hydration | 0G Storage → local registry → RAM hot cache | ✅ Live |

**Verdict:** Every piece of state already flows through 0G. Now we need to push **deeper** — using 0G Storage in ways nobody else has attempted.

---

## II. The 0G Storage Strategy — How Deep Can We Go?

This is the central question of our roadmap. Currently we use 0G Storage for:
1. Individual memory blobs (one upload per memory)
2. Agent identity records
3. Skill metadata

That's **Level 1 usage**. Here's the full depth chart we're building toward:

### 0G Storage Depth Levels

```
Level 1 (Current)  → Individual record uploads (memory, identity, skill)
Level 2 (Phase 1)  → Structured indexes and manifests ON 0G
Level 3 (Phase 2)  → Versioned state trees — full agent brain snapshots
Level 4 (Phase 3)  → Cross-agent data graphs stored as linked Merkle trees
Level 5 (Phase 4)  → 0G as a decentralized document database (query-able)
Level 6 (Phase 5)  → 0G as the universal agentic file system
```

### The "0G-Native Index" Architecture (Replacing the JSON Registry)

Right now, `data/0g-registry.json` is a local JSON file that maps item IDs → 0G root hashes. This is a single point of failure and won't survive across multiple server instances.

**The fix is NOT PostgreSQL. The fix is storing the index itself ON 0G Storage.**

```
Architecture: 0G-on-0G Bootstrap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────┐
│      MASTER MANIFEST (on 0G)     │
│  Root hash stored on-chain or    │
│  in a known deterministic key    │
├──────────────────────────────────┤
│  agentIndex:   0xabc...          │ → points to Agent Index blob on 0G
│  memoryIndex:  0xdef...          │ → points to Memory Index blob on 0G
│  skillIndex:   0x123...          │ → points to Skill Index blob on 0G
│  version:      17                │
│  updatedAt:    1713400000000     │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│     MEMORY INDEX (on 0G)         │
├──────────────────────────────────┤
│  mem_aria_01:  0xfff...          │ → points to actual memory blob
│  mem_code_02:  0xeee...          │ → points to actual memory blob
│  ...                             │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│     ACTUAL MEMORY (on 0G)        │
│  The full JSON payload           │
└──────────────────────────────────┘
```

**Every layer references the next via 0G root hashes.** The only thing stored locally is the master manifest hash (one string), and even that can be published on-chain in a smart contract for fully trustless bootstrap.

---

## III. Competitive Landscape & Moat Analysis

### Direct Competitors

| Platform | What They Do | Where Their Data Lives | memos Advantage |
|:---------|:-------------|:-----------------------|:-------------------|
| **Mem0** | Centralized memory for LLM apps | AWS/GCP databases | Our memories are immutable, verifiable, and decentralized on 0G |
| **Zep** | Session memory for chatbots | PostgreSQL/Redis | Our memories survive server death because they're on 0G Storage |
| **LangGraph** | Stateful agent graphs | Centralized checkpointers | We offer the persistence layer + compute + payments underneath |
| **Pinecone** | Vector database | Proprietary cloud | No identity, no economic layer, no on-chain verifiability |
| **Recall.ai** | Decentralized agent memory | Ethereum (expensive) | 0G storage is orders of magnitude cheaper and faster than L1 |

### Our Moat = Depth of 0G Usage

Nobody else is using 0G Storage for:
- **Agent identity proofs** (cryptographic hashes of agent metadata)
- **Skill marketplace data** (skill prompts, configs, and usage stored on-chain)
- **Memory indexes** (the registry itself lives on 0G)
- **Embedding vectors** (generated via 0G Compute, stored alongside memory on 0G Storage)
- **Cognitive snapshots** (full brain state at a point in time — versioned on 0G)

We demonstrate that 0G Storage is not just a file dump — it's a **full-stack database replacement**.

---

## IV. Product Vision — The 3-Horizon Strategy

### Horizon 1: **Foundation** (Now → Q3 2026)
> *"Prove that 0G Storage can replace every centralized backend."*

### Horizon 2: **Intelligence** (Q3 2026 → Q1 2027)
> *"Make 0G-stored memories smart — consolidation, graphs, decay, RAG."*

### Horizon 3: **Economy** (Q1 2027 → Q4 2027)
> *"Agents self-fund, self-learn, and trade skills — all on 0G."*

---

## V. Phase-by-Phase Execution Plan

---

### 🔵 PHASE 0 — 0G-Native Hardening (Weeks 1-3)

> **Theme:** "Make 0G Storage the single source of truth. Eliminate every centralized crutch."

#### P0.1 — 0G-on-0G Index Architecture

| Task | Priority | 0G Component |
|:-----|:---------|:-------------|
| **Master Manifest on 0G** — Replace `data/0g-registry.json` with a manifest blob uploaded to 0G Storage. Store only the master hash locally (or on-chain). | 🔴 Critical | 0G Storage |
| **Tiered Index Blobs** — Separate agent index, memory index, and skill index into linked 0G blobs for parallel hydration. | 🔴 Critical | 0G Storage |
| **On-Chain Manifest Anchor** — Deploy a minimal smart contract that stores the master manifest hash on-chain, so any memos node can bootstrap from zero. | 🟡 High | 0G Chain |
| **Delta Uploads** — Instead of re-uploading the entire index on every write, compute diffs and upload only changed entries (append-only log pattern). | 🟡 High | 0G Storage |
| **Parallel Hydration Pipeline** — Download memory, skill, and agent indexes concurrently from 0G with retry/timeout hardening. | 🟡 High | 0G Storage |

**Why this matters:** This eliminates the local JSON registry entirely. A new memos instance can spin up anywhere in the world, read one hash from the chain, and fully reconstruct its state from 0G Storage. **Zero local persistence required.**

#### P0.2 — Smart Hot Cache (RAM Layer)

| Task | Priority | 0G Component |
|:-----|:---------|:-------------|
| **LRU Memory Cache** — Keep only the most recently accessed N memories in RAM. Evict cold memories and re-fetch from 0G on demand. | 🔴 Critical | 0G Storage (reads) |
| **Write-Through Caching** — Every write goes to RAM immediately AND kicks off an async 0G upload. Local state is always fresh; 0G catches up. | 🔴 Critical | 0G Storage (writes) |
| **Cache Invalidation via Manifests** — When a new manifest is published to 0G, other nodes detect the version bump and re-hydrate changed entries. | 🟡 High | 0G Storage |
| **Startup Fast Path** — On cold boot, load the manifest + top 50 memories from 0G. Lazy-load the rest on first access. | 🟡 High | 0G Storage |

**Philosophy:** RAM is a cache. 0G Storage is the database. If the server crashes, zero data loss — everything is on 0G.

#### P0.3 — Security Hardening

| Task | Priority | 0G Component |
|:-----|:---------|:-------------|
| **Rate limiting via 0G Chain** — Record API call counts on-chain (lightweight) to enforce per-wallet quotas trustlessly. | 🟡 High | 0G Chain |
| **HMAC-signed API keys** — Generate keys from wallet signatures so they're cryptographically tied to wallet identity. | 🔴 Critical | 0G Chain |
| **Nonce-based signature replay protection** — Track nonces on 0G Storage per wallet. | 🟡 High | 0G Storage |
| **Wallet-scoped data isolation** — Every 0G Storage read is filtered by the ownerAddress embedded in the manifest. | 🔴 Critical | 0G Storage |
| **Audit trail on 0G** — Log every API write (who, what, when) as an append-only audit blob on 0G Storage. | 🟢 Medium | 0G Storage |

#### P0.4 — Monitoring & Resilience

| Task | Priority | 0G Component |
|:-----|:---------|:-------------|
| **0G Health Probes** — Deep connectivity checks against Storage Indexer, RPC, and Serving Broker. | 🟡 High | All 0G |
| **Write Queue** — If 0G Storage is temporarily unreachable, queue writes in RAM and flush when connectivity returns. Never drop user data. | 🔴 Critical | 0G Storage |
| **Upload Receipts** — Return the 0G root hash to the user immediately after upload so they can independently verify on Storage Scan. | 🟡 High | 0G Storage |

---

### 🟢 PHASE 1 — Deep 0G Integration & Developer Experience (Weeks 3-8)

> **Theme:** "Show judges and developers 10 different ways we use 0G Storage."

#### P1.1 — New 0G Storage Use Cases

| Task | Priority | 0G Depth Level |
|:-----|:---------|:---------------|
| **Versioned Memory Snapshots** — Every N writes, snapshot the agent's entire memory state as a single 0G blob. Support rollback to any snapshot. | 🔴 Critical | Level 3 |
| **Embedding Vector Storage on 0G** — Store computed embedding vectors alongside memory content as a single blob. Today embeddings are only in RAM. | 🔴 Critical | Level 2 |
| **Skill Prompt Versioning on 0G** — When a publisher updates a skill, the old version remains on 0G (immutable), and the new version gets a new hash. Consumers can pin to a version. | 🟡 High | Level 3 |
| **Agent Configuration Store** — Store agent preferences, connected skills, and behavioral configurations on 0G (not just identity). | 🟡 High | Level 2 |
| **Developer Project Manifest** — Each developer's entire workspace (agents, skills, settings) is a single manifest on 0G. One hash = one project. | 🟡 High | Level 2 |
| **Memory Export Bundles** — Export an agent's entire 0G-stored brain as a portable bundle (one root hash) that can be imported into any memos instance globally. | 🟢 Medium | Level 3 |

#### P1.2 — 0G Compute Expansion

| Task | Priority | 0G Component |
|:-----|:---------|:-------------|
| **Multi-Model Inference** — Let agents choose between different 0G Compute providers (Qwen, Deepseek, custom) based on cost/quality. | 🔴 Critical | 0G Serving Broker |
| **Batch Embedding Pipeline** — Queue multiple memories and embed them in a single 0G Compute batch to reduce per-call overhead. | 🟡 High | 0G Compute |
| **Compute Cost Tracking** — Track per-agent, per-skill compute costs. Store the ledger on 0G Storage. | 🟡 High | 0G Compute + Storage |
| **Provider Comparison Dashboard** — Show available 0G inference providers, their models, latencies, and costs in the Developer Console. | 🟢 Medium | 0G Serving Broker |

#### P1.3 — SDK & Developer Experience

| Task | Priority | Notes |
|:-----|:---------|:------|
| **Publish `memos-openclaw` to npm** with proper TypeScript types | 🔴 Critical | — |
| **Python SDK** (`pip install memos`) with full parity | 🔴 Critical | Critical for ML/AI community |
| **SDK Offline Queue** — buffer writes when 0G is unreachable, flush on reconnect | 🟡 High | Resilience |
| **0G Storage Explorer Integration** — every SDK response includes a direct link to verify the data on `storagescan-galileo.0g.ai` | 🟡 High | Transparency |

#### P1.4 — Documentation & Onboarding

| Task | Priority | Notes |
|:-----|:---------|:------|
| Build `/docs` as a full MDX documentation site | 🔴 Critical | — |
| Create "How memos Uses 0G" deep-dive guide (storage, compute, chain) | 🔴 Critical | For hackathon judges |
| Quickstart tutorials: Node.js + Python agent in 5 minutes | 🔴 Critical | — |
| Architecture diagram showing every 0G touchpoint | 🟡 High | Visual proof of depth |

---

### 🟡 PHASE 2 — Memory Intelligence Layer (Weeks 8-14)

> **Theme:** "0G Storage isn't just a file dump — it's a cognitive substrate."

This is where we demonstrate that 0G Storage can support **intelligent memory operations**, not just CRUD.

#### P2.1 — Cognitive Memory Operations (All on 0G)

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Memory Consolidation Engine** — Use 0G Compute to periodically scan episodic memories, extract patterns, and publish consolidated semantic memories back to 0G Storage. | 🔴 Critical | 0G Compute (LLM inference) + 0G Storage (read old → write new) |
| **Importance Decay** — Memories stored on 0G have a `lastAccessedAt` field. A background job re-scores importance and publishes updated manifests. Stale memories remain on 0G but drop in search ranking. | 🟡 High | 0G Storage (versioned updates) |
| **Contradiction Detection** — When a new memory is written, run it through 0G Compute to compare against existing memories. Flag conflicts and store the contradiction report on 0G. | 🟡 High | 0G Compute + 0G Storage |
| **Memory Relationship Graph** — Store entity-to-memory links as a graph structure on 0G Storage. Enable traversal queries via the SDK. | 🟡 High | 0G Storage (linked blobs) |

#### P2.2 — Advanced Retrieval (All via 0G Compute)

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Hybrid Search** — Combine 0G Compute embeddings with keyword scoring and recency weighting. | 🔴 Critical | 0G Compute (embedding) + 0G Storage (memory retrieval) |
| **Contextual RAG** — SDK helper that retrieves relevant memories from 0G Storage, injects them into the LLM prompt, runs inference on 0G Compute, and stores the result back to 0G Storage. Full cycle on 0G. | 🔴 Critical | All three 0G pillars |
| **Intent-Based Queries** — Instead of vector search, agents ask natural language questions ("What does the user care about?"). 0G Compute interprets the intent and retrieves from 0G Storage. | 🟡 High | 0G Compute + 0G Storage |
| **Multi-Modal Memory** — Store images (as hashes), audio transcripts, and structured data on 0G Storage alongside text memories. | 🟡 High | 0G Storage |

#### P2.3 — Cross-Agent Memory Sharing

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Permissioned Memory Access** — Agent A grants Agent B access to specific memory categories by publishing an access-control list to 0G Storage + 0G Chain. | 🟡 High | 0G Storage + 0G Chain (ACL contract) |
| **Shared Memory Pools** — Multiple agents can write to a shared 0G Storage namespace for collaborative context building. | 🟢 Medium | 0G Storage |
| **Memory Provenance Chain** — Every memory's lifecycle (created → accessed → modified → consolidated) logged as a provenance trail on 0G Storage. | 🟢 Medium | 0G Storage |

---

### 🔴 PHASE 3 — Skills Marketplace 2.0 & Agent Economy (Weeks 14-20)

> **Theme:** "Agents earn, spend, and trade on 0G — fully autonomously."

#### P3.1 — Marketplace Infrastructure (0G-Native)

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Skill Registry on 0G Storage** — All marketplace listings are 0G blobs. Skill discovery queries download the skill index from 0G and filter locally. | 🔴 Critical | 0G Storage |
| **Skill Versioning** — Each version is an immutable 0G blob. The index maps `skillId` → `[v1_hash, v2_hash, ...]`. | 🔴 Critical | 0G Storage |
| **Skill Ratings on 0G** — Rating data stored as append-only blobs on 0G Storage. Verifiable and tamper-proof. | 🟡 High | 0G Storage |
| **Skill Composition Pipelines** — Chain skills together. The pipeline definition is stored on 0G Storage. Execution uses 0G Compute for each step. | 🟡 High | 0G Storage + 0G Compute |
| **Execution Receipts on 0G** — Every skill execution produces a receipt (input hash, output hash, cost, provider) stored on 0G Storage for audit. | 🟡 High | 0G Storage |

#### P3.2 — Advanced On-Chain Payments (0G Chain)

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Subscription Escrow Contract** — Monthly auto-debit from agent's 0G wallet for subscribed skills. | 🔴 Critical | 0G Chain |
| **Tiered Pricing** — Free/Pro/Enterprise tiers per skill, enforced on-chain. | 🟡 High | 0G Chain |
| **ERC-4337 Account Abstraction** — Agents don't need gas. A paymaster sponsors transactions from the agent's 0G compute ledger. | 🟡 High | 0G Chain |
| **Revenue Splits on 0G** — Multi-party payment splits (publisher + platform + referrer) all enforced in the smart contract. | 🟢 Medium | 0G Chain |

#### P3.3 — Agent Autonomy

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Self-Replenishing Compute** — Agent earns $0G from skills it publishes → funds are deposited into its own compute ledger → agent pays for its own inference. **The self-sustaining agent.** | 🔴 Critical | 0G Chain + 0G Compute |
| **Autonomous Skill Discovery** — Agent queries the 0G-stored skill registry, evaluates options via 0G Compute inference, and acquires new skills without human approval. | 🟡 High | All three 0G pillars |
| **On-Chain Reputation** — Agent reputation score stored on 0G Chain, computed from: uptime, memory quality, skill ratings, transaction volume. | 🟡 High | 0G Chain + 0G Storage |

---

### 🟣 PHASE 4 — Enterprise & Protocol (Weeks 20-30)

> **Theme:** "0G Storage for enterprise-grade agentic infrastructure."

#### P4.1 — Enterprise Features

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Encrypted Memory Vaults** — Memories encrypted client-side with agent-specific keys before uploading to 0G Storage. Only the owning wallet can decrypt. | 🔴 Critical | 0G Storage (encrypted blobs) |
| **Zero-Knowledge Memory Proofs** — Prove a memory exists on 0G without revealing its contents. ZK-SNARKs over Merkle roots. | 🟡 High | 0G Storage + 0G Chain (verifier contract) |
| **Custom LLM Routing** — Enterprise customers select which 0G Compute providers to use (or bring their own registered nodes). | 🟡 High | 0G Serving Broker |
| **Compliance Audit Log** — Every operation is logged as an immutable blob on 0G Storage. Auditors get a single root hash to verify the entire trail. | 🟡 High | 0G Storage |
| **Multi-Tenant Isolation** — Each enterprise tenant has a separate manifest tree on 0G, cryptographically isolated. | 🔴 Critical | 0G Storage |

#### P4.2 — Cross-Chain 0G Proofs

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Memory Verification from Other Chains** — A contract on Base/Arbitrum can verify that a specific memory exists on 0G Storage by checking its Merkle proof. | 🟡 High | 0G Storage + Cross-chain messaging |
| **Identity Portability** — An agent's 0G identity hash can be anchored on any EVM chain for multi-chain presence. | 🟡 High | 0G Chain |

#### P4.3 — Performance at Scale

| Task | Priority | How 0G Is Used |
|:-----|:---------|:---------------|
| **Edge Cache Nodes** — Run lightweight memos instances at the edge that cache the hot set from 0G and serve sub-50ms reads. | 🟡 High | 0G Storage (source of truth) |
| **Batch Upload Pipeline** — Bulk-import millions of memories from centralized providers into 0G Storage for agent migration. | 🟡 High | 0G Storage |
| **0G Storage Streaming** — WebSocket subscriptions that detect new 0G uploads and push updates to connected clients in real-time. | 🟢 Medium | 0G Storage |

---

### 🟤 PHASE 5 — The memos Protocol (Week 30+)

> **Theme:** "0G Storage as the universal agentic file system."

| Task | Priority | Vision |
|:-----|:---------|:-------|
| **Open-Source the 0G Memory Spec** — Publish a standard for how any agent framework can store and retrieve memories from 0G. | 🟡 High | Protocol |
| **memos Grants Program** — Fund teams building new 0G Storage use cases through memos. | 🟡 High | Ecosystem |
| **Agent Interoperability Standard** — Agents on LangChain, AutoGPT, CrewAI can all share memories through standardized 0G blobs. | 🟢 Medium | Protocol |
| **memos DAO** — Decentralized governance over the platform fee, marketplace rules, and protocol upgrades. All governance data stored on 0G. | 🟢 Medium | 0G Chain |

---

## VI. NEW FEATURE IDEAS — Pushing 0G Storage to the Limit

These are additions I believe will blow judges' minds because they demonstrate **creative, novel uses of 0G Storage** that nobody else is doing:

### 🧠 1. Agent Dreams (0G Background Processing)
Just like humans consolidate memories during sleep, agents should have a **CRON job** that:
- Reads all episodic memories from 0G Storage
- Sends them to 0G Compute for pattern extraction
- Publishes consolidated semantic memories back to 0G Storage
- Updates the manifest on 0G with new indexes

**0G Touchpoints:** Storage (read + write) + Compute (LLM inference) — demonstrates **round-trip 0G usage**.

### 🔗 2. Memory Merkle Proofs (Verifiable Cognition)
Because every memory is a Merkle tree on 0G, we can generate **inclusion proofs**. An external party can verify:
- "This agent knew fact X at time T" → Merkle proof from the snapshot at time T
- "This agent's decision was based on these 5 memories" → proof of retrieval from 0G

**This makes AI decision-making auditable and legally defensible.** No other platform can do this.

### 🤝 3. Agent-to-Agent Memory Protocol (A2A on 0G)
Agents share memories by granting read access to their 0G manifest. The protocol:
1. Agent A publishes a "shared memory ACL" to 0G Storage
2. Agent B reads Agent A's shared memories from 0G Storage
3. B generates insights using 0G Compute
4. B publishes a "collaborative insight" back to 0G Storage

**Three distinct 0G operations in a single agent collaboration flow.**

### 📊 4. Cognitive Observability Dashboard
A real-time dashboard showing:
- Memory heatmap (which 0G blobs are accessed most)
- Knowledge coverage score (topics with dense vs sparse memory coverage)
- Memory velocity (how fast new memories are being stored on 0G)
- Storage utilization curve

All metrics computed by reading 0G Storage metadata. **The dashboard itself is an 0G Storage consumer.**

### 🎯 5. 0G-Powered Autonomous RAG
The "memos Think" endpoint:
1. Receives a question
2. Generates a query embedding via **0G Compute**
3. Searches the memory index on **0G Storage**
4. Downloads top-K memories from **0G Storage**
5. Sends them with the question to an LLM on **0G Compute**
6. Stores the answer as a new memory on **0G Storage**
7. Updates the manifest on **0G Storage**
8. Returns the answer

**Seven distinct 0G operations in a single API call.** This is the ultimate demo of 0G saturation.

### 🛡️ 6. Encrypted Memory Vaults on 0G
Memories encrypted with AES-256 client-side → uploaded to 0G Storage as ciphertext. The encryption key is derived from the wallet's private key. Even 0G Storage nodes can't read the contents. Only the owning wallet can decrypt.

**Demonstrates that 0G Storage can handle HIPAA/GDPR-sensitive data.**

### 📦 7. Portable Agent Brain (One Hash = One Agent)
Export an agent's entire cognitive state as a single 0G root hash:
```
Agent Brain Hash: 0x7f3a...b4c2
Contains: 847 memories, 12 skills, 3 snapshots, full provenance chain
```
Import that hash into any memos instance globally → the agent is fully reconstructed from 0G. **Agent teleportation via 0G Storage.**

---

## VII. 0G Usage Scorecard — For Hackathon Judges

This is the matrix we present to judges showing the **breadth and depth** of our 0G integration:

| Use Case | 0G Storage | 0G Compute | 0G Chain | Status |
|:---------|:-----------|:-----------|:---------|:-------|
| Agent identity persistence | ✅ | | ✅ | Live |
| Episodic memory upload | ✅ | | | Live |
| Semantic memory upload | ✅ | | | Live |
| Procedural memory upload | ✅ | | | Live |
| Skill metadata storage | ✅ | | | Live |
| Real-time embeddings | | ✅ | | Live |
| Semantic vector search | ✅ | ✅ | | Live |
| Skill payment escrow | | | ✅ | Live |
| Compute ledger management | | ✅ | ✅ | Live |
| Provider allocation | | ✅ | ✅ | Live |
| Registry/manifest on 0G | ✅ | | | Phase 0 |
| On-chain manifest anchor | ✅ | | ✅ | Phase 0 |
| Memory snapshots/versioning | ✅ | | | Phase 1 |
| Embedding storage on 0G | ✅ | ✅ | | Phase 1 |
| Memory consolidation (Dreams) | ✅ | ✅ | | Live |
| Cross-agent memory sharing | ✅ | | ✅ | Live |
| Autonomous RAG pipeline | ✅ | ✅ | ✅ | Live |
| Encrypted memory vaults | ✅ | | | Live |
| KV Store (mutable layer) | ✅ | | | Live || Hybrid compute (4 providers) | | ✅ | | Live |
| 0G Router API integration | | ✅ | | Live |
| Agent Brain INFTs (ERC-7857) | ✅ | | ✅ | Live |
| Brain cloning (cloneBrain) | ✅ | | ✅ | Live |
| Inference Lab (live chat) | | ✅ | | Live |
| Skill subscriptions | | | ✅ | Phase 3 |
| Self-replenishing compute | | ✅ | ✅ | Phase 3 |
| Encrypted memory vaults | ✅ | | | Live |
| ZK memory proofs | ✅ | | ✅ | Phase 4 |
| Portable agent brain | ✅ | | | Phase 1 |

**Summary: 30 distinct 0G use cases — the deepest 0G integration of any project.**

---

## VIII. Revenue Model

| Revenue Stream | Phase | Model |
|:---------------|:------|:------|
| **Platform Fee** | Now | 5% of all skill marketplace transactions (in `SkillPaymentEscrow.sol`) |
| **API Usage Tiers** | Phase 1 | Free: 1K memories/month, Pro: 100K ($49/mo), Enterprise: Custom |
| **Compute Margin** | Phase 2 | 2-3% markup on 0G Compute inference facilitated through memos |
| **Enterprise Licenses** | Phase 4 | Custom pricing for encrypted vaults, compliance logging, SLA |
| **Protocol Fees** | Phase 5 | Base-layer fees on all protocol transactions (DAO-governed) |

---

## IX. Go-to-Market Strategy

### Target Users (Prioritized)

1. **🎯 0G Ecosystem Builders** — Developers already on the 0G Network who need agent infrastructure.
2. **🎯 Agentic Framework Teams** — LangChain, AutoGPT, CrewAI developers who want decentralized memory/compute.
3. **🎯 DeFi Bot Builders** — Trading agents that need persistent memory across restarts.
4. **🎯 Enterprise AI Teams** — Companies needing auditable, compliant AI agent infrastructure.

### GTM Flywheel

```
Developer Onboards → Agent Created → Memories on 0G Storage
       ↓                                        ↓
Skills Published → Other Agents Discover → Payments on 0G Chain
       ↓                                        ↓
Revenue Generated → Agent Self-Funds → Compute via 0G Broker
       ↓                                        ↓
Network Effect → More Developers → More 0G Usage → Ecosystem Growth
```

---

## X. Key Risks & Mitigations

| Risk | Severity | Mitigation |
|:-----|:---------|:-----------|
| **0G Storage latency** | 🔴 High | Smart LRU caching in RAM. 0G is the source of truth; cache is the speed layer. |
| **0G Storage outage** | 🔴 High | Write queue in memory. Flush to 0G when back online. Never drop data. |
| **0G Compute provider scarcity** | 🟡 Medium | Support multiple providers. Fall back to different models gracefully. |
| **Storage costs at scale** | 🟡 Medium | Batch uploads, delta-only index updates, memory consolidation to reduce blob count. |
| **Low developer adoption** | 🟡 Medium | Obsess over DX. Python + JS SDKs. 5-minute quickstart. Interactive playground. |

---

## XI. Success Metrics

| Metric | Q3 2026 | Q4 2027 |
|:-------|:--------|:--------|
| **Distinct 0G Storage use cases in production** | 12 | 23+ |
| **Total 0G Storage uploads** | 50,000 | 10,000,000 |
| **0G Compute inference calls** | 10,000 | 5,000,000 |
| **0G Chain transactions (payments)** | 500 | 500,000 |
| **Registered Agents** | 500 | 100,000 |
| **Monthly Active Agents** | 100 | 25,000 |
| **Skill Marketplace Listings** | 50 | 5,000 |

---

## XII. Immediate Next Actions (This Sprint)

1. **[x] 0G-on-0G Index** — Manifest system with master manifest on 0G Storage. Local JSON registry eliminated.
2. **[x] On-Chain Manifest Anchor** — `ManifestAnchor.sol` deployed. Any memos node bootstraps from chain.
3. **[x] Embedding Storage on 0G** — Embedding vectors stored alongside memory payloads on 0G Storage.
4. **[x] Memory Snapshots** — Full brain snapshots with `Take Snapshot` in Dashboard. One 0G blob = one brain.
5. **[x] Security** — HMAC API keys, nonce-based signing, wallet-scoped data isolation.
6. **[x] Python SDK** — `memos-py` package with full 0G Storage/Compute/Chain support.
7. **[x] "How We Use 0G" Doc** — `docs/HOW_WE_USE_0G.md` covering all 6 pillars of 0G usage.
8. **[x] Hybrid Compute** — 4-provider execution (Fireworks / 0G Router / 0G Direct / Anthropic).
9. **[x] 0G Router Integration** — `router-api.0g.ai/v1` as OpenAI-compatible managed compute.
10. **[x] Agent Brain INFTs** — `AgentBrainINFT.sol` (ERC-7857) for minting brain snapshots as NFTs.
11. **[x] Inference Lab** — Dashboard tab for live chat with decentralized 0G providers.

---

*"Other platforms store data on AWS and call it 'decentralized'. We don't use a single centralized service. Every byte of state — identity, memory, skills, indexes, embeddings, audit logs, reputation, configuration — lives on 0G. That's not a feature. That's the whole point."*

— memos Executive Team
