/**
 * app/api/agent/[agentId]/share/route.ts
 *
 * Cross-Agent Memory Sharing (A2A on 0G)
 *
 * POST /api/agent/[agentId]/share → Share specific memories with another agent
 *   Body: { toAgentId, memoryIds, message?, expiresInHours? }
 *
 * GET  /api/agent/[agentId]/share → List all sharing grants (sent & received)
 *
 * DELETE /api/agent/[agentId]/share → Revoke a specific grant
 *   Body: { grantId }
 *
 * How it works:
 * 1. Agent A selects memories to share with Agent B
 * 2. A "grant" record is created linking A's memory IDs to B
 * 3. Agent B can now query A's shared memories via the grant
 * 4. Grants can expire or be revoked by the original owner
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMemoryById, getAllAgents } from '@/lib/store'
import { ensureHydrated, getAgentOrRestore } from '@/lib/hydration'
import { validateAgentApiKey, validatePlatformSecret } from '@/lib/auth'
import { SharedMemoryGrant } from '@/lib/types'
import { v4 as uuid } from 'uuid'

export const dynamic = 'force-dynamic'

// ── In-memory A2A grant store ──
const grants = new Map<string, SharedMemoryGrant>()

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await ensureHydrated()
    const fromAgentId = params.agentId
    const body = await req.json()
    const { toAgentId, memoryIds, message, expiresInHours } = body

    // Validate sender
    const fromAgent = await getAgentOrRestore(fromAgentId)
    if (!fromAgent) {
      return NextResponse.json({ error: `Sender agent [${fromAgentId}] not found.` }, { status: 404 })
    }

    // Security: API key or platform secret
    if (fromAgent.ownerAddress) {
      const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
      const hasValidApiKey = apiKey && validateAgentApiKey(fromAgentId, apiKey)
      const hasValidPlatformSecret = validatePlatformSecret(req)
      if (!hasValidApiKey && !hasValidPlatformSecret) {
        return NextResponse.json({ error: 'Unauthorized — Agent API Key required.' }, { status: 401 })
      }
    }

    // Validate recipient
    if (!toAgentId) {
      return NextResponse.json({ error: 'toAgentId is required.' }, { status: 400 })
    }
    if (toAgentId === fromAgentId) {
      return NextResponse.json({ error: 'Cannot share memories with yourself.' }, { status: 400 })
    }
    const toAgent = await getAgentOrRestore(toAgentId)
    if (!toAgent) {
      return NextResponse.json({ error: `Recipient agent [${toAgentId}] not found.` }, { status: 404 })
    }

    // Validate memory IDs
    if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
      return NextResponse.json({ error: 'memoryIds array is required.' }, { status: 400 })
    }

    // Verify all memories belong to the sender and collect storage hashes
    const validMemories: string[] = []
    const storageHashes: string[] = []
    for (const memId of memoryIds) {
      const mem = getMemoryById(memId)
      if (mem && mem.agentId === fromAgentId) {
        validMemories.push(memId)
        if (mem.storageHash) storageHashes.push(mem.storageHash)
      }
    }

    if (validMemories.length === 0) {
      return NextResponse.json({ error: 'No valid memories found belonging to this agent.' }, { status: 400 })
    }

    // Create the grant
    const grant: SharedMemoryGrant = {
      id: `grant_${uuid().slice(0, 8)}`,
      fromAgentId,
      fromAgentName: fromAgent.name,
      toAgentId,
      toAgentName: toAgent.name,
      memoryIds: validMemories,
      sharedAt: Date.now(),
      expiresAt: expiresInHours ? Date.now() + (expiresInHours * 60 * 60 * 1000) : undefined,
      accessCount: 0,
      revoked: false,
      message: message || undefined,
      storageHashes: storageHashes.length > 0 ? storageHashes : undefined,
    }

    grants.set(grant.id, grant)

    console.log(`🤝 A2A Share: ${fromAgent.name} → ${toAgent.name} | ${validMemories.length} memories | Grant: ${grant.id}`)

    return NextResponse.json({
      grant,
      message: `Shared ${validMemories.length} memories with ${toAgent.name}. Grant ID: ${grant.id}`,
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await ensureHydrated()
    const agentId = params.agentId
    const agent = await getAgentOrRestore(agentId)

    if (!agent) {
      return NextResponse.json({ error: `Agent [${agentId}] not found.` }, { status: 404 })
    }

    const now = Date.now()

    // Grants sent BY this agent
    const sentGrants = Array.from(grants.values())
      .filter(g => g.fromAgentId === agentId && !g.revoked)
      .filter(g => !g.expiresAt || g.expiresAt > now)

    // Grants received BY this agent
    const receivedGrants = Array.from(grants.values())
      .filter(g => g.toAgentId === agentId && !g.revoked)
      .filter(g => !g.expiresAt || g.expiresAt > now)

    // For received grants, resolve the actual memory contents
    const receivedWithContent = receivedGrants.map(g => {
      g.accessCount++
      const memories = g.memoryIds
        .map(id => getMemoryById(id))
        .filter(Boolean)
        .map(m => ({
          id: m!.id,
          type: m!.type,
          content: m!.content,
          tags: m!.tags,
          importance: m!.importance,
          createdAt: m!.createdAt,
          storageHash: m!.storageHash,
        }))

      return {
        ...g,
        sharedMemories: memories,
      }
    })

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      sent: {
        grants: sentGrants,
        totalShared: sentGrants.reduce((sum, g) => sum + g.memoryIds.length, 0),
      },
      received: {
        grants: receivedWithContent,
        totalReceived: receivedWithContent.reduce((sum, g) => sum + g.memoryIds.length, 0),
      },
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await ensureHydrated()
    const agentId = params.agentId
    const body = await req.json()
    const { grantId } = body

    if (!grantId) {
      return NextResponse.json({ error: 'grantId is required.' }, { status: 400 })
    }

    const grant = grants.get(grantId)
    if (!grant) {
      return NextResponse.json({ error: `Grant [${grantId}] not found.` }, { status: 404 })
    }

    // Only the sender can revoke
    if (grant.fromAgentId !== agentId) {
      return NextResponse.json({ error: 'Only the sharing agent can revoke a grant.' }, { status: 403 })
    }

    grant.revoked = true
    console.log(`❌ A2A Revoke: Grant ${grantId} revoked by ${agentId}`)

    return NextResponse.json({
      success: true,
      message: `Grant ${grantId} has been revoked. ${grant.toAgentName} can no longer access the shared memories.`,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
