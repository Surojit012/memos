const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  if (!deployer) {
    throw new Error('No deployer signer found. Make sure WALLET_PRIVATE_KEY is set in .env.local before deploying.')
  }
  console.log(`Deploying ManifestAnchor from ${deployer.address}`)

  const factory = await hre.ethers.getContractFactory('ManifestAnchor')
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  console.log(`ManifestAnchor deployed at ${await contract.getAddress()}`)
  console.log(`\nNext steps:`)
  console.log(`1. Add to .env.local: MANIFEST_ANCHOR_CONTRACT=${await contract.getAddress()}`)
  console.log(`2. The platform will automatically sync its manifest hash to this contract upon the next upload.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
