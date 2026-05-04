/**
 * Download the manifest from 0G Storage and inspect its contents.
 */
import { ethers } from 'ethers';
import { Indexer } from '@0gfoundation/0g-ts-sdk';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, rm } from 'fs/promises';

const MANIFEST_HASH = '0xb13bc120dc06f9bd0d042965669212112314b45f2f3b5061b8192d06f1285ca6';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';

async function downloadManifest() {
  console.log('=== DOWNLOADING MANIFEST FROM 0G STORAGE ===\n');
  console.log(`Hash: ${MANIFEST_HASH}`);
  console.log(`Indexer: ${INDEXER_URL}\n`);

  const indexer = new Indexer(INDEXER_URL);
  const tempPath = join(tmpdir(), `manifest-investigation-${Date.now()}.json`);

  try {
    const err = await indexer.download(MANIFEST_HASH, tempPath, false);
    if (err) {
      console.error('❌ Download failed:', err);
      return;
    }

    const data = await readFile(tempPath, 'utf-8');
    await rm(tempPath, { force: true });

    const manifest = JSON.parse(data);
    
    console.log('=== MANIFEST CONTENTS ===\n');
    console.log(`Version: ${manifest.version}`);
    console.log(`Updated: ${new Date(manifest.updatedAt).toISOString()}`);
    console.log(`Memories: ${manifest.memories?.length || 0}`);
    console.log(`Skills: ${manifest.skills?.length || 0}`);
    console.log(`Agents: ${manifest.agents?.length || 0}`);
    
    if (manifest.agents?.length > 0) {
      console.log('\n=== AGENTS IN MANIFEST ===\n');
      manifest.agents.forEach((a, i) => {
        console.log(`  [${i+1}] agentId: ${a.agentId}`);
        console.log(`      hash: ${a.storageHash?.slice(0, 20)}...`);
        console.log(`      owner: ${a.ownerAddress || 'none'}`);
        console.log(`      created: ${new Date(a.createdAt).toISOString()}`);
        console.log('');
      });
    }

    if (manifest.memories?.length > 0) {
      console.log('=== MEMORIES IN MANIFEST ===\n');
      const byAgent = {};
      manifest.memories.forEach(m => {
        byAgent[m.agentId] = (byAgent[m.agentId] || 0) + 1;
      });
      Object.entries(byAgent).forEach(([agentId, count]) => {
        console.log(`  ${agentId}: ${count} memories`);
      });
    }

    // Write full manifest for reference
    console.log('\n=== FULL MANIFEST JSON ===\n');
    console.log(JSON.stringify(manifest, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

downloadManifest().catch(console.error);
