const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  if (!deployer) {
    throw new Error('No deployer signer found. Make sure WALLET_PRIVATE_KEY is set in .env.local before deploying.')
  }
  console.log(`Deploying SkillPaymentEscrow from ${deployer.address}`)

  const factory = await hre.ethers.getContractFactory('SkillPaymentEscrow')
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  console.log(`SkillPaymentEscrow deployed at ${await contract.getAddress()}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
