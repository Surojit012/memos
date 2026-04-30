import { NextRequest, NextResponse } from 'next/server'
import {
  initiateIntelligentTransfer,
  completeIntelligentTransfer,
  cancelIntelligentTransfer,
  getPendingTransfer,
  rotateEncryptedKey,
} from '@/lib/inft'

/**
 * POST /api/inft/transfer
 * ERC-7857 Intelligent Transfer operations.
 *
 * Actions:
 *   - initiate:  Start a transfer (locks token, requires re-encryption)
 *   - complete:  Complete transfer with re-encrypted key
 *   - cancel:    Cancel a pending transfer
 *   - rotate:    Rotate encryption key (owner only)
 *
 * GET /api/inft/transfer?tokenId=1
 * Get pending transfer status for a token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, tokenId } = body

    if (!action || tokenId === undefined) {
      return NextResponse.json(
        { error: 'action and tokenId are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'initiate': {
        const { toAddress } = body
        if (!toAddress) {
          return NextResponse.json({ error: 'toAddress is required' }, { status: 400 })
        }

        console.log(`🔄 Initiating intelligent transfer: Token #${tokenId} → ${toAddress}`)
        const result = await initiateIntelligentTransfer(tokenId, toAddress)

        return NextResponse.json({
          success: true,
          action: 'initiated',
          tokenId,
          toAddress,
          txHash: result.txHash,
          message: 'Transfer initiated. New owner must call completeTransfer with re-encrypted key within 24 hours.',
        })
      }

      case 'complete': {
        const { newEncryptedKey, newOwnerPublicKey } = body
        if (!newEncryptedKey || !newOwnerPublicKey) {
          return NextResponse.json(
            { error: 'newEncryptedKey and newOwnerPublicKey are required' },
            { status: 400 }
          )
        }

        console.log(`✅ Completing intelligent transfer: Token #${tokenId}`)
        const result = await completeIntelligentTransfer(tokenId, newEncryptedKey, newOwnerPublicKey)

        return NextResponse.json({
          success: true,
          action: 'completed',
          tokenId,
          txHash: result.txHash,
          message: 'Transfer complete. Token ownership and encrypted key have been updated.',
        })
      }

      case 'cancel': {
        console.log(`❌ Cancelling intelligent transfer: Token #${tokenId}`)
        const result = await cancelIntelligentTransfer(tokenId)

        return NextResponse.json({
          success: true,
          action: 'cancelled',
          tokenId,
          txHash: result.txHash,
        })
      }

      case 'rotate': {
        const { newEncryptedKey, newPublicKey } = body
        if (!newEncryptedKey || !newPublicKey) {
          return NextResponse.json(
            { error: 'newEncryptedKey and newPublicKey are required' },
            { status: 400 }
          )
        }

        console.log(`🔑 Rotating key for Token #${tokenId}`)
        const result = await rotateEncryptedKey(tokenId, newEncryptedKey, newPublicKey)

        return NextResponse.json({
          success: true,
          action: 'key_rotated',
          tokenId,
          txHash: result.txHash,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: initiate, complete, cancel, rotate` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('INFT transfer error:', error)
    return NextResponse.json(
      { error: error.message || 'Transfer operation failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tokenIdStr = searchParams.get('tokenId')

  if (!tokenIdStr) {
    return NextResponse.json({ error: 'tokenId is required' }, { status: 400 })
  }

  try {
    const tokenId = parseInt(tokenIdStr, 10)
    const pending = await getPendingTransfer(tokenId)

    return NextResponse.json({
      tokenId,
      pending: pending || null,
      hasPendingTransfer: !!pending,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check transfer status' },
      { status: 500 }
    )
  }
}
