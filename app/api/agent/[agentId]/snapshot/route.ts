import { NextRequest, NextResponse } from 'next/server'
import { getAgent, getMemories, updateAgentHash } from '@/lib/store'
import { enqueueWrite } from '@/lib/write-queue'
import { uploadToStorage } from '@/lib/0g-storage'

// Endpoint to create a snapshot or list snapshots for an agent
// POST /api/agent/[agentId]/snapshot = Create
// GET /api/agent/[agentId]/snapshot = List

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentId = params.agentId
    const agent = getAgent(agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get all agent memories locally
    const memories = getMemories(agentId, undefined, 100000)

    const snapshotPayload = {
      type: 'agent_snapshot',
      agentId: agent.agentId,
      timestamp: Date.now(),
      metrics: {
        memoryCount: agent.memoryCount,
        totalReads: agent.totalReads,
      },
      memories: memories // The complete snapshot of memories at this point in time
    }

    // Since snapshots are explicitly user-triggered for "full brain backups",
    // we upload synchronously to return the exact hash immediately, rather than queueing.
    const rootHash = await uploadToStorage(snapshotPayload)

    // Append to agent identity
    if (!agent.snapshots) {
      agent.snapshots = []
    }
    agent.snapshots.push(rootHash)

    // Re-queue the agent update so the updated agent manifest gets pushed to zero g 
    enqueueWrite(agent.agentId, 'agent', agent)

    return NextResponse.json({
      success: true,
      snapshotHash: rootHash,
      totalMemoriesSnapshotted: memories.length,
      timestamp: snapshotPayload.timestamp
    })

  } catch (err: any) {
    console.error('Snapshot error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentId = params.agentId
    const agent = getAgent(agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({
      snapshots: agent.snapshots || []
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
