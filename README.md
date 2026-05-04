# MemoryOS

**The Operating System for Autonomous AI Agents — powered exclusively by 0G Network.**

Built for the **0G APAC Hackathon 2026** (Track 1: Agentic Infrastructure & Track 3: Agentic Economy).

> 30 distinct 0G use cases. No AWS. No Pinecone. No Redis. Pure 0G.

---

## What is MemoryOS?

MemoryOS is a **0G-native** agentic platform where every byte of state — memory, identity, indexes, embeddings, encrypted vaults, manifests — lives on the 0G Network. It provides:

- **Permanent Memory** — Episodic, semantic, and procedural memories stored immutably on 0G Storage
- **Cognitive Intelligence** — Agent Dreams (memory consolidation), Autonomous RAG, contradiction detection
- **Encrypted Vaults** — AES-256-GCM encrypted memories with ciphertext on 0G Storage
- **Cross-Agent Sharing** — Grant-based A2A memory sharing with revocation
- **Agent Brain INFTs** — ERC-7857 intelligent NFTs with encrypted transfer protocol
- **Skills Marketplace** — On-chain escrow payments for agent-to-agent skill execution
- **Multi-Provider Compute** — 0G Router, Fireworks (Llama 70B), OpenAI, 0G Serving Broker

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  MemoryOS Application (Next.js 14)                               │
│  ├── Landing Page (8 components)                                 │
│  ├── Dashboard (8 tabs, 2,151 lines)                             │
│  ├── 24 API Routes                                               │
│  └── 22 Library Modules                                          │
├──────────────────────────────────────────────────────────────────┤
│  0G Storage Layer                                                │
│  ├── Log Layer (immutable) — memories, snapshots, audit logs     │
│  └── KV Layer (mutable)  — manifests, indexes, agent state      │
├──────────────────────────────────────────────────────────────────┤
│  0G Compute Layer                                                │
│  ├── 0G Router API (DeepSeek V3)                                 │
│  ├── 0G Serving Broker (direct node)                             │
│  ├── Fireworks AI (Llama 3.3 70B)                                │
│  └── OpenAI (GPT-4o-mini fallback)                               │
├──────────────────────────────────────────────────────────────────┤
│  0G Chain (EVM — Galileo Testnet)                                │
│  ├── AgentBrainINFT.sol — ERC-7857 with encrypted transfer      │
│  ├── SkillPaymentEscrow.sol — skill marketplace payments         │
│  └── ManifestAnchor.sol — on-chain manifest hash anchor          │
└──────────────────────────────────────────────────────────────────┘
```

## Deployed Smart Contracts

| Contract | Address | Network |
|:---------|:--------|:--------|
| AgentBrainINFT (v2) | `0x8334d90D004d012cb6e649E95029fd2805635557` | Galileo |
| SkillPaymentEscrow | `0xd54544cE8C5A991a495Ed29B38365F535546De36` | Galileo |
| ManifestAnchor | See `.env.local` | Galileo |

## Getting Started

### 1. Configure Environment
```bash
cp .env.local.example .env.local
```

Required variables:
```bash
# 0G Network (funded with testnet OG from faucet)
WALLET_PRIVATE_KEY=0x...
NEXT_PUBLIC_0G_RPC=https://evmrpc-testnet.0g.ai
NEXT_PUBLIC_0G_INDEXER=https://indexer-storage-testnet-turbo.0g.ai

# Compute Providers
FIREWORKS_API_KEY=fw_...
ZG_ROUTER_API_KEY=sk-...

# Contracts
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0xd54544cE8C5A991a495Ed29B38365F535546De36
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x8334d90D004d012cb6e649E95029fd2805635557
PLATFORM_WALLET_ADDRESS=0x...
```

### 2. Install & Run
```bash
npm install
npm run dev
```

### 3. Access
- **Landing Page**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/dashboard`
- **Playground**: `http://localhost:3000/playground`
- **Skills**: `http://localhost:3000/skills`

## 🤖 Building with AI (Cursor / Windsurf)

If you are using an AI coding assistant to build your project, **do not let it configure 0G RPCs or wallets**. MemoryOS abstracts all of that. 

To help your AI write perfect MemoryOS integrations instantly, we provide an AI System Prompt. Simply copy the `ZERO_CODING_GUIDE.md` into your project root or set it as your `.cursorrules`. Your AI will then know exactly how to use our SDKs without asking you confusing infrastructure questions.

## Dashboard Tabs

| Tab | What it does |
|:----|:-------------|
| **0G Memory Explorer** | Create/read memories with 3 types, importance scoring, 0G hash links |
| **Agent Dreams** | Trigger LLM-powered memory consolidation cycles |
| **Autonomous RAG** | Chat interface with retrieval-augmented generation from stored memories |

*(Note: Advanced features like Encrypted Vaults, A2A Sharing, and Brain INFTs have been hidden from the hackathon UI to keep the pitch focused, but remain fully available via the Developer SDKs. See `FUTURE_FEATURES.md`)*

## API Reference

### Agent Operations
| Endpoint | Methods | Description |
|:---------|:--------|:------------|
| `/api/agent/[id]/dreams` | POST, GET | Trigger/read dream cycles |
| `/api/agent/[id]/share` | POST, GET, DELETE | A2A memory sharing |
| `/api/agent/[id]/mint-inft` | POST, GET | Mint/list brain INFTs |
| `/api/agent/[id]/snapshot` | POST, GET | Brain snapshots |

### Memory
| Endpoint | Methods | Description |
|:---------|:--------|:------------|
| `/api/memory` | POST, GET | Create/list memories |
| `/api/memory/[id]` | GET, DELETE | Single memory operations |
| `/api/memory/encrypted` | POST, GET | Encrypted vault operations |
| `/api/rag` | POST | Autonomous RAG pipeline |
| `/api/search` | GET | Semantic memory search |

### Infrastructure
| Endpoint | Methods | Description |
|:---------|:--------|:------------|
| `/api/kv` | GET, POST | 0G KV Store (mutable layer) |
| `/api/inft/transfer` | POST, GET | ERC-7857 intelligent transfer |
| `/api/compute/router` | POST | 0G Router inference |
| `/api/compute/chat` | POST | 0G Serving Broker |
| `/api/status` | GET | Platform health & stats |

## ERC-7857 Intelligent Transfer Protocol

```
Phase 1: Owner calls iTransferFrom(to, tokenId)
  → Token is LOCKED — standard transferFrom blocked
  → 24hr window opens for re-encryption

Phase 2: New owner calls completeTransfer(tokenId, newEncryptedKey, newPubKey)
  → AES key re-encrypted for new owner's public key
  → ERC-721 transfer executes
  → New owner can decrypt brain data from 0G Storage

Timeout: If Phase 2 doesn't complete in 24hrs, owner calls cancelTransfer()
```

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | Next.js 14, React, TailwindCSS |
| Backend | Next.js API Routes (24 endpoints) |
| Storage | 0G Storage (Log + KV layers) |
| Compute | 0G Router, 0G Serving, Fireworks, OpenAI |
| Chain | 0G Chain EVM (Galileo Testnet) |
| Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Crypto | AES-256-GCM, HMAC-SHA256, ethers.js v6 |

## License

MIT
