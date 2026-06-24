import { NextRequest, NextResponse } from 'next/server'
import { deleteMemory, getMemoryById, removeMemoryFromStore } from '@/lib/store'
import { removeMemoryManifestRecord } from '@/lib/0g-manifest'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKeyAsync, validatePlatformSecret, ensureAgentInStore } from '@/lib/auth'
import { waitUntil } from '@vercel/functions'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureHydrated()
  const memory = getMemoryById(params.id)
  if (!memory) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ memory })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureHydrated()

  const agentId = new URL(req.url).searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  await ensureAgentInStore(agentId)

  // ── Security: accept EITHER a valid agent API key OR the platform secret ──
  const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
  const hasValidApiKey = apiKey && await validateAgentApiKeyAsync(agentId, apiKey)
  const hasValidPlatformSecret = validatePlatformSecret(req)
  if (!hasValidApiKey && !hasValidPlatformSecret) {
    return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
  }

  const deleted = deleteMemory(params.id, agentId)
  if (!deleted) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  removeMemoryFromStore(params.id)
  // Persist the deletion durably — without this, the removed memory reappears
  // after a restart when the agent is restored from its last 0G manifest.
  const persist = removeMemoryManifestRecord(agentId, params.id)
  try { waitUntil(persist) } catch { /* local dev — promise still runs */ }
  return NextResponse.json({ success: true })
}
