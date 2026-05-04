/**
 * app/api/identity/route.ts
 *
 * Agent identity registration + lookup.
 *
 * PERSISTENCE STRATEGY (2-layer):
 * ┌──────────────────────────────────────────────────────┐
 * │  Layer 1: Vercel KV (Redis)  — FAST, RELIABLE       │
 * │  < 50ms writes, < 10ms reads. Never loses data.     │
 * │  This is the SOURCE OF TRUTH for agent lookups.      │
 * ├──────────────────────────────────────────────────────┤
 * │  Layer 2: 0G Storage — PERMANENT, DECENTRALIZED     │
 * │  15-45s writes. Used for on-chain identity proof.    │
 * │  Runs in background — doesn't block the response.   │
 * └──────────────────────────────────────────────────────┘
 *
 * Security: Wallet signature verification prevents identity hijacking.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAgent, getAllAgents, registerOrUpdateAgent, upsertHydratedAgent, updateAgentHash } from '@/lib/store'
import { upsertAgentManifestRecord, flushManifest } from '@/lib/0g-manifest'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { ensureHydrated } from '@/lib/hydration'
import { verifyWalletSignatureWithNonce } from '@/lib/auth'
import { generateHmacApiKey } from '@/lib/auth'
import { saveAgentToKV, getAgentFromKV, getAgentsByOwnerFromKV, isKVConfigured } from '@/lib/agent-kv'

export const maxDuration = 60;

// GET /api/identity?agentId=xxx → get one agent
// GET /api/identity?ownerAddress=xxx → get all agents for a wallet
export async function GET(req: NextRequest) {
  await ensureHydrated()
  const agentId = new URL(req.url).searchParams.get('agentId')
  const ownerAddress = new URL(req.url).searchParams.get('ownerAddress')
  
  if (agentId) {
    // Try RAM first, then KV
    let agent = getAgent(agentId)
    if (!agent && isKVConfigured()) {
      agent = (await getAgentFromKV(agentId)) ?? undefined
      if (agent) {
        // Re-hydrate into RAM for this instance
        upsertHydratedAgent(agent)
        console.log(`⚡ Agent [${agentId}] restored from KV into RAM`)
      }
    }
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (agent.ownerAddress && !agent.apiKey) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }
    return NextResponse.json({ agent })
  }
  
  // Get all agents for a wallet
  let allAgents = getAllAgents(ownerAddress || undefined)

  // If RAM is empty for this wallet, check KV
  if (allAgents.length === 0 && ownerAddress && isKVConfigured()) {
    const kvAgents = await getAgentsByOwnerFromKV(ownerAddress)
    if (kvAgents.length > 0) {
      console.log(`⚡ Restored ${kvAgents.length} agents from KV for wallet ${ownerAddress.slice(0, 10)}...`)
      kvAgents.forEach(a => upsertHydratedAgent(a))
      allAgents = kvAgents
    }
  }

  allAgents.forEach(agent => {
    if (agent.ownerAddress && !agent.apiKey) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }
  })
  return NextResponse.json({ agents: allAgents })
}

// POST /api/identity → register a new agent identity on 0G
export async function POST(req: NextRequest) {
  try {
    await ensureHydrated()
    const { agentId, name, ownerAddress, signature, message } = await req.json()

    if (!agentId?.trim()) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }
    if (!ownerAddress?.trim()) {
      return NextResponse.json({ error: 'ownerAddress is required' }, { status: 400 })
    }

    // ── Security: Require wallet signature to prove ownership ──
    if (!signature || !message) {
      return NextResponse.json({
        error: 'Signature and message are required to prove ownership of the ownerAddress.',
        hint: 'Sign a message like "Register agent <agentId> on MemoryOS" with your wallet.',
      }, { status: 401 })
    }

    const { valid, error } = verifyWalletSignatureWithNonce(ownerAddress, message, signature)
    if (!valid) {
      return NextResponse.json({ error: error || 'Invalid signature. Ownership of wallet address not proven.' }, { status: 401 })
    }

    // Step 1 — register in local RAM store immediately
    const agent = registerOrUpdateAgent(agentId.trim(), name?.trim() || agentId, ownerAddress.trim().toLowerCase())

    if (agent.ownerAddress && (!agent.apiKey?.startsWith('mos_') || agent.apiKey?.length !== 36)) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }

    // Step 2 — SAVE TO KV IMMEDIATELY (< 50ms, guarantees persistence)
    await saveAgentToKV(agent)

    // Step 3 — Upload identity to 0G Storage in background
    // This is the "permanent proof" layer. It's slow but doesn't block the response.
    const backgroundUpload = async () => {
      try {
        const identityRecord = {
          agentId: agent.agentId,
          name: agent.name,
          ownerAddress: agent.ownerAddress,
          registeredAt: agent.createdAt,
          platform: 'MemoryOS',
          network: 'Galileo Testnet',
          version: '1.0',
          capabilities: ['memory-read', 'memory-write', 'skill-publish', 'skill-execute'],
          timestamp: new Date().toISOString(),
        }
        const hash = await uploadToStorage(identityRecord)
        updateAgentHash(agentId, hash)
        const hydratedAgent = { ...agent, identityHash: hash }
        upsertHydratedAgent(hydratedAgent)
        await upsertAgentManifestRecord(hydratedAgent)
        // Update KV with the hash
        await saveAgentToKV(hydratedAgent)
        console.log(`✓ Agent [${agentId}] identity registered on 0G: ${hash}`)
        // Flush manifest (best-effort)
        await flushManifest().catch(() => {})
      } catch (err: any) {
        console.error(`✗ 0G identity upload failed [${agentId}]:`, err.message)
      }
    }

    // Fire and forget — don't block the HTTP response
    // The agent is ALREADY safely persisted in KV.
    backgroundUpload().catch(() => {})

    return NextResponse.json({
      agent,
      status: 'registered',
      message: 'Agent registered and persisted. 0G identity proof is being generated.',
      kvPersisted: isKVConfigured(),
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
