/**
 * scripts/deploy-manifest.js
 *
 * Deploys the ManifestAnchor smart contract to 0G Galileo Testnet.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-manifest.js --network galileo
 *
 * After deployment:
 *   1. Copy the contract address from the console output
 *   2. Add it to .env.local as MANIFEST_ANCHOR_CONTRACT=0x...
 *   3. The platform will use this for trustless bootstrap
 */

const { ethers } = require('hardhat')

async function main() {
  console.log('\n🚀 Deploying ManifestAnchor to 0G Galileo Testnet...\n')

  const [deployer] = await ethers.getSigners()
  console.log('   Deployer:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('   Balance:', ethers.formatEther(balance), '0G\n')

  const ManifestAnchor = await ethers.getContractFactory('ManifestAnchor')
  const anchor = await ManifestAnchor.deploy()
  await anchor.waitForDeployment()

  const address = await anchor.getAddress()
  console.log('✅ ManifestAnchor deployed!')
  console.log('   Address:', address)
  console.log('\n📋 Next steps:')
  console.log(`   1. Add to .env.local: MANIFEST_ANCHOR_CONTRACT=${address}`)
  console.log('   2. After seeding, the manifest hash will auto-update on-chain')
  console.log('   3. Any Memos node can bootstrap from this contract\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  })
