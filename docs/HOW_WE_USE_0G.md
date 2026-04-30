# How MemoryOS Uses 0G — 30 Distinct Use Cases

MemoryOS is the **deepest 0G integration** of any project. Every byte of state — memory, identity, indexes, embeddings, encrypted vaults, manifests — flows through the 0G Network. There is no PostgreSQL, no Redis, no Pinecone, no AWS S3. We call this **"0G-Native Architecture."**

---

## 1. 0G Storage — Log Layer (Immutable Blobs)

The Log layer is 0G's append-only Merkle tree storage. We use it for everything that should never change once written.

| # | Use Case | Implementation |
|:--|:---------|:---------------|
| 1 | **Memory payload uploads** | `lib/0g-storage.ts` → `Indexer.upload(MemData)` |
| 2 | **Agent identity storage** | Agent profiles serialized as JSON → 0G blob |
| 3 | **Master manifest persistence** | `manifest.json` contains all agent/memory/skill mappings |
| 4 | **Memory index blobs** | memoryId → storageHash mappings persisted on 0G |
| 5 | **Brain snapshot uploads** | Full cognitive state serialized for INFT minting |
| 6 | **Encrypted vault ciphertext** | AES-256-GCM encrypted blobs stored as raw 0G data |
| 7 | **Embedding storage** | Vector embeddings baked into memory JSON before upload |
| 8 | **Audit log persistence** | Every mutation logged with timestamp + hash |
| 9 | **Skill definition storage** | Skill configs (prompt, pricing, metadata) on 0G |
| 10 | **Dream output storage** | LLM consolidation results persisted on 0G |

### How it works:
```typescript
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'

const buffer = Buffer.from(JSON.stringify(data))
const memData = new MemData(buffer)
const [tree] = await memData.merkleTree()
const rootHash = tree.rootHash()  // ← This is the 0G Storage hash

const indexer = new Indexer(indexerUrl)
await indexer.upload(memData, rpcUrl, wallet)
// rootHash can now be used to download the data from any 0G node
```

---

## 2. 0G Storage — KV Layer (Mutable Key-Value)

The KV layer is 0G's mutable key-value store built on top of the Log layer. We use it for state that changes frequently.

| # | Use Case | Implementation |
|:--|:---------|:---------------|
| 11 | **Agent manifest KV store** | `{agentId}/manifest` → latest memory index |
| 12 | **Platform master manifest KV** | `platform/master` → all-agent registry |
| 13 | **Agent config KV** | `{agentId}/config` → agent configuration |
| 14 | **Memory index KV** | `{agentId}/memory-index` → memoryId → hash map |

### How it works:
```typescript
import { StreamDataBuilder, KvClient } from '@0gfoundation/0g-ts-sdk'

// Write
const builder = new StreamDataBuilder(1)
builder.set(streamId, stringToBytes(key), stringToBytes(JSON.stringify(value)))
const streamData = builder.build()
await indexer.upload(streamData, rpcUrl, wallet)

// Read
const client = new KvClient(kvNodeUrl)
const value = await client.getValue(streamId, stringToBytes(key))
```

---

## 3. 0G Compute — Multi-Provider Inference

MemoryOS uses 4 compute providers with automatic failover. The primary and preferred path is always 0G.

| # | Use Case | Provider | Implementation |
|:--|:---------|:---------|:---------------|
| 15 | **0G Router inference** | 0G Router API | `lib/0g-compute-router.ts` |
| 16 | **0G Serving Broker** | Direct 0G nodes | `lib/0g-compute-inference.ts` |
| 17 | **Fireworks AI fallback** | Llama 3.3 70B | `lib/intelligence/llm.ts` (Tier 2) |
| 18 | **OpenAI fallback** | GPT-4o-mini | `lib/intelligence/llm.ts` (Tier 3) |
| 19 | **Dream consolidation** | Any provider | Agent sleep-cycle memory merging |
| 20 | **RAG synthesis** | Any provider | 7-step retrieval-augmented generation |
| 21 | **Contradiction detection** | Any provider | Memory conflict analysis |
| 22 | **Inference Lab** | All 4 side-by-side | Dashboard interactive testing |

### Inference chain priority:
```
Tier 1: 0G Router API (router-api.0g.ai/v1) — DeepSeek V3, TEE verified
Tier 2: Fireworks AI (api.fireworks.ai) — Llama 3.3 70B Instruct
Tier 3: OpenAI (api.openai.com) — GPT-4o-mini
Tier 4: 0G Serving Broker — Direct decentralized node
```

---

## 4. 0G Chain (EVM) — Contracts & Economy

Three deployed smart contracts on the Galileo Testnet handle on-chain settlement.

| # | Use Case | Contract | Address |
|:--|:---------|:---------|:--------|
| 23 | **Skill payment escrow** | `SkillPaymentEscrow.sol` | `0xd545...De36` |
| 24 | **Manifest anchor** | `ManifestAnchor.sol` | See `.env.local` |
| 25 | **Agent Brain INFT** | `AgentBrainINFT.sol` v2 | `0x8334...5557` |
| 26 | **ERC-7857 intelligent transfer** | `iTransferFrom()` + `completeTransfer()` | On-chain |
| 27 | **Re-encryption on transfer** | Two-phase encrypted key rotation | On-chain |
| 28 | **Brain cloning** | `cloneBrain()` + `cloneBrainSimple()` | On-chain |
| 29 | **Key rotation** | `updateEncryptedKey()` | On-chain |
| 30 | **Compute ledger deposits** | Via 0G Router dashboard | `pc.0g.ai` |

### ERC-7857 Intelligent Transfer Protocol:
```
Phase 1: iTransferFrom(to, tokenId)
  → Token locked, standard transferFrom blocked
  → 24hr window for new owner to re-encrypt

Phase 2: completeTransfer(tokenId, newEncryptedKey, newPublicKey)
  → AES key rotated for new owner
  → ERC-721 transfer executes
  → Brain data on 0G Storage now decryptable by new owner only

Timeout: cancelTransfer(tokenId) after 24hrs
```

---

## Summary

**30 distinct 0G use cases** across Storage (Log + KV), Compute (4 providers), and Chain (3 contracts).

MemoryOS doesn't just "use 0G" — it proves that the 0G Network can replace every centralized backend service an AI agent needs: database, vector store, inference engine, payment rails, and NFT marketplace.

This is the **0G-Native thesis** in production.
