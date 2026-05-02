import { createZGComputeNetworkBroker, createZGComputeNetworkReadOnlyBroker } from '@0gfoundation/0g-compute-ts-sdk'
import { ethers } from 'ethers'
import { get0GNetworkConfig, getPublic0GNetworkConfig } from './0g-network'

type EmbeddingServiceSelection = {
  providerAddress: string
  model: string
}

let cachedEmbeddingService: EmbeddingServiceSelection | null = null

function isEmbeddingService(service: any) {
  const model = String(service?.model || '').toLowerCase()
  const modelType = String(service?.modelInfo?.type || '').toLowerCase()
  const description = String(service?.modelInfo?.description || '').toLowerCase()

  return (
    model.includes('embed') ||
    modelType.includes('embed') ||
    description.includes('embedding')
  )
}

function toUserFacingComputeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.toLowerCase().includes('insufficient')) {
    return '0G Compute account has insufficient funds. Deposit and transfer inference funds for the configured provider.'
  }
  if (message.toLowerCase().includes('acknowled')) {
    return '0G Compute provider is not acknowledged yet. Acknowledge the provider or set ZG_COMPUTE_EMBED_PROVIDER explicitly.'
  }
  return `0G Compute embedding request failed: ${message}`
}

async function resolveEmbeddingService(): Promise<EmbeddingServiceSelection> {
  if (cachedEmbeddingService) return cachedEmbeddingService

  if (process.env.ZG_COMPUTE_EMBED_PROVIDER) {
    cachedEmbeddingService = {
      providerAddress: process.env.ZG_COMPUTE_EMBED_PROVIDER,
      model: process.env.ZG_COMPUTE_EMBED_MODEL || '',
    }
    return cachedEmbeddingService
  }

  const network = getPublic0GNetworkConfig()
  const broker = await createZGComputeNetworkReadOnlyBroker(network.rpcUrl, network.chainId)
  const services = await broker.inference.listServiceWithDetail(0, 50, true)
  const candidate = services.find(isEmbeddingService)

  if (!candidate) {
    throw new Error(
      'No embedding-capable 0G Compute service was discovered automatically. Set ZG_COMPUTE_EMBED_PROVIDER and ZG_COMPUTE_EMBED_MODEL.'
    )
  }

  cachedEmbeddingService = {
    providerAddress: candidate.provider,
    model: process.env.ZG_COMPUTE_EMBED_MODEL || candidate.model,
  }

  return cachedEmbeddingService
}

async function getAuthenticatedBroker() {
  const network = get0GNetworkConfig()
  if (!network.walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is missing. Add it to .env.local to use 0G Compute.')
  }

  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const wallet = new ethers.Wallet(network.walletPrivateKey, provider)
  return createZGComputeNetworkBroker(wallet)
}

export async function embedTextWith0GCompute(text: string) {
  const broker = await getAuthenticatedBroker()
  const { providerAddress, model } = await resolveEmbeddingService()

  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress)
  } catch {
    // The provider may already be acknowledged; header generation below is the real gate.
  }

  try {
    const { endpoint, model: discoveredModel } = await broker.inference.getServiceMetadata(providerAddress)
    const activeModel = model || discoveredModel
    const requestBody = {
      model: activeModel,
      input: text,
    }
    const headers = await broker.inference.getRequestHeaders(
      providerAddress,
      JSON.stringify(requestBody)
    )

    const response = await fetch(`${endpoint}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `HTTP ${response.status}`)
    }

    const embedding = data.data?.[0]?.embedding
    if (!Array.isArray(embedding)) {
      throw new Error('0G Compute response did not include an embedding vector')
    }

    return {
      embedding: embedding as number[],
      model: activeModel,
      providerAddress,
    }
  } catch (error) {
    throw new Error(toUserFacingComputeError(error))
  }
}
