/**
 * app/api/kv/route.ts
 *
 * 0G KV Store API — Read/write mutable key-value data on 0G Storage.
 *
 * GET  /api/kv?key=agent_123/manifest         → Read a key
 * POST /api/kv  { key, value }                → Write a key
 * POST /api/kv  { batch: [{key, value}, ...] } → Batch write
 */

import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvPut, kvBatchPut, kvHealthCheck, isKvConfigured, getKvStreamId } from '@/lib/0g-kv-store'
import { validatePlatformSecret } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const action = searchParams.get('action')

  // Health check
  if (action === 'health') {
    const health = await kvHealthCheck()
    return NextResponse.json({
      ...health,
      configured: isKvConfigured(),
      streamId: getKvStreamId(),
    })
  }

  // Status
  if (action === 'status') {
    return NextResponse.json({
      configured: isKvConfigured(),
      streamId: getKvStreamId(),
      layer: 'KV (mutable)',
      description: '0G Storage KV Layer — mutable key-value store for agent manifests and indexes',
    })
  }

  if (!key) {
    return NextResponse.json({ error: 'key parameter is required' }, { status: 400 })
  }

  try {
    const value = await kvGet(key)
    if (value === null) {
      return NextResponse.json({ key, value: null, found: false })
    }
    return NextResponse.json({ key, value, found: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Batch write
    if (body.batch && Array.isArray(body.batch)) {
      if (body.batch.length === 0) {
        return NextResponse.json({ error: 'batch array is empty' }, { status: 400 })
      }
      if (body.batch.length > 50) {
        return NextResponse.json({ error: 'batch size exceeds maximum of 50' }, { status: 400 })
      }

      const result = await kvBatchPut(body.batch)
      return NextResponse.json({
        success: true,
        entriesWritten: body.batch.length,
        ...result,
      }, { status: 201 })
    }

    // Single write
    const { key, value } = body
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
    }

    const result = await kvPut(key, value)
    return NextResponse.json({
      success: true,
      key,
      ...result,
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
