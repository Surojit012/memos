# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server

# Smart Contracts
npm run payments:compile              # Compile Solidity contracts (Hardhat)
npm run payments:deploy:galileo       # Deploy SkillPaymentEscrow to 0G Galileo testnet
npm run anchor:deploy:galileo         # Deploy ManifestAnchor contract
# Deploy AgentBrainINFT: npx hardhat run scripts/deploy-inft.js --network galileo

# Smoke tests / E2E
npm run smoke:phase23
npm run test:e2e
```

No linter is configured (no ESLint/Prettier scripts in package.json).

## Environment Setup

Copy `.env.local.example` to `.env.local`. Required variables:

| Variable | Purpose |
|---|---|
| `WALLET_PRIVATE_KEY` | Signs on-chain txs (registry, storage uploads) |
| `NEXT_PUBLIC_0G_RPC` | 0G EVM RPC (default: Galileo testnet) |
| `NEXT_PUBLIC_0G_INDEXER` | 0G Storage indexer URL |
| `FIREWORKS_API_KEY` | Primary LLM (Llama 3.3 70B) for intelligence layer |
| `MEMORY_SERVICE_SECRET` | Required in production for all write endpoints |
| `PLATFORM_HMAC_SECRET` | HMAC secret for API key generation |
| `MEMOS_REGISTRY_CONTRACT` | On-chain `MemosRegistry` contract address |
| `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS` | `SkillPaymentEscrow` contract address |

In development (`NODE_ENV !== 'production'`), write endpoints and auth are open if secrets are unset.

## Architecture

MEMOS is a **Next.js 14 App Router** application that gives AI agents persistent memory backed by the 0G decentralized stack.

### Data Flow (Write Path)

```
API Route → RAM store (instant) → Write Queue (WAL on disk) → 0G Storage (background)
                                                                      ↓
                                                               On-Chain Registry
                                                         (agentId → storageHash)
```

### Data Flow (Read Path / Startup)

```
ensureHydrated() → MemosRegistry contract (getAllAgentIds)
                 → per-agent 0G Storage manifest (AgentManifest JSON)
                 → upsert into RAM store (memories, skills, agents)
```

`ensureHydrated()` is called at the top of every API route. It's a singleton — runs once per server process. If the chain has no agents, seed data is loaded instead.

### Key Library Files

| File | Role |
|---|---|
| `lib/store.ts` | In-memory store (RAM cache). Source of truth at runtime. |
| `lib/hydration.ts` | Startup hydration: on-chain registry → 0G Storage → RAM |
| `lib/write-queue.ts` | WAL-backed async upload queue (disk-persisted, retry with backoff) |
| `lib/0g-storage.ts` | Upload/download blobs from 0G Storage indexer |
| `lib/0g-manifest.ts` | Per-agent `AgentManifest` (memories + skills + identity as a JSON blob on 0G) |
| `lib/registry.ts` | Ethers calls to `MemosRegistry` on-chain contract |
| `lib/auth.ts` | HMAC API key generation/validation, nonce-based wallet signature replay protection |
| `lib/0g-compute.ts` | Embedding generation via 0G Compute network |
| `lib/0g-compute-router.ts` | LLM inference via 0G Compute Router |
| `lib/intelligence/consolidation.ts` | Dream engine: episodic → semantic memory via LLM |
| `lib/intelligence/conflicts.ts` | Contradiction detection before storing a new memory |
| `lib/intelligence/decay.ts` | Importance decay for stale memories |
| `lib/payments.ts` | Skill payment verification against `SkillPaymentEscrow` contract |
| `lib/encryption.ts` | AES-GCM encryption for the encrypted memory vault |

### API Routes

All routes under `app/api/`. Auth pattern: requests must carry either `Authorization: Bearer <agentApiKey>` or the `X-memos-Secret` platform header.

| Route | Purpose |
|---|---|
| `POST /api/identity` | Register a new agent (wallet-signed, nonce-protected) |
| `GET/POST /api/memory` | List or create memories (triggers embedding + 0G upload async) |
| `POST /api/memory/encrypted` | Store AES-encrypted memories |
| `GET/POST /api/agent/[agentId]/dreams` | Trigger or read sleep-consolidation cycle |
| `POST /api/agent/[agentId]/snapshot` | Force upload full brain manifest to 0G |
| `POST /api/agent/[agentId]/mint-inft` | Mint AgentBrain iNFT (ERC-7857) |
| `GET/POST /api/skills` | List or publish skills to marketplace |
| `POST /api/execute` | Execute a skill (verifies payment, calls 0G Compute, writes receipt) |
| `POST /api/rag` | Retrieval-Augmented Generation over agent memories |
| `POST /api/search` | Semantic search over memories |
| `POST /api/pipeline` | Chain multiple skill executions |
| `GET /api/compute/providers` | List available 0G Compute providers |
| `POST /api/pay` | Verify on-chain skill payment and issue receipt |

### Memory Types

`MemoryType = 'episodic' | 'semantic' | 'procedural'`

- **episodic** — specific events/experiences
- **semantic** — generalized facts/knowledge (output of dream consolidation)
- **procedural** — how-to workflows/rules

### Smart Contracts (`contracts/`)

| Contract | Purpose |
|---|---|
| `MemosRegistry.sol` | On-chain agent registry (agentId → storageHash mapping) |
| `SkillPaymentEscrow.sol` | Skill payment with platform fee split |
| `ManifestAnchor.sol` | Immutable anchoring of manifest hashes |
| `AgentBrainINFT.sol` | ERC-7857 identity NFT for agent brains |

### Frontend Pages

- `/` — Landing page
- `/onboarding` — Multi-step agent setup wizard (Privy wallet auth)
- `/dashboard` — Agent stats overview
- `/profile` — API keys, agents, skills management
- `/playground` — Interactive API explorer with tabs (Memory, Dream, RAG, Search, Skills, Pipeline, Identity)

### Auth Model

- Users connect via **Privy** (wallet or social login).
- Agent registration requires an **Ethereum signature** with a nonce to prevent replay attacks.
- Per-agent API keys are **HMAC-derived** from `agentId + ownerAddress` — no database lookup needed.
- Platform writes (internal SDK calls) use `MEMORY_SERVICE_SECRET` header.

### Path Alias

`@/*` maps to the repo root (e.g., `@/lib/store` = `lib/store.ts`).

### SDK Packages

The `packages/memos-py/` directory contains the published `memos-ai` Python SDK. There is also a TypeScript SDK published as `memos-sdk` on npm (not in this repo). The web app is the reference server implementation these SDKs call.
