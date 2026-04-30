/**
 * lib/inft.ts
 *
 * Intelligent NFT (ERC-7857) helpers for minting, transferring, and reading
 * Agent Brain NFTs on the 0G network.
 *
 * V2 — Full ERC-7857 support:
 * - Encrypted metadata (AES key encrypted with owner's public key)
 * - Intelligent transfer (iTransferFrom + completeTransfer)
 * - Key rotation (updateEncryptedKey)
 * - Clone with encryption
 */

import { ethers } from 'ethers'
import { get0GNetworkConfig, getPublic0GNetworkConfig, getChainTxExplorerUrl } from './0g-network'

// Full ABI for AgentBrainINFT V2 (ERC-7857)
export const AGENT_BRAIN_INFT_ABI = [
  // ── Mint ──
  'function mintBrain(string agentId, string brainHash, uint256 memoriesCount, uint256 snapshotVersion, bytes encryptedKey, bytes ownerPublicKey, string tokenURI_) external payable returns (uint256)',
  'function mintBrainSimple(string agentId, string brainHash, uint256 memoriesCount, uint256 snapshotVersion, string tokenURI_) external payable returns (uint256)',

  // ── ERC-7857: Intelligent Transfer ──
  'function iTransferFrom(address to, uint256 tokenId) external',
  'function completeTransfer(uint256 tokenId, bytes newEncryptedKey, bytes newOwnerPublicKey) external',
  'function cancelTransfer(uint256 tokenId) external',

  // ── Key Management ──
  'function updateEncryptedKey(uint256 tokenId, bytes newEncryptedKey, bytes newPublicKey) external',

  // ── Clone ──
  'function cloneBrain(uint256 originalTokenId, bytes cloneEncryptedKey, bytes clonePublicKey) external payable returns (uint256)',
  'function cloneBrainSimple(uint256 originalTokenId) external payable returns (uint256)',

  // ── View ──
  'function getBrain(uint256 tokenId) external view returns (tuple(string agentId, string brainHash, uint256 memoriesCount, uint256 snapshotVersion, uint256 mintedAt, address originalMinter, bytes encryptedKey, bytes ownerPublicKey))',
  'function getEncryptedKey(uint256 tokenId) external view returns (bytes)',
  'function getAgentBrains(string agentId) external view returns (uint256[])',
  'function getPendingTransfer(uint256 tokenId) external view returns (tuple(address from, address to, uint256 initiatedAt, bool active))',
  'function isTransferPending(uint256 tokenId) external view returns (bool)',
  'function totalSupply() external view returns (uint256)',
  'function mintFee() external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',

  // ── Events ──
  'event BrainMinted(uint256 indexed tokenId, address indexed minter, string agentId, string brainHash, uint256 memoriesCount, uint256 snapshotVersion)',
  'event BrainCloned(uint256 indexed originalTokenId, uint256 indexed cloneTokenId, address indexed cloner)',
  'event IntelligentTransferInitiated(uint256 indexed tokenId, address indexed from, address indexed to, uint256 initiatedAt)',
  'event ReEncryptionCompleted(uint256 indexed tokenId, address indexed newOwner)',
  'event IntelligentTransferCompleted(uint256 indexed tokenId, address indexed from, address indexed to)',
  'event IntelligentTransferCancelled(uint256 indexed tokenId)',
  'event EncryptedKeyUpdated(uint256 indexed tokenId, address indexed updater)',
]

function getContractAddress(): string {
  const addr = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS
  if (!addr) {
    throw new Error(
      'NEXT_PUBLIC_INFT_CONTRACT_ADDRESS is not set. ' +
      'Deploy the AgentBrainINFT contract first: npx hardhat run scripts/deploy-inft.js --network galileo'
    )
  }
  return addr
}

// ── Server-side (uses WALLET_PRIVATE_KEY) ────────────────────

function getServerContract() {
  const network = get0GNetworkConfig()
  if (!network.walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY required for INFT operations')
  }
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const wallet = new ethers.Wallet(network.walletPrivateKey, provider)
  return new ethers.Contract(getContractAddress(), AGENT_BRAIN_INFT_ABI, wallet)
}

function getReadOnlyContract() {
  const network = getPublic0GNetworkConfig()
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  return new ethers.Contract(getContractAddress(), AGENT_BRAIN_INFT_ABI, provider)
}

// ── Types ────────────────────────────────────────────────────

export interface MintBrainInput {
  agentId: string
  brainHash: string
  memoriesCount: number
  snapshotVersion: number
  tokenURI?: string
  encryptedKey?: string   // Hex-encoded AES key encrypted with owner's pubkey
  ownerPublicKey?: string // Hex-encoded owner public key
}

export interface BrainNFT {
  tokenId: number
  agentId: string
  brainHash: string
  memoriesCount: number
  snapshotVersion: number
  mintedAt: number
  originalMinter: string
  owner: string
  hasEncryptedKey: boolean
  isTransferPending: boolean
}

export interface PendingTransferInfo {
  from: string
  to: string
  initiatedAt: number
  active: boolean
}

// ── Mint ─────────────────────────────────────────────────────

/**
 * Mint a new Agent Brain NFT with optional encryption.
 */
export async function mintBrainNFT(input: MintBrainInput): Promise<{
  tokenId: number
  txHash: string
  explorerUrl: string
}> {
  const contract = getServerContract()
  const network = getPublic0GNetworkConfig()

  const tokenURI = input.tokenURI ||
    `${network.storageExplorerBase}/${input.brainHash}`

  let tx
  if (input.encryptedKey && input.ownerPublicKey) {
    // Full ERC-7857 mint with encryption
    tx = await contract.mintBrain(
      input.agentId,
      input.brainHash,
      input.memoriesCount,
      input.snapshotVersion,
      ethers.getBytes(input.encryptedKey),
      ethers.getBytes(input.ownerPublicKey),
      tokenURI,
    )
  } else {
    // Simplified mint (backward compatible)
    tx = await contract.mintBrainSimple(
      input.agentId,
      input.brainHash,
      input.memoriesCount,
      input.snapshotVersion,
      tokenURI,
    )
  }

  const receipt = await tx.wait()
  const txHash = receipt?.hash || tx.hash

  let tokenId = 0
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data })
      if (parsed?.name === 'BrainMinted') {
        tokenId = Number(parsed.args.tokenId)
        break
      }
    } catch {
      // skip non-matching logs
    }
  }

  return {
    tokenId,
    txHash,
    explorerUrl: getChainTxExplorerUrl(txHash),
  }
}

// ── ERC-7857: Intelligent Transfer ──────────────────────────

/**
 * Initiate an intelligent transfer (Phase 1).
 * The token is locked until the new owner completes re-encryption.
 */
export async function initiateIntelligentTransfer(
  tokenId: number,
  toAddress: string
): Promise<{ txHash: string }> {
  const contract = getServerContract()
  const tx = await contract.iTransferFrom(toAddress, tokenId)
  const receipt = await tx.wait()

  console.log(`🔄 Intelligent transfer initiated: Token #${tokenId} → ${toAddress}`)

  return { txHash: receipt?.hash || tx.hash }
}

/**
 * Complete an intelligent transfer (Phase 2).
 * Called by the new owner with their re-encrypted key.
 */
export async function completeIntelligentTransfer(
  tokenId: number,
  newEncryptedKey: string,
  newOwnerPublicKey: string
): Promise<{ txHash: string }> {
  const contract = getServerContract()
  const tx = await contract.completeTransfer(
    tokenId,
    ethers.getBytes(newEncryptedKey),
    ethers.getBytes(newOwnerPublicKey),
  )
  const receipt = await tx.wait()

  console.log(`✅ Intelligent transfer completed: Token #${tokenId}`)

  return { txHash: receipt?.hash || tx.hash }
}

/**
 * Cancel a pending intelligent transfer.
 */
export async function cancelIntelligentTransfer(
  tokenId: number
): Promise<{ txHash: string }> {
  const contract = getServerContract()
  const tx = await contract.cancelTransfer(tokenId)
  const receipt = await tx.wait()

  return { txHash: receipt?.hash || tx.hash }
}

/**
 * Get pending transfer info for a token.
 */
export async function getPendingTransfer(tokenId: number): Promise<PendingTransferInfo | null> {
  const contract = getReadOnlyContract()
  try {
    const pt = await contract.getPendingTransfer(tokenId)
    if (!pt.active) return null
    return {
      from: pt.from,
      to: pt.to,
      initiatedAt: Number(pt.initiatedAt) * 1000,
      active: pt.active,
    }
  } catch {
    return null
  }
}

// ── Key Management ──────────────────────────────────────────

/**
 * Rotate the encrypted key for a token (owner only).
 */
export async function rotateEncryptedKey(
  tokenId: number,
  newEncryptedKey: string,
  newPublicKey: string
): Promise<{ txHash: string }> {
  const contract = getServerContract()
  const tx = await contract.updateEncryptedKey(
    tokenId,
    ethers.getBytes(newEncryptedKey),
    ethers.getBytes(newPublicKey),
  )
  const receipt = await tx.wait()

  return { txHash: receipt?.hash || tx.hash }
}

// ── Read Operations ─────────────────────────────────────────

/**
 * Get all brain NFTs for a given agent.
 */
export async function getAgentBrainNFTs(agentId: string): Promise<BrainNFT[]> {
  const contract = getReadOnlyContract()

  const tokenIds: bigint[] = await contract.getAgentBrains(agentId)
  const brains: BrainNFT[] = []

  for (const tokenIdBig of tokenIds) {
    const tokenId = Number(tokenIdBig)
    try {
      const [brain, owner, isPending] = await Promise.all([
        contract.getBrain(tokenId),
        contract.ownerOf(tokenId),
        contract.isTransferPending(tokenId),
      ])

      brains.push({
        tokenId,
        agentId: brain.agentId,
        brainHash: brain.brainHash,
        memoriesCount: Number(brain.memoriesCount),
        snapshotVersion: Number(brain.snapshotVersion),
        mintedAt: Number(brain.mintedAt) * 1000,
        originalMinter: brain.originalMinter,
        owner,
        hasEncryptedKey: brain.encryptedKey && brain.encryptedKey.length > 2,
        isTransferPending: isPending,
      })
    } catch {
      // Token may have been burned
    }
  }

  return brains
}

/**
 * Get total supply of brain NFTs.
 */
export async function getBrainNFTTotalSupply(): Promise<number> {
  const contract = getReadOnlyContract()
  return Number(await contract.totalSupply())
}
