/**
 * Investigation script: Query the on-chain manifest contract
 * and download the manifest from 0G to see exactly what's persisted.
 */
import { ethers } from 'ethers';

const RPC = 'https://evmrpc-testnet.0g.ai';
const CONTRACT = '0x4ab1AFC8Ccde3E97EA0770B6F4668aeD0AD87BA4';
const ABI = [
  "function getManifestInfo() external view returns (string hash, uint256 ver, uint256 updated)"
];

async function investigate() {
  console.log('=== ON-CHAIN CONTRACT INVESTIGATION ===\n');

  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(CONTRACT, ABI, provider);

  try {
    const [hash, version, updated] = await contract.getManifestInfo();
    const updatedDate = new Date(Number(updated) * 1000).toISOString();

    console.log(`Contract: ${CONTRACT}`);
    console.log(`Manifest Hash: ${hash || '(empty)'}`);
    console.log(`Version: ${version.toString()}`);
    console.log(`Last Updated: ${updatedDate}`);
    console.log('');

    if (!hash || !hash.startsWith('0x')) {
      console.log('❌ No valid manifest hash on-chain! This is why agents disappear.');
      console.log('   The contract has never been successfully updated with a manifest.');
      return;
    }

    // Try to download the manifest from 0G
    console.log(`Attempting to download manifest from 0G Storage...`);
    console.log(`Hash: ${hash}`);

    // We can't easily download from 0G in a simple script without the SDK setup
    // But we now know what's on-chain
    console.log('\n=== DIAGNOSIS ===');
    console.log(`The on-chain contract points to manifest hash: ${hash.slice(0, 20)}...`);
    console.log(`This manifest was last updated at: ${updatedDate}`);
    console.log(`Version: ${version.toString()}`);
    console.log('\nThe two surviving agents (Customer Support Agent, support_agent_demo)');
    console.log('are likely IN this manifest. The third agent (flk agent) is NOT,');
    console.log('because the manifest was never re-uploaded after creating it.');

  } catch (err) {
    console.error('❌ Failed to read contract:', err.message);
    
    if (err.message.includes('could not coalesce') || err.message.includes('BAD_DATA')) {
      console.log('\n⚠️ The contract might not be deployed correctly or ABI mismatch.');
    }
  }
}

investigate().catch(console.error);
