const { ethers } = require('hardhat');
async function main() {
  const contractAddress = "0x27D3a8fbBa495b1F1571Ff4cd94029397947279F";
  const ManifestAnchor = await ethers.getContractFactory('ManifestAnchor');
  const anchor = ManifestAnchor.attach(contractAddress);
  const [hash, ver, updated] = await anchor.getManifestInfo();
  console.log("On-Chain Hash:", hash);
  console.log("On-Chain Version:", ver.toString());
}
main().catch(console.error);
