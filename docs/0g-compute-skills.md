# 0G Compute Skills Reference

> Source: [0gfoundation/0g-compute-skills](https://github.com/0gfoundation/0g-compute-skills)

## Overview

MemoryOS integrates the **0G Compute Network** — a decentralized GPU marketplace for AI inference and model fine-tuning. This document covers all SDK patterns used in the codebase.

## Network Information

| Network | RPC URL | Chain ID |
|---------|---------|----------|
| Mainnet | `https://evmrpc.0g.ai` | 16661 |
| Testnet | `https://evmrpc-testnet.0g.ai` | 16602 |

## SDK Setup

```typescript
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const broker = await createZGComputeNetworkBroker(wallet);
```

## Provider Discovery

```typescript
const services = await broker.inference.listService();
const chatbots = services.filter(s => s.serviceType === 'chatbot');
const sorted = [...chatbots].sort((a, b) => Number(a.inputPrice) - Number(b.inputPrice));
```

## Chat Completion

```typescript
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
const headers = await broker.inference.getRequestHeaders(providerAddress);

const response = await fetch(`${endpoint}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ messages, model })
});

const data = await response.json();

// CRITICAL: Always call processResponse
let chatID = response.headers.get("ZG-Res-Key") || data.id;
await broker.inference.processResponse(
  providerAddress, chatID, JSON.stringify(data.usage)
);
```

## processResponse() — CRITICAL

Must be called after **every** API response for:
- Fee settlement (automatic token transfer)
- TEE verification (response integrity)

Parameter order: `provider, chatID, usageData` — do NOT reorder.

| Service Type | chatID Source | Fallback |
|---|---|---|
| Chatbot | `ZG-Res-Key` header | `data.id` |
| Text-to-Image | `ZG-Res-Key` header | none |
| Speech-to-Text | `ZG-Res-Key` header | none |
| Chatbot Streaming | `ZG-Res-Key` header | `id` from chunk |

## Account Management

```
Your Wallet → deposit → Main Account → transfer-fund → Provider Sub-Accounts
Provider Sub-Accounts → retrieve-fund (24h lock) → Main Account → refund → Your Wallet
```

### SDK Methods

| Action | Method |
|--------|--------|
| Deposit | `broker.ledger.depositFund(amount)` |
| Check balance | `broker.ledger.getLedger()` |
| Transfer | `broker.ledger.transferFund(provider, "inference", amount)` |
| Refund | `broker.ledger.retrieveFund("inference")` |
| Withdraw | `broker.ledger.refund(amount)` |

## Hybrid Compute Architecture

MemoryOS supports four compute providers for skill execution:

| Provider | Type | Config |
|----------|------|--------|
| **Fireworks AI** | Centralized | `FIREWORKS_API_KEY` |
| **0G Router** | Decentralized (managed) | `ZG_ROUTER_API_KEY` |
| **0G Direct** | Decentralized (SDK) | `WALLET_PRIVATE_KEY` + funded ledger |
| **Anthropic** | Centralized | `ANTHROPIC_API_KEY` |

Users select their provider at execution time via the Skill detail page UI. The `DEFAULT_COMPUTE_PROVIDER` env var sets the default.

### 0G Router (Recommended for Server-Side)

The Router API (`https://router-api.0g.ai/v1`) is an **OpenAI-compatible** managed endpoint:
- Single unified balance (no per-provider sub-accounts)
- Automatic provider failover & load balancing
- API key auth (`sk-*`) — no wallet signing per request
- Provider routing by latency or price

```typescript
// Drop-in OpenAI replacement
const response = await fetch('https://router-api.0g.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'deepseek-ai/DeepSeek-V3',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
});
```

Setup: Visit [pc.0g.ai](https://pc.0g.ai) → connect wallet → deposit → API Keys → create key.

## Agent Brain INFTs (ERC-7857)

MemoryOS supports minting agent brain snapshots as **Intelligent NFTs** on-chain:

- `mintBrain()` — Mint a snapshot hash as an ERC-7857 NFT
- `cloneBrain()` — Fork an agent's cognitive state to a new owner
- `getAgentBrains()` — List all brain NFT versions for an agent
- `getBrain()` — Read brain metadata (hash, memories, version, minter)

Contract: `contracts/AgentBrainINFT.sol`
Deploy: `npx hardhat run scripts/deploy-inft.js --network galileo`

## Files

| File | Purpose |
|------|---------|
| `lib/0g-compute-inference.ts` | Full 0G inference SDK (chat, stream, provider discovery) |
| `lib/0g-compute-router.ts` | 0G Router API — OpenAI-compatible wrapper |
| `lib/0g-compute.ts` | 0G embedding service |
| `lib/inft.ts` | INFT minting + reading helpers |
| `lib/use-broker.ts` | Client-side broker hook (wagmi) |
| `lib/ethers-adapter.ts` | Viem → ethers bridge |
| `contracts/AgentBrainINFT.sol` | ERC-7857 Intelligent NFT contract |
| `app/api/compute/providers/route.ts` | Provider discovery API |
| `app/api/compute/chat/route.ts` | Direct 0G chat API (standard + streaming) |
| `app/api/compute/router/route.ts` | Router balance / usage / models API |
| `app/api/agent/[agentId]/mint-inft/route.ts` | Brain INFT minting API |
| `app/api/execute/route.ts` | Hybrid skill execution (Fireworks / Router / Direct / Anthropic) |
