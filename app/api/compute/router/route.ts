import { NextRequest, NextResponse } from 'next/server'
import { getRouterBalance, getRouterUsageStats, listRouterModels } from '@/lib/0g-compute-router'

/**
 * GET /api/compute/router
 * Get 0G Router account info: balance, usage, and available models.
 * Query params:
 *   - action: 'balance' | 'usage' | 'models' (default: 'balance')
 */
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'balance'

  try {
    switch (action) {
      case 'balance': {
        const balance = await getRouterBalance()
        return NextResponse.json(balance)
      }
      case 'usage': {
        const usage = await getRouterUsageStats()
        return NextResponse.json(usage)
      }
      case 'models': {
        const models = await listRouterModels()
        return NextResponse.json({ models, total: models.length })
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to query 0G Router' },
      { status: 500 }
    )
  }
}
