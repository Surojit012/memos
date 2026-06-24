# MEMOS Changelog

All notable changes since the `29656e6` commit ("fix: restore landing page UI and update routes").

---

## Unreleased — Session Upgrades

### 1. Inference Layer — 0G Router & Fireworks

**File:** `lib/intelligence/llm.ts`

**What changed:**
- **Removed OpenAI as an inference provider entirely.** It was provider #3 in the
  fallback chain (`gpt-4o-mini`). The entire `if (openaiKey)` block — roughly 30
  lines — was deleted.
- **Fixed 0G Router URL.** Was hardcoded to the mainnet endpoint
  (`https://router-api.0g.ai/v1`). Now reads `process.env.ZG_ROUTER_BASE_URL`, with
  a default of `https://router-api-testnet.integratenetwork.work/v1` (the testnet
  partner router). Testnet keys were silently rejected by the mainnet URL, producing
  the "No inference provider configured" error.
- **Changed default model for 0G Router** from `qwen/qwen-2.5-7b-instruct` to
  `qwen2.5-omni` to match what the testnet router actually serves.
- **Fireworks model is now env-configurable.** Was hardcoded to
  `accounts/fireworks/models/llama-v3p3-70b-instruct` (which returned 404 on this
  account). Now reads `process.env.FIREWORKS_MODEL`, defaulting to
  `accounts/fireworks/models/glm-5p2`.
- Provider chain is now: **0G Router → Fireworks → local mock**.

**File:** `lib/0g-compute-router.ts`

- **Fixed `ROUTER_BASE_URL`** from the hardcoded mainnet string to
  `process.env.ZG_ROUTER_BASE_URL || 'https://router-api-testnet.integratenetwork.work/v1'`.
- **Changed default model** from `deepseek-ai/DeepSeek-V3` to `qwen2.5-omni`.

**File:** `.env.local`

- Added `ZG_ROUTER_BASE_URL=https://router-api-testnet.integratenetwork.work/v1`
- Changed `ZG_ROUTER_MODEL=qwen2.5-omni`
- Changed `FIREWORKS_MODEL=accounts/fireworks/models/glm-5p2`

---

### 2. Memory Durability — `waitUntil` + Serialized Flush Chain

**Problem:** Memories stored via `POST /api/memory` were fire-and-forget. On
Vercel, the serverless function freezes the instant a response is sent, killing
any background async work mid-flight. The memory was written to the in-memory store
but the 0G upload and Supabase manifest pointer never finished → memories
disappeared on page refresh.

**File:** `app/api/memory/route.ts`

- Added `import { waitUntil } from '@vercel/functions'`.
- Wrapped the background persistence IIFE (`embed → upload → manifest flush`) in a
  named `const persist = (async () => { ... })()`.
- Called `try { waitUntil(persist) } catch { /* local dev */ }` so Vercel keeps the
  function alive until the persist chain settles. The `try/catch` is needed because
  `waitUntil` throws outside a Vercel request scope (local `npm run dev` runs in a
  long-lived process that doesn't need it).
- Changed `void upsertMemoryManifestRecord(hydratedMemory)` to
  `await upsertMemoryManifestRecord(hydratedMemory)` so the function waits for the
  manifest flush before the `persist` promise resolves.
- Auth tightened: POST now accepts **either** a valid Agent API Key **or** the
  platform secret (was: platform secret only). Switched from synchronous
  `validateAgentApiKey` to async `validateAgentApiKeyAsync`.

**File:** `app/api/memory/[id]/route.ts`

- Added `waitUntil` for the deletion manifest flush — same pattern as above.
  Without this, deleting a memory didn't durably update 0G, so the deleted memory
  reappeared after restart when the agent was restored from its last snapshot.
- Auth tightened: DELETE now accepts agent API key or platform secret (was: platform
  secret only).

**File:** `lib/0g-manifest.ts`

- Added `let flushChain: Promise<void> = Promise.resolve()` — a serialization
  primitive that ensures concurrent `queueAgentUpdate` calls don't race.
- `queueAgentUpdate` now **returns `Promise<void>`** and appends a flush link to
  `flushChain` instead of calling `waitUntil` directly. This guarantees ordering:
  "by the time this promise resolves, this agent's 0G upload + Supabase pointer have
  completed."
- `upsertMemoryManifestRecord`, `removeMemoryManifestRecord`, and
  `upsertSkillManifestRecord` all changed return type from `void` to
  `Promise<void>` — callers can now `await` them to block until durable.
- **Added Supabase manifest pointer as the primary durability mechanism.** In
  `flushManifests`, after uploading the 0G blob:
  1. Calls `updateManifestHash(agentId, newHash)` into Supabase (new step, primary).
  2. Then attempts `updateAgentHashOnChain` (on-chain anchor, best-effort).
  On-chain step failing for Privy agents (not registered on-chain) is now
  non-fatal — Supabase pointer is the source of truth for those agents.
- Retry logic for failed flushes now uses the serialized chain rather than a bare
  `waitUntil(flushManifests())`.

---

### 3. Marketplace Security Audit — 7 Vulnerabilities Fixed

#### 3a. POST `/api/skills` — Anti-spoofing (`publisherAgentId`)

**File:** `app/api/skills/route.ts`

- **Before:** Platform secret was the only auth gate. Anyone with the secret could
  publish a skill attributed to ANY `agentId`.
- **After:** When an agent API key is used to authenticate, the backend forces
  `body.publisherAgentId = body.agentId`. Any attempt to set a different
  `publisherAgentId` returns HTTP 403.

#### 3b. PUT `/api/skills` — Complete Auth Gap

- **Before:** The PUT (skill update) endpoint had **zero authentication**. Anyone
  could rewrite any skill's prompt, price, or payout address with no credentials.
- **After:** Added full auth: caller must present a valid agent API key (for the
  `body.agentId`) or the platform secret. Returns 401 if neither is valid.
- **After:** Added ownership check: agent-key callers may only update skills whose
  `publisherAgentId` matches `body.agentId`. Returns 403 otherwise.
- **After:** Payout integrity check: if the update makes a skill paid (price > 0),
  `publisherAddress` must be a valid Ethereum address. Returns 400 otherwise.

#### 3c. Payment TOCTOU Race Condition

**File:** `lib/store.ts`

- Added `const reservedPaymentTxHashes = new Set<string>()`.
- Added `reservePaymentTxHash(txHash): boolean` — atomically claims a txHash before
  the slow (async) on-chain verification. Returns `false` if already reserved.
  Because Node.js is single-threaded, this check-and-set is race-free within a
  process — it closes the window where two concurrent HTTP requests could both pass
  a "not consumed yet" check and proceed to execute.
- Added `releasePaymentTxHash(txHash): void` — releases the reservation if execution
  fails, so the paying user can retry with the same valid txHash.

#### 3d. Payment Replay Attack (Cross-Restart)

**File:** `lib/db/payments.ts` *(new file)*

- `isPaymentConsumedDurable(txHash): Promise<boolean>` — checks Supabase
  `consumed_payments` table. Returns `false` on any error (table missing, network)
  so legitimate executions aren't blocked.
- `markPaymentConsumedDurable(txHash, skillId): Promise<void>` — inserts into
  Supabase. Ignores unique-violation errors (23505) since they mean it was already
  recorded.
- Both functions degrade gracefully if `NEXT_PUBLIC_SUPABASE_URL` or
  `SUPABASE_SERVICE_ROLE_KEY` is missing.

**File:** `lib/db/migrations/005_consumed_payments.sql` *(new file)*

```sql
CREATE TABLE IF NOT EXISTS consumed_payments (
  tx_hash     VARCHAR(80)  PRIMARY KEY,
  skill_id    VARCHAR(255) NOT NULL,
  consumed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

#### 3e. Payment Refund/Retry Semantics

**File:** `app/api/execute/route.ts`

- Added `let unconsumedTxHash: string | null = null` and `releaseUnconsumed()` helper.
- The flow is now:
  1. **Reserve** `txHash` atomically before on-chain verify (TOCTOU guard).
  2. **Verify** on-chain. If it fails → `releaseUnconsumed()` → user can retry.
  3. Run LLM execution. If it fails → `releaseUnconsumed()` → user can retry.
  4. **Only after LLM succeeds** → `markPaymentConsumed` (in-memory) +
     `markPaymentConsumedDurable` (Supabase). Payment is now irreversibly spent.
- Every failure path (verify error, 0G compute error, router error, Fireworks
  unconfigured, invalid provider, unexpected `catch`) calls `releaseUnconsumed()`.
- Added rate limiting: 20 requests per 60 seconds per IP.
- Added input cap: `userInput` must be ≤ 12,000 characters.
- Added authentication: caller must have a valid agent API key or platform secret.

#### 3f. Rate Limiting on Inference Routes

All LLM-backed routes now have per-IP sliding window rate limits:

| Route | Limit |
|---|---|
| `POST /api/execute` | 20 req / 60 s |
| `POST /api/rag` | 20 req / 60 s |
| `POST /api/search` | 30 req / 60 s |
| `POST /api/pipeline` | 10 req / 60 s |

#### 3g. Pipeline Auth Gap

**File:** `app/api/pipeline/route.ts`

- Added full auth (agent API key or platform secret). Was missing entirely.
- Added rate limiting (10 req / 60 s).

---

### 4. Pending Supabase Migrations

**File:** `lib/db/migrations/000_PENDING_RUN_THESE.sql` *(new file)*

A single-paste bundle of all migrations that need to be run in Supabase:
- `002_agent_name.sql` — `agent_name` column on agents
- `003_usage_daily.sql` — daily usage tracking table
- `004_manifest_pointer.sql` — `manifest_hash` column for Supabase-backed durability
- `005_consumed_payments.sql` — `consumed_payments` table for replay protection

Run at: `https://supabase.com/dashboard/project/<your-project>/sql/new`

---

### 5. Skills Tab — Full Rewrite

**File:** `components/playground/tabs/skills-tab.tsx`

- Added **Marketplace / My Skills toggle** (`View = 'marketplace' | 'mine'`). "My
  Skills" filters to skills where `publisherAgentId === agentId`.
- Added **"+ Publish Skill" button**, only shown when `canPublish = isLive && !!agentId && !!apiKey`.
- Added **inline publish/edit form** with fields:
  - Name, Description, Category (select), System Prompt, Price (0G tokens),
    Publisher Payout Wallet, Tags (comma-separated).
- Client-side validation: wallet address must be a valid `0x...` Ethereum address
  for paid skills.
- `openEdit(skill)` pre-fills the form from an existing skill and submits via `PUT`.
- Skill cards for owned skills show a **"yours" badge** and **"Edit" button**.
- Added reusable `FormField` component (label + input or textarea).
- **Fixed execute payload:** was sending `input: inputText`, now sends
  `userInput: inputText.trim()` (matching the API's required field name).
- **Fixed response mapping:** was reading `data.result`, now reads `data.output`.

---

### 6. Dream Tab — Crash Fixes & Correct Field Mapping

**File:** `components/playground/tabs/dream-tab.tsx`

- **Fixed `.map()` crash:** `result.newMemories` could be `undefined` after a dream
  cycle with no new memories. Added `?? []` guard.
- **Fixed blank stats:** The `DreamResult` interface used field names that the API
  never returned (`memoriesAnalyzed`, `patternsFound`, `dreamSummary`, etc.). Added
  explicit mapping in `handleDream`:
  ```
  data.totalMemoriesProcessed → memoriesAnalyzed
  data.consolidatedCount      → patternsFound / newMemoriesCreated
  data.message                → dreamSummary
  data.consolidated           → newMemories (array of strings)
  data.durationMs             → duration
  ```
- **Added empty-state UI** when `newMemories.length === 0` instead of rendering
  nothing.
- **Memory type colors** now use playground CSS variables (`rgba(...)` tones) instead
  of hardcoded light-mode hex values that were invisible on dark backgrounds.
- All inline color/font references replaced with `var(--pg-*)` design tokens.

**File:** `app/api/agent/[agentId]/dreams/route.ts`

- Added diagnostic messages that distinguish two distinct no-op reasons:
  - "too few episodic memories (< 3)" — tells the user exactly what to do.
  - "no shared pattern found" — explains what patterns require.
- Added `episodicCount` field to the response so the frontend/SDK can show the
  actual count.

---

### 7. RAG Tab — Visibility Fix

**File:** `components/playground/tabs/rag-tab.tsx`

- Fixed invisible user message text. The user bubble had a dark background
  (`var(--pg-text)`) but `color` was also `var(--pg-text)` — text was the same
  color as its background. Fixed to `color: msg.role === 'user' ? 'var(--pg-bg)' : 'var(--pg-text)'`.

---

### 8. Search Tab — Active Toggle Button Visibility

**File:** `components/playground/tabs/search-tab.tsx`

- Both "Keyword" and "Semantic" toggle buttons had `background: 'transparent'` for
  the active state — making the active button invisible. Fixed to
  `background: 'var(--pg-bg)'` when active.

---

### 9. UsageChart — Null Guard

**File:** `components/playground/usage-chart.tsx`

- Added `const data = rawData ?? []` to guard against `undefined` prop causing a
  `.map()` crash.

**File:** `app/dashboard/api-keys/page.tsx`

- Fixed: `data={usage.series ?? []}` passed to `<UsageChart>`.

---

### 10. TypeScript SDK (`memos-sdk`) — Bumped to 0.2.0

**Package:** `packages/memos-ts/`

**File:** `src/client.ts`

- `executeSkill`: now sends `userInput` (was `input`). Reads `data.output` (was
  `data.result`), `data.model`, and `data.computeProvider` from the response.
- `runPipeline`: now sends `initialInput` (was `input`).
- `triggerDream`: now maps real API fields to `DreamResult`:
  - `data.totalMemoriesProcessed → memoriesAnalyzed`
  - `data.consolidatedCount → patternsFound / newMemoriesCreated`
  - `data.message → dreamSummary`
  - `data.consolidated → newMemories`
  - `data.durationMs → duration`

**File:** `src/types.ts`

- `SkillResult`: removed `duration` (never in API response); added `model: string`
  and `computeProvider: string`.
- `DreamResult.newMemories`: changed from `Partial<Memory>[]` to `string[]`
  (the API returns an array of raw fact strings, not Memory objects).

**File:** `tests/client.test.ts`

- Fixed `triggerDream` test: mock was using the old field names
  (`memoriesAnalyzed`, `patternsFound` etc.). Updated to use the real API response
  shape (`totalMemoriesProcessed`, `consolidatedCount`, `message`, `consolidated`,
  `durationMs`) so the 11 tests all pass.

**File:** `package.json` — bumped to `0.2.0`.

**Published:** `npm publish --access public` succeeded. `memos-sdk@0.2.0` is live
on npm.

**File:** `CHANGELOG.md` — created.

---

### 11. Python SDK (`memos-ai`) — Bumped to 0.2.0

**Package:** `packages/memos-py/`

**File:** `memos/client.py`

- `execute_skill`: now sends `"userInput"` (was `"input"`). Reads
  `data.get("output")` (was `data.get("result")`). Removed `duration` from the
  returned dict.
- `run_pipeline`: now sends `"initialInput"` (was `"input"`).
- `dream()`: now maps real API fields:
  - `totalMemoriesProcessed → memoriesAnalyzed`
  - `consolidatedCount → patternsFound / newMemoriesCreated`
  - `message → dreamSummary`
  - `consolidated → newMemories` (list of strings)
  - `durationMs → duration`

**File:** `memos/models.py`

- `SkillResult`: removed `duration: int`; added `model: str = ""` and
  `compute_provider: str = ""`.
- `DreamResult.new_memories`: now `List[str]` (was `List[dict]`).

**File:** `pyproject.toml` — bumped to `0.2.0`.

**File:** `CHANGELOG.md` — created.

**To publish** (run from `packages/memos-py/`):
```bash
cd packages/memos-py
python3 -m pip install --upgrade build twine
python3 -m build
twine upload dist/*
```

---

### 12. Database Schema

**File:** `lib/db/schema.sql`

Updated to include all tables used by the above features:
- `consumed_payments` — durable payment replay protection
- `manifest_hash` column on agents — Supabase-backed durability for Privy agents

---

### 13. Wallet Payment UI — Pay & Run Paid Skills from the Playground

**Problem:** Free skills executed fine, but paid skills were a dead-end in the
browser. `handleExecute` never sent a `paymentProof`, so `/api/execute` returned
**402 Payment Required**. There was no on-chain payment step anywhere in the
frontend, even though the `/api/pay` backend and escrow contract were ready.

**File:** `hooks/use-skill-payment.ts` *(new file)*

- New `useSkillPayment()` hook. Built on **Privy** (the app's existing wallet/auth
  layer) + **ethers** — *not* wagmi (wagmi/RainbowKit are in `package.json` but were
  never wired into a provider tree, so adding them would mean a whole new provider
  stack).
- `payForSkill(skillId, onStatus)` does the full on-chain flow:
  1. `POST /api/pay { action: 'prepare', skillId }` → `{ contractAddress,
     publisherAddress, platformAddress, amountWei, chainId }`.
  2. `wallet.switchChain(chainId)` — best-effort switch to the 0G chain.
  3. `wallet.getEthereumProvider()` → `ethers.BrowserProvider` → signer →
     `contract.executeSkillPayment(skillId, publisher, platform, amountWei, { value: amountWei })`.
  4. **`await tx.wait()`** — waits for the tx to MINE before returning, because the
     server-side verifier reads the receipt (handing it an unmined hash would 402).
  5. Returns the confirmed `txHash`.
- Also returns `hasWallet` so the UI can require a connected wallet before paying.

**File:** `components/playground/tabs/skills-tab.tsx`

- `handleExecute` now branches on `priceNum(selectedSkill) > 0`:
  - **Free skills:** unchanged — straight to `/api/execute`.
  - **Paid skills (live):** `payForSkill(...)` first, then `/api/execute` with
    `paymentProof: { txHash }`.
- **No-double-charge retry:** added `paidTxRef` (a `useRef<Record<skillId, txHash>>`).
  - A paid-but-unconsumed txHash is cached per skill.
  - If a prior execution failed, the next run **reuses the same txHash** instead of
    charging again — matching the backend's reserve/release/consume semantics (the
    backend releases the reservation on execution failure).
  - Cleared on success (payment consumed) or on a **409** "already used" response
    (the cached tx is dead → retry must pay again).
- **UI:**
  - Button label is now `Pay {price} OG & Execute` for paid skills (was generic
    "Execute Skill").
  - During the flow the button shows live status: *"Preparing payment…"*,
    *"Confirm the payment in your wallet…"*, *"Waiting for on-chain confirmation…"*,
    *"Running the skill…"* (via the new `payStatus` state).
  - The paid-skill notice now explains the on-chain charge, warns when **no wallet
    is connected** (and disables the button), and tells the user when a previous
    unconsumed payment will be reused at no extra charge.

**Backend (already existed, now actually used):**
- `app/api/pay/route.ts` — `prepare` / `verify` actions.
- `lib/payments.ts` `prepareSkillPayment` — returns contract address, recipients,
  `amountWei`, and `chainId`.
- `lib/payment-abi.ts` — `executeSkillPayment(string,address,address,uint256) payable`.
- `app/api/execute/route.ts` — consumes `paymentProof.txHash`, verifies on-chain,
  and only consumes the payment after the LLM call succeeds (see §3e).

---

### 14. Hard Testnet Lock — No Mainnet Path Anywhere

**Intent:** The playground and paid-skill payments must run **exclusively on the
0G Galileo testnet**. Users pay only with **testnet OG tokens** — never real funds.

**File:** `lib/0g-network.ts`

- Added `const FORCE_TESTNET = true` — a single hard lock. While set:
  - The network key is **always** `'testnet'`, ignoring `NEXT_PUBLIC_0G_NETWORK`
    (even if someone sets it to `mainnet`).
  - `chainId` is pinned to **16602** (0G Galileo testnet) in `normalizeChainId` —
    the mainnet id (16661) is rejected.
  - A non-testnet `NEXT_PUBLIC_0G_RPC` or `NEXT_PUBLIC_0G_INDEXER` override is
    **refused** (falls back to the testnet default + logs a warning) via the new
    `isTestnetUrl()` guard — a stray mainnet URL can't leak through.
- The mainnet config block is kept but is now unreachable; flipping `FORCE_TESTNET`
  to `false` (after a call-site review) is the only way to ever enable mainnet.

**File:** `hooks/use-skill-payment.ts`

- After `switchChain`, the hook now **hard-verifies the active chain** via
  `provider.getNetwork()` before sending any funds. If the wallet is still on a
  different network (e.g. a real mainnet), it **aborts** with a clear error rather
  than risk moving real funds off the intended testnet.

**File:** `components/playground/tabs/skills-tab.tsx`

- Paid-skill notice now explicitly says **"testnet OG"** / **"0G Galileo testnet"**
  and reminds users to get test tokens from the 0G faucet ("No real funds").

**Note:** Inference is already testnet-only — `ZG_ROUTER_BASE_URL` points at the
testnet router (`router-api-testnet.integratenetwork.work/v1`), see §1.

---

## Summary of Pending Actions

| Action | Location | Status |
|---|---|---|
| Run Supabase migrations | `lib/db/migrations/000_PENDING_RUN_THESE.sql` | ⏳ Not yet run |
| Publish Python SDK | `packages/memos-py/` | ⏳ Build step failed (wrong dir) |
| Wire wallet payment UI | `hooks/use-skill-payment.ts` + `skills-tab.tsx` | ✅ Done (Privy + ethers) |
| Set `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS` + `PLATFORM_WALLET_ADDRESS` | `.env.local` | ⚠️ Required for paid skills to work |
