/**
 * scripts/deploy-inft.js
 *
 * Deploy the AgentBrainINFT contract to the 0G network.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-inft.js --network galileo
 *
 * After deployment, copy the contract address to:
 *   NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
 */

const hre = require('hardhat')

async function main() {
  console.log('🧠 Deploying AgentBrainINFT (BRAIN) to', hre.network.name, '...')

  const AgentBrainINFT = await hre.ethers.getContractFactory('AgentBrainINFT')
  const contract = await AgentBrainINFT.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log('')
  console.log('✅ AgentBrainINFT deployed to:', address)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Add to .env.local:')
  console.log(`     NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${address}`)
  console.log('')
  console.log('  2. Verify on explorer:')
  console.log(`     https://chainscan-galileo.0g.ai/address/${address}`)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
