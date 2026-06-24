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

// ─────────────────────────────────────────────────────────────────────────────
// HARD TESTNET LOCK
//
// This product (playground + paid-skill payments) runs exclusively on the 0G
// Galileo TESTNET. Users pay with testnet OG tokens only — never real funds.
// While this flag is true, ALL network resolution is forced to testnet:
//   • the network key can't become 'mainnet' (env is ignored),
//   • the chainId is pinned to 16602,
//   • a non-testnet RPC/indexer override is rejected and falls back to testnet.
// To ever enable mainnet, flip this to false (and review every call site first).
// ─────────────────────────────────────────────────────────────────────────────
const FORCE_TESTNET = true

type NetworkKey = 'testnet' | 'mainnet'

/** A testnet endpoint must clearly be a testnet endpoint. */
function isTestnetUrl(url?: string): boolean {
  return !!url && url.toLowerCase().includes('testnet')
}

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
  // While locked, the only acceptable chainId is the testnet one — any other
  // value (including the mainnet id) is ignored.
  if (FORCE_TESTNET) return TESTNET_CHAIN_ID

  const parsed = Number(rawValue)
  if (Number.isFinite(parsed) && [TESTNET_CHAIN_ID, MAINNET_CHAIN_ID].includes(parsed)) {
    return parsed
  }
  return DEFAULTS[networkKey].chainId
}

export function getPublic0GNetworkConfig(): Public0GNetworkConfig {
  const rpcUrl = process.env.NEXT_PUBLIC_0G_RPC
  const envNetwork = (process.env.NEXT_PUBLIC_0G_NETWORK || '').toLowerCase()

  // While locked, the network key is ALWAYS testnet, regardless of env.
  const networkKey: NetworkKey = FORCE_TESTNET
    ? 'testnet'
    : envNetwork === 'mainnet'
      ? 'mainnet'
      : envNetwork === 'testnet'
        ? 'testnet'
        : pickNetworkKeyFromRpc(rpcUrl)

  const defaults = DEFAULTS[networkKey]

  // When locked, refuse any RPC/indexer override that isn't a testnet endpoint —
  // a stray mainnet URL must never leak through. We fall back to the testnet
  // default and warn instead of silently honoring it.
  const safeRpc =
    FORCE_TESTNET && rpcUrl && !isTestnetUrl(rpcUrl)
      ? (console.warn(`[0g-network] Ignoring non-testnet NEXT_PUBLIC_0G_RPC (${rpcUrl}); testnet is locked.`), defaults.rpcUrl)
      : rpcUrl || defaults.rpcUrl

  const indexerEnv = process.env.NEXT_PUBLIC_0G_INDEXER
  const safeIndexer =
    FORCE_TESTNET && indexerEnv && !isTestnetUrl(indexerEnv)
      ? (console.warn(`[0g-network] Ignoring non-testnet NEXT_PUBLIC_0G_INDEXER (${indexerEnv}); testnet is locked.`), defaults.indexerUrl)
      : indexerEnv || defaults.indexerUrl

  return {
    ...defaults,
    chainId: normalizeChainId(process.env.NEXT_PUBLIC_CHAIN_ID, networkKey),
    rpcUrl: safeRpc,
    indexerUrl: safeIndexer,
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
