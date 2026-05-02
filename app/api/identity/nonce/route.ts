import { NextRequest, NextResponse } from 'next/server'
import { getNextNonce } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get('address')
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }
  
  const nonce = getNextNonce(address)
  return NextResponse.json({ nonce })
}
