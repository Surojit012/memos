/**
 * app/api/identity/route.ts
 *
 * Agent identity registration + lookup via On-Chain Registry.
 *
 * PERSISTENCE STRATEGY:
 * ┌──────────────────────────────────────────────────────┐
 * │  Layer 1: On-Chain Registry (Galileo Testnet)       │
 * │  ~10s writes, free fast reads. Fully decentralized. │
 * │  This is the SOURCE OF TRUTH for agent lookups.      │
 * ├──────────────────────────────────────────────────────┤
 * │  Layer 2: 0G Storage — PERMANENT PROOF              │
 * │  15-45s writes. Used for the actual identity JSON.  │
 * │  Runs in background, updates contract later.        │
 * └──────────────────────────────────────────────────────┘
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAgent, getAllAgents, registerOrUpdateAgent, upsertHydratedAgent, updateAgentHash } from '@/lib/store'
import { uploadToStorage } from '@/lib/0g-storage'
import { ensureHydrated } from '@/lib/hydration'
import { verifyWalletSignatureWithNonce } from '@/lib/auth'
import { generateHmacApiKey } from '@/lib/auth'
import { registerAgentOnChain, updateAgentHashOnChain, getAgentsFromRegistry, getAgentFromRegistry } from '@/lib/registry'

import { waitUntil } from '@vercel/functions'

export const maxDuration = 60;

// GET /api/identity?agentId=xxx → get one agent
// GET /api/identity?ownerAddress=xxx → get all agents for a wallet
export async function GET(req: NextRequest) {
  await ensureHydrated()
  const agentId = new URL(req.url).searchParams.get('agentId')
  const ownerAddress = new URL(req.url).searchParams.get('ownerAddress')
  
  if (agentId) {
    let agent = getAgent(agentId)
    // If not in RAM, query registry
    if (!agent) {
      const regAgent = await getAgentFromRegistry(agentId)
      if (regAgent) {
        upsertHydratedAgent(regAgent)
        agent = regAgent
        console.log(`⚡ Restored Agent [${agentId}] from on-chain registry into RAM`)
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

  // Double check on-chain if RAM is empty
  if (allAgents.length === 0 && ownerAddress) {
    const registryAgents = await getAgentsFromRegistry(ownerAddress)
    if (registryAgents.length > 0) {
      console.log(`⚡ Restored ${registryAgents.length} agents from on-chain registry for wallet ${ownerAddress.slice(0, 10)}...`)
      registryAgents.forEach(a => upsertHydratedAgent(a))
      allAgents = registryAgents
    }
  }

  allAgents.forEach(agent => {
    if (agent.ownerAddress && !agent.apiKey) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }
  })
  return NextResponse.json({ agents: allAgents })
}

// POST /api/identity → register a new agent identity
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

    const agent = registerOrUpdateAgent(agentId.trim(), name?.trim() || agentId, ownerAddress.trim().toLowerCase())

    if (agent.ownerAddress && (!agent.apiKey?.startsWith('mos_') || agent.apiKey?.length !== 36)) {
      agent.apiKey = generateHmacApiKey(agent.agentId, agent.ownerAddress)
    }

    // Step 1: Register On-Chain immediately (~10s)
    try {
      await registerAgentOnChain(agent)
      console.log(`✓ Agent [${agentId}] registered on-chain successfully.`)
    } catch (err: any) {
      if (err.message.includes('already registered')) {
        console.log(`ℹ Agent [${agentId}] already on-chain.`)
      } else {
        throw new Error(`Failed to register agent on-chain: ${err.message}`)
      }
    }

    // Step 2: Upload identity to 0G Storage in background
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
        
        // Update the contract with the hash
        await updateAgentHashOnChain(agentId, hash)
        
        const hydratedAgent = { ...agent, identityHash: hash }
        upsertHydratedAgent(hydratedAgent)
        console.log(`✓ Agent [${agentId}] identity 0G hash saved on-chain: ${hash}`)
      } catch (err: any) {
        console.error(`✗ 0G identity upload failed [${agentId}]:`, err.message)
      }
    }

    // Use waitUntil so Vercel doesn't kill the lambda before 0G finishes uploading
    waitUntil(backgroundUpload().catch((err) => console.error(err)))

    return NextResponse.json({
      agent,
      status: 'registered',
      message: 'Agent registered permanently on-chain. 0G identity proof is being generated.',
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
