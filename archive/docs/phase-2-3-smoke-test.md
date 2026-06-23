# memos — Full Platform Smoke Test

> Updated: 2026-05-01 | All features verified on Galileo Testnet

## Prerequisites

1. Server running: `npm run dev`
2. `.env.local` configured with all keys (see README.md)
3. Funded wallet on Galileo Testnet

---

## Quick Health Check

```bash
# All should return 200
curl -s 'http://localhost:3000/api/status'          # Platform status
curl -s 'http://localhost:3000/api/kv?action=status' # KV layer
curl -s 'http://localhost:3000/api/inft/transfer?tokenId=1' # INFT
```

---

## Test Matrix

### 1. Memory Pipeline
| Step | Test | Expected |
|:-----|:-----|:---------|
| 1.1 | POST `/api/memory` — create semantic memory | 201 + 0G hash |
| 1.2 | GET `/api/memory?agentId=X` — list memories | Array with stored memory |
| 1.3 | GET `/api/search?q=...&agentId=X` — semantic search | Ranked results with scores |
| 1.4 | Click 0G hash link | Opens storagescan-galileo with JSON blob |

### 2. Agent Intelligence
| Step | Test | Expected |
|:-----|:-----|:---------|
| 2.1 | POST `/api/agent/[id]/dreams` — trigger dream cycle | 200 + dream output |
| 2.2 | POST `/api/rag` — autonomous RAG query | 200 + cited answer |
| 2.3 | Dashboard → Dreams tab → trigger | Real LLM consolidation output |

### 3. Encrypted Vault
| Step | Test | Expected |
|:-----|:-----|:---------|
| 3.1 | POST `/api/memory/encrypted` — encrypt a memory | 200 + encrypted hash |
| 3.2 | GET `/api/memory/encrypted?agentId=X` | Encrypted entries listed |
| 3.3 | Decrypt from Dashboard | Original plaintext restored |

### 4. A2A Sharing
| Step | Test | Expected |
|:-----|:-----|:---------|
| 4.1 | POST `/api/agent/[id]/share` — grant access | 200 + grant ID |
| 4.2 | GET `/api/agent/[id]/share` — list grants | Active grants listed |
| 4.3 | DELETE `/api/agent/[id]/share` — revoke | 200 + grant revoked |

### 5. Brain INFTs (ERC-7857)
| Step | Test | Expected |
|:-----|:-----|:---------|
| 5.1 | POST `/api/agent/[id]/mint-inft` — mint brain | 201 + tokenId + txHash |
| 5.2 | GET `/api/agent/[id]/mint-inft` — list INFTs | Array of brain NFTs |
| 5.3 | GET `/api/inft/transfer?tokenId=X` — check pending | `hasPendingTransfer: false` |
| 5.4 | Click explorer link | Contract visible on chainscan-galileo |

### 6. KV Store
| Step | Test | Expected |
|:-----|:-----|:---------|
| 6.1 | GET `/api/kv?action=status` | `configured: true` |
| 6.2 | GET `/api/kv?action=health` | `canRead: true` |

### 7. Compute Providers
| Step | Test | Expected |
|:-----|:-----|:---------|
| 7.1 | POST `/api/compute/router` — 0G Router inference | 200 + completion |
| 7.2 | GET `/api/compute/providers` — list providers | Available providers |
| 7.3 | Dashboard → Inference Lab → test all 4 | Responses from each tier |

### 8. Skills Marketplace
| Step | Test | Expected |
|:-----|:-----|:---------|
| 8.1 | GET `/api/skills` — list skills | Array of published skills |
| 8.2 | POST `/api/execute` — execute a free skill | 200 + execution result |
| 8.3 | POST `/api/pay` — paid skill execution | 200 + payment txHash + result |

---

## CLI E2E Test

```bash
node scripts/e2e-demo.mjs
```

Runs the full pipeline: identity → memory → embeddings → search → skill → payment.

## Production Demo Path

1. Open `http://localhost:3000` → Landing page loads
2. Click "Launch Dashboard" → Dashboard loads with 8 tabs
3. Memory Explorer → Create memory → 0G hash appears
4. Agent Dreams → Trigger → LLM output stored on 0G
5. Encrypted Vault → Encrypt → Ciphertext on 0G
6. Brain INFTs → Mint → Token on chainscan-galileo
7. Inference Lab → Test 4 providers → All respond
