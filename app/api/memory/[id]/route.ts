import { NextRequest, NextResponse } from 'next/server'
import { deleteMemory, getMemoryById, removeMemoryFromStore } from '@/lib/store'
import { removeMemoryManifestRecord } from '@/lib/0g-manifest'
import { ensureHydrated } from '@/lib/hydration'
import { validatePlatformSecret } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureHydrated()
  const memory = getMemoryById(params.id)
  if (!memory) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ memory })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureHydrated()

  // ── Security: Platform secret check on destructive operations ──
  if (!validatePlatformSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized — Platform secret missing or invalid.' }, { status: 401 })
  }

  const agentId = new URL(req.url).searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  const deleted = deleteMemory(params.id, agentId)
  if (!deleted) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  removeMemoryFromStore(params.id)
  removeMemoryManifestRecord(agentId, params.id)
  return NextResponse.json({ success: true })
}
