import { NextRequest, NextResponse } from 'next/server'
import { mintBrainNFT, getAgentBrainNFTs } from '@/lib/inft'
import { ensureHydrated } from '@/lib/hydration'

/**
 * POST /api/agent/[agentId]/mint-inft
 * Mint a brain snapshot as an Intelligent NFT (ERC-7857).
 *
 * Body:
 *   - brainHash: string (required) — 0G Storage root hash of the snapshot
 *   - memoriesCount: number (required)
 *   - snapshotVersion: number (required)
 *   - encryptedKey: string (optional) — Hex-encoded AES key encrypted with owner's pubkey
 *   - ownerPublicKey: string (optional) — Hex-encoded owner public key
 *
 * GET /api/agent/[agentId]/mint-inft
 * List all brain NFTs for the agent.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    await ensureHydrated()
    const { agentId } = await params
    const { brainHash, memoriesCount, snapshotVersion, encryptedKey, ownerPublicKey } = await req.json()

    if (!brainHash) {
      return NextResponse.json({ error: 'brainHash is required' }, { status: 400 })
    }
    if (!memoriesCount || !snapshotVersion) {
      return NextResponse.json({ error: 'memoriesCount and snapshotVersion are required' }, { status: 400 })
    }

    const isEncrypted = !!(encryptedKey && ownerPublicKey)
    console.log(`🧠 Minting Brain INFT for agent ${agentId} → hash: ${brainHash} ${isEncrypted ? '(encrypted)' : '(simple)'}`)

    const result = await mintBrainNFT({
      agentId,
      brainHash,
      memoriesCount,
      snapshotVersion,
      encryptedKey,
      ownerPublicKey,
    })

    console.log(`✅ Brain INFT minted: Token #${result.tokenId} → tx: ${result.txHash}`)

    return NextResponse.json({
      success: true,
      tokenId: result.tokenId,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      agentId,
      brainHash,
      encrypted: isEncrypted,
    })
  } catch (error: any) {
    console.error('INFT minting error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mint Brain INFT' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const nfts = await getAgentBrainNFTs(agentId)

    return NextResponse.json({
      agentId,
      nfts,
      total: nfts.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Brain NFTs' },
      { status: 500 }
    )
  }
}
