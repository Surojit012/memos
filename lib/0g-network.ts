/**
 * lib/0g-network.ts
 *
 * Centralized 0G network configuration.
 * All chain IDs, RPC endpoints, contract addresses, and explorer URLs
 * come from this single file. Switch between testnet and mainnet here.
 *
 * Galileo Testnet reference: https://docs.0g.ai/developer-hub/testnet/testnet-overview
 */

const TESTNET_CHAIN_ID = 16602
const MAINNET_CHAIN_ID = 16661

type NetworkKey = 'testnet' | 'mainnet'

export interface Public0GNetworkConfig {
  key: NetworkKey
  label: string
  chainId: number
  rpcUrl: string
  indexerUrl: string
  kvNodeUrl: string
  chainExplorerBase: string
  storageExplorerBase: string
  flowContractAddress: string
  paymentContractAddress?: string
}

const DEFAULTS: Record<NetworkKey, Public0GNetworkConfig> = {
  testnet: {
    key: 'testnet',
    label: 'Galileo Testnet',
    chainId: TESTNET_CHAIN_ID,
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
    kvNodeUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
    chainExplorerBase: 'https://chainscan-galileo.0g.ai',
    storageExplorerBase: 'https://storagescan-galileo.0g.ai/address',
    flowContractAddress: '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296',
  },
  mainnet: {
    key: 'mainnet',
    label: '0G Mainnet',
    chainId: MAINNET_CHAIN_ID,
    rpcUrl: 'https://evmrpc.0g.ai',
    indexerUrl: 'https://indexer-storage.0g.ai',
    kvNodeUrl: 'https://indexer-storage.0g.ai',
    chainExplorerBase: 'https://chainscan.0g.ai',
    storageExplorerBase: 'https://storagescan.0g.ai/file',
    flowContractAddress: '', // TBD for mainnet
  },
}

function pickNetworkKeyFromRpc(rpcUrl?: string): NetworkKey {
  if (!rpcUrl) return 'testnet'
  return rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
}

function normalizeChainId(rawValue: string | undefined, networkKey: NetworkKey): number {
  const parsed = Number(rawValue)
  if (Number.isFinite(parsed) && [TESTNET_CHAIN_ID, MAINNET_CHAIN_ID].includes(parsed)) {
    return parsed
  }
  return DEFAULTS[networkKey].chainId
}

export function getPublic0GNetworkConfig(): Public0GNetworkConfig {
  const rpcUrl = process.env.NEXT_PUBLIC_0G_RPC
  const envNetwork = (process.env.NEXT_PUBLIC_0G_NETWORK || '').toLowerCase()
  const networkKey: NetworkKey =
    envNetwork === 'mainnet'
      ? 'mainnet'
      : envNetwork === 'testnet'
        ? 'testnet'
        : pickNetworkKeyFromRpc(rpcUrl)

  const defaults = DEFAULTS[networkKey]

  return {
    ...defaults,
    chainId: normalizeChainId(process.env.NEXT_PUBLIC_CHAIN_ID, networkKey),
    rpcUrl: rpcUrl || defaults.rpcUrl,
    indexerUrl: process.env.NEXT_PUBLIC_0G_INDEXER || defaults.indexerUrl,
    kvNodeUrl: process.env.ZG_KV_NODE_URL || defaults.kvNodeUrl,
    paymentContractAddress:
      process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS || process.env.PAYMENT_CONTRACT_ADDRESS,
  }
}

export function get0GNetworkConfig() {
  const publicConfig = getPublic0GNetworkConfig()
  return {
    ...publicConfig,
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
    platformWalletAddress: process.env.PLATFORM_WALLET_ADDRESS,
  }
}

export function getStorageExplorerUrl(hash: string) {
  return `${getPublic0GNetworkConfig().storageExplorerBase}/${hash}`
}

export function getChainTxExplorerUrl(txHash: string) {
  return `${getPublic0GNetworkConfig().chainExplorerBase}/tx/${txHash}`
}

export function getChainAddressExplorerUrl(address: string) {
  return `${getPublic0GNetworkConfig().chainExplorerBase}/address/${address}`
}
