/**
 * app/api/seed-0g/route.ts
 *
 * Uploads all seed memories, skills, and agents to 0G Storage.
 * Call this ONCE after starting the server: GET /api/seed-0g
 *
 * It runs in the background — you get an instant response, then watch
 * your terminal for the upload confirmations coming in one by one.
 *
 * After completion, all items will have real 0G hashes and the manifest
 * on 0G will be updated with the new entries.
 */
import { NextResponse } from 'next/server'
import { getAllAgents, getAllMemoriesForSeed, getAllSkillsForSeed, updateAgentHash, updateMemoryHash, updateSkillHash } from '@/lib/store'
import { upsertAgentManifestRecord, upsertMemoryManifestRecord, upsertSkillManifestRecord, flushManifest } from '@/lib/0g-manifest'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { ensureHydrated } from '@/lib/hydration'

export const dynamic = 'force-dynamic'

export async function GET() {
  await ensureHydrated()

  const memories = getAllMemoriesForSeed().filter(m => !m.storageHash?.startsWith('0x'))
  const skills   = getAllSkillsForSeed().filter(s => !s.storageHash?.startsWith('0x'))
  const agents   = getAllAgents().filter(a => !(a as any).identityHash?.startsWith('0x'))

  const total = memories.length + skills.length + agents.length

  if (total === 0) {
    return NextResponse.json({
      message: '✓ All items already have real 0G hashes. Nothing to upload.',
      memories: 0,
      skills: 0,
      agents: 0,
    })
  }

  // Fire off all uploads in the background — don't block the response
  ;(async () => {
    console.log(`\n🚀 Seeding ${memories.length} memories + ${skills.length} skills + ${agents.length} agents to 0G...\n`)

    let uploaded = 0
    let failed = 0

    for (const memory of memories) {
      try {
        const hash = await uploadToStorage(memory)
        updateMemoryHash(memory.id, hash)
        upsertMemoryManifestRecord({ ...memory, storageHash: hash })
        uploaded++
        console.log(`✓ Memory [${memory.id}] → ${hash}`)
        console.log(`  ${getExplorerUrl(hash)}`)
      } catch (e: any) {
        failed++
        console.error(`✗ Memory [${memory.id}] failed: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    for (const skill of skills) {
      try {
        const hash = await uploadToStorage(skill)
        updateSkillHash(skill.id, hash)
        upsertSkillManifestRecord({ ...skill, storageHash: hash })
        uploaded++
        console.log(`✓ Skill  [${skill.id}] → ${hash}`)
        console.log(`  ${getExplorerUrl(hash)}`)
      } catch (e: any) {
        failed++
        console.error(`✗ Skill  [${skill.id}] failed: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    for (const agent of agents) {
      try {
        const identityRecord = {
          agentId: agent.agentId, name: agent.name,
          registeredAt: agent.createdAt, platform: 'MemoryOS',
          network: 'Galileo Testnet', version: '1.0',
          capabilities: ['memory-read', 'memory-write', 'skill-publish', 'skill-execute'],
          timestamp: new Date().toISOString(),
        }
        const hash = await uploadToStorage(identityRecord)
        updateAgentHash(agent.agentId, hash)
        upsertAgentManifestRecord({ ...agent, identityHash: hash })
        uploaded++
        console.log(`✓ Agent  [${agent.agentId}] → ${hash}`)
        console.log(`  ${getExplorerUrl(hash)}`)
      } catch (e: any) {
        failed++
        console.error(`✗ Agent  [${agent.agentId}] failed: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    // Flush the manifest to 0G immediately after seed
    const manifestHash = await flushManifest()
    console.log(`\n✅ Seed complete — ${uploaded} uploaded, ${failed} failed`)
    if (manifestHash) {
      console.log(`📦 Manifest uploaded to 0G: ${manifestHash}`)
      console.log(`   Set MANIFEST_HASH=${manifestHash} in .env.local\n`)
    }
  })()

  return NextResponse.json({
    message: `Uploading ${total} items to 0G in the background. Watch your terminal for progress.`,
    memories: memories.length,
    skills: skills.length,
    agents: agents.length,
    tip: 'After seeding, the manifest hash will be printed to your terminal. Set it as MANIFEST_HASH in .env.local.',
  })
}
