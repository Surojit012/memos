import { ethers } from 'ethers'
import { get0GNetworkConfig } from './0g-network'
import { AgentIdentity } from './types'

const REGISTRY_ABI = [
  "function registerAgent(string calldata agentId, string calldata name) external",
  "function updateAgentHash(string calldata agentId, string calldata storageHash) external",
  "function getAgentsByOwner(address owner) external view returns (tuple(string agentId, string name, string storageHash, address owner, uint256 createdAt, uint256 updatedAt, bool exists)[])"
]

function getRegistryContract() {
  const address = process.env.MEMORYOS_REGISTRY_CONTRACT
  if (!address) throw new Error("MEMORYOS_REGISTRY_CONTRACT env var is not set")
  
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) throw new Error("WALLET_PRIVATE_KEY is missing")

  const network = get0GNetworkConfig()
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const wallet = new ethers.Wallet(privateKey, provider)
  
  return new ethers.Contract(address, REGISTRY_ABI, wallet)
}

/**
 * Registers a new agent directly on-chain. (~10s)
 */
export async function registerAgentOnChain(agent: AgentIdentity): Promise<void> {
  const contract = getRegistryContract()
  const tx = await contract.registerAgent(agent.agentId, agent.name || agent.agentId)
  await tx.wait(1)
}

/**
 * Updates an agent's 0G storage identity hash on-chain.
 */
export async function updateAgentHashOnChain(agentId: string, storageHash: string): Promise<void> {
  const contract = getRegistryContract()
  const tx = await contract.updateAgentHash(agentId, storageHash)
  await tx.wait(1)
}

/**
 * Fetches all agents for a given owner from the on-chain registry. (Free view call)
 */
export async function getAgentsFromRegistry(ownerAddress: string): Promise<AgentIdentity[]> {
  const contract = getRegistryContract()
  
  try {
    const rawAgents = await contract.getAgentsByOwner(ownerAddress)
    
    return rawAgents.map((a: any) => ({
      agentId: a.agentId,
      name: a.name,
      ownerAddress: a.owner.toLowerCase(),
      createdAt: Number(a.createdAt) * 1000,
      identityHash: a.storageHash !== "" ? a.storageHash : undefined,
      memoryCount: 0,
      systemPrompt: '',
      skills: [],
    }))
  } catch (error) {
    console.error("Failed to fetch agents from registry:", error)
    return []
  }
}

/**
 * Fetches a single agent from the on-chain registry. (Free view call)
 */
export async function getAgentFromRegistry(agentId: string): Promise<AgentIdentity | null> {
  const contract = getRegistryContract()
  
  try {
    const a = await contract.getAgent(agentId)
    if (!a.exists) return null

    return {
      agentId: a.agentId,
      name: a.name,
      ownerAddress: a.owner.toLowerCase(),
      createdAt: Number(a.createdAt) * 1000,
      identityHash: a.storageHash !== "" ? a.storageHash : undefined,
      memoryCount: 0,
      systemPrompt: '',
      skills: [],
    }
  } catch (error) {
    console.error(`Failed to fetch agent [${agentId}] from registry:`, error)
    return null
  }
}
