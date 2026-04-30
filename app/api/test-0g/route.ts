/**
 * app/api/test-0g/route.ts
 * Quick connectivity test — visit /api/test-0g to confirm 0G is working
 */
import { NextResponse } from 'next/server'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    const hash = await uploadToStorage({
      test: true,
      message: 'MemoryOS 0G Storage test',
      timestamp: new Date().toISOString(),
      project: 'MemoryOS — 0G APAC Hackathon 2026',
    })
    return NextResponse.json({
      success: true,
      hash,
      explorerUrl: getExplorerUrl(hash),
      uploadTimeMs: Date.now() - start,
      message: '✓ 0G Storage is working! Check explorerUrl to see your data on-chain.',
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      tip: 'Check .env.local — WALLET_PRIVATE_KEY, NEXT_PUBLIC_0G_RPC, NEXT_PUBLIC_0G_INDEXER',
    }, { status: 500 })
  }
}
