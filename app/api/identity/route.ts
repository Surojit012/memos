/**
 * app/api/identity/route.ts
 *
 * Real Agent ID registration on 0G.
 *
 * How it works:
 * 1. Agent sends their agentId + name + ownerAddress + signature
 * 2. We verify the wallet signature to prove ownership
 * 3. We create an identity object with metadata
 * 4. Upload it to 0G Storage → get a permanent hash
 * 5. That hash IS the agent's on-chain identity proof
 * 6. Anyone can verify the agent by checking the hash on 0G Explorer
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

export const maxDuration = 60;

// GET /api/identity?agentId=xxx → get one agent
// GET /api/identity?ownerAddress=xxx → get all agents for a wallet
export async function GET(req: NextRequest) {
  await ensureHydrated()
  const agentId = new URL(req.url).searchParams.get('agentId')
  const ownerAddress = new URL(req.url).searchParams.get('ownerAddress')
  
  if (agentId) {
    const agent = getAgent(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (agent.ownerAddress && !agent.apiKey) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }
    return NextResponse.json({ agent })
  }
  
  const allAgents = getAllAgents(ownerAddress || undefined)
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

    // Step 1 — register in local store immediately
    const agent = registerOrUpdateAgent(agentId.trim(), name?.trim() || agentId, ownerAddress.trim().toLowerCase())

    // Step 2 — build the identity object to store on 0G
    const identityRecord = {
      agentId:     agent.agentId,
      name:        agent.name,
      ownerAddress: agent.ownerAddress,
      registeredAt: agent.createdAt,
      platform:    'MemoryOS',
      network:     'Galileo Testnet',
      version:     '1.0',
      capabilities: ['memory-read', 'memory-write', 'skill-publish', 'skill-execute'],
      timestamp:   new Date().toISOString(),
    }

    // Step 3 — upload identity to 0G Storage (wait up to 60s)
    try {
      const hash = await uploadToStorage(identityRecord)
      updateAgentHash(agentId, hash)
      const hydratedAgent = { ...agent, identityHash: hash }
      upsertHydratedAgent(hydratedAgent)
      await upsertAgentManifestRecord(hydratedAgent)
      console.log(`✓ Agent [${agentId}] identity registered on 0G: ${hash} by ${agent.ownerAddress}`)
      console.log(`  ${getExplorerUrl(hash)}`)
    } catch (err: any) {
      console.error(`✗ Agent identity upload failed [${agentId}]:`, err.message)
      // We don't throw! We return success to the UI so it doesn't crash with an HTML error.
    }

    if (agent.ownerAddress && (!agent.apiKey?.startsWith('mos_') || agent.apiKey?.length !== 36)) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }

    // Step 4 — CRITICAL: Flush manifest to 0G immediately!
    // Without this, the debounced manifest upload (10s delay) gets killed
    // when Vercel destroys the serverless instance, and the agent is lost forever.
    try {
      const manifestHash = await flushManifest()
      if (manifestHash) {
        console.log(`✓ Manifest flushed to 0G: ${manifestHash.slice(0, 16)}...`)
      }
    } catch (err: any) {
      console.warn(`⚠ Manifest flush failed (agent still in RAM for this instance):`, err.message)
    }

    return NextResponse.json({
      agent,
      status: agent.identityHash ? 'registered' : 'registering',
      message: agent.identityHash
        ? `Identity permanently stored on 0G. Hash: ${agent.identityHash}`
        : 'Agent registered. Identity upload to 0G is pending.',
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
