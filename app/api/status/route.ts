/**
 * app/api/status/route.ts
 *
 * Returns platform 0G connectivity, manifest status, cache stats,
 * and write queue status — used by UI header badge and diagnostics.
 */
import { NextResponse } from 'next/server'
import { is0GConfigured } from '@/lib/0g-storage'
import { getPublic0GNetworkConfig } from '@/lib/0g-network'
import { getPlatformStats } from '@/lib/store'
import { getHydrationStatus, ensureHydrated } from '@/lib/hydration'
import { getManifestStats } from '@/lib/0g-manifest'
import { getWriteQueueStats } from '@/lib/write-queue'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Trigger hydration so stats reflect real 0G state, not defaults
  await ensureHydrated()

  // For testing: force an on-chain sync
  if (new URL(req.url).searchParams.has('flush')) {
    const { flushManifest } = await import('@/lib/0g-manifest')
    await flushManifest()
  }

  const configured = is0GConfigured()
  const stats      = getPlatformStats()
  const network    = getPublic0GNetworkConfig()
  const hydration  = getHydrationStatus()
  const manifest   = getManifestStats()
  const writeQueue = getWriteQueueStats()

  return NextResponse.json({
    configured,
    network: network.label,
    chainId: network.chainId,
    rpc: network.rpcUrl,
    stats,
    explorerBase: network.storageExplorerBase,
    chainExplorerBase: network.chainExplorerBase,
    paymentContractAddress: network.paymentContractAddress,
    hydration,
    manifest,
    writeQueue: {
      pending: writeQueue.pending,
      totalQueued: writeQueue.totalQueued,
      totalFlushed: writeQueue.totalFlushed,
      totalFailed: writeQueue.totalFailed,
    },
  })
}
