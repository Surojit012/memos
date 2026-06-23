# memos — Hackathon Demo Script (3–5 minutes)

> Updated: 2026-05-01 | All features live on Galileo Testnet

## Prerequisites
- Server running: `npm run dev`
- Browser open to `http://localhost:3000`
- No MetaMask needed for dashboard (uses platform secret internally)

---

## Demo Flow

### Act 1: The Landing (30 seconds)

1. Open `http://localhost:3000`
2. **Show the headline**: "The operating system for autonomous AI agents"
3. **Point to stats bar**: "22 0G Use Cases, 3 Smart Contracts, 4 AI Providers"
4. **Scroll to Feature Bento**: "Every feature you see uses 0G Storage, 0G Compute, or 0G Chain — most use all three"
5. **Click "Launch Dashboard"**

### Act 2: Memory Creation (60 seconds)

1. In the Dashboard, **select an agent** from the sidebar
2. **Create a new memory**:
   - Type: `semantic`
   - Content: "The user prefers TypeScript over Python for backend development"
   - Click **Store Memory**
3. **Point out**: "Watch the bottom of the card — it says 'uploading to 0G Storage'. In the background, memos is building a Merkle tree and uploading to the 0G Storage Indexer"
4. **Wait ~10 seconds** for the 0G hash to appear
5. **Click the hash link** → Opens 0G Storage Scan showing the actual blob on-chain

### Act 3: Agent Dreams (60 seconds)

1. Switch to the **Agent Dreams** tab
2. Click **"Trigger Dream Cycle"**
3. **Explain**: "This is like sleep for AI. The agent's episodic memories are being consolidated into semantic facts by Llama 70B via Fireworks AI — the same way human brains consolidate memories during sleep"
4. **Show the dream output**: Real LLM-generated consolidation insights
5. **Point out**: "The dream output itself is stored on 0G Storage — it's a new memory"

### Act 4: Encrypted Vault (45 seconds)

1. Switch to the **Encrypted Vault** tab
2. **Select a memory** to encrypt
3. Click **Encrypt**
4. **Explain**: "AES-256-GCM encryption happens client-side. The ciphertext is uploaded to 0G Storage. Only the owning wallet can decrypt. Even the storage nodes can't read this data — HIPAA-ready by design"
5. **Show the encrypted blob** — it's gibberish on 0G Storage Scan

### Act 5: Cross-Agent Sharing (45 seconds)

1. Switch to the **A2A Sharing** tab
2. **Select "From" agent and "To" agent**
3. **Pick specific memories** to share
4. Click **Grant Access**
5. **Explain**: "Agent A just granted Agent B access to 3 specific memories. This is a revocable grant — Agent A can revoke at any time. No shared database needed, just 0G hashes with access control"

### Act 6: Brain INFT (45 seconds)

1. Switch to the **Brain INFTs** tab
2. Click **"Mint Brain INFT"** on the current agent
3. **Wait for the on-chain transaction** (~5-10 seconds)
4. **Show the result**: Token ID, tx hash, explorer link
5. **Click the explorer link** → Shows the ERC-7857 contract on Galileo chain scan
6. **Explain**: "This agent's entire cognitive state is now a tradeable NFT with encrypted metadata. If it transfers, the encryption key is re-encrypted for the new owner via a two-phase intelligent transfer protocol"

### Act 7: The Killer Slide (30 seconds)

Close with this:

> "memos has **30 distinct 0G use cases** across Storage, Compute, and Chain. Every memory, every index, every embedding, every encrypted vault, every agent manifest — it all lives on 0G. There's no AWS, no Pinecone, no Redis. This isn't a project that uses 0G. This IS 0G."

---

## Backup Talking Points (if asked)

**Q: "What if 0G is slow?"**
A: "We have 4 inference providers with automatic failover. If 0G Router is slow, Fireworks Llama 70B handles it in sub-second. The storage uploads take 10-30 seconds but we use optimistic local caching while the Merkle tree finalizes."

**Q: "Is the encrypted vault really secure?"**
A: "AES-256-GCM with wallet-derived keys. The ciphertext on 0G is indistinguishable from random data. We never store plaintext keys — they're derived from the connected wallet's signature."

**Q: "What's ERC-7857?"**
A: "It's an extension of ERC-721 for Intelligent NFTs. The key innovation is the two-phase transfer: when the NFT transfers, the encrypted metadata key must be re-encrypted for the new owner. Standard ERC-721 transferFrom is blocked — you must use iTransferFrom which locks the token until re-encryption completes."

**Q: "What's the KV layer?"**
A: "0G Storage has two layers. The Log layer is immutable — append-only Merkle blobs. The KV layer is mutable — key-value pairs that can be updated. We use Log for memories and KV for manifests, so any memos node can bootstrap its entire state from a single 0G key lookup."
