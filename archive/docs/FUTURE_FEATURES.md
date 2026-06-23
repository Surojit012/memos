# Future memos Features

To keep the application streamlined and focus the hackathon narrative on the core "Store, Retrieve, Evolve" capabilities of memos, we have hidden several advanced features from the dashboard. 

These features are still fully functional in the backend/contracts and their React components exist in the codebase, but they are not currently exposed in the UI.

## 1. 0G Compute Funding
**Description:** A dashboard tab that allows users to deposit 0G tokens into their broker ledger and transfer funds directly to compute providers for LLM inference.
**Status:** The smart contracts and `useComputeBroker` hook are fully working. The UI was removed to reduce friction during demos.

## 2. Brain Snapshots
**Description:** Takes a point-in-time snapshot of the agent's memory graph, saves it to IPFS/0G Storage, and mints an NFT representing the brain state.
**Status:** Core logic works. Hidden to keep the focus on dynamic memory rather than static exports.

## 3. 0G Inference Lab
**Description:** A playground to test raw LLM inference against various 0G Compute providers without memory context.
**Status:** Redundant since the RAG Chat tab proves the inference capabilities in a much more impressive, context-aware manner.

## 4. Encrypted Vault
**Description:** AES-256-GCM encryption for memories before they are uploaded to 0G. Only the owning wallet can decrypt them.
**Status:** Hidden because it's difficult to demo encryption visually in a 3-minute pitch without causing confusion.

## 5. A2A (Agent-to-Agent) Sharing
**Description:** Allows one agent to securely share access to a subset of its memories with another agent via on-chain ACLs.
**Status:** Highly complex flow that requires setting up multiple wallets and agents. Deferred for future enterprise updates.

---

### How to re-enable
To restore these features, simply uncomment their `<button>` links in the `Sidebar` component and their conditional rendering blocks in the main layout of `app/dashboard/page.tsx`.
