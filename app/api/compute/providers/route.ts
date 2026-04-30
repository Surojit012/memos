import { NextRequest, NextResponse } from 'next/server'
import { listComputeProviders } from '@/lib/0g-compute-inference'

/**
 * GET /api/compute/providers
 * Discover available 0G Compute Network providers.
 * Query params:
 *   - type: 'chatbot' | 'text-to-image' | 'speech-to-text' (optional filter)
 */
export async function GET(req: NextRequest) {
  try {
    const serviceType = req.nextUrl.searchParams.get('type') || undefined
    const providers = await listComputeProviders(serviceType)

    return NextResponse.json({
      providers,
      total: providers.length,
      network: process.env.NEXT_PUBLIC_0G_NETWORK || 'testnet',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to discover 0G Compute providers' },
      { status: 500 }
    )
  }
}
