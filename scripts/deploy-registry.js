const hre = require("hardhat");

async function main() {
  console.log("Deploying MemoryOSRegistry to 0G Galileo...");

  const Registry = await hre.ethers.getContractFactory("MemoryOSRegistry");
  const registry = await Registry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`\n✅ MemoryOSRegistry deployed to: ${address}`);
  console.log(`\nPlease add this to your .env.local file:`);
  console.log(`MEMORYOS_REGISTRY_CONTRACT=${address}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
