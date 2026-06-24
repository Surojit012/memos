import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { createSkill, getAllSkills, getSkillById, removeSkillFromStore, upsertHydratedSkill, updateSkillHash } from '@/lib/store'
import { upsertSkillManifestRecord } from '@/lib/0g-manifest'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { ensureHydrated } from '@/lib/hydration'
import { validateAgentApiKeyAsync, validatePlatformSecret, ensureAgentInStore } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  await ensureHydrated()
  return NextResponse.json(
    { skills: getAllSkills() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

export async function POST(req: NextRequest) {
  try {
    await ensureHydrated()
    const body = await req.json()

    if (body.agentId) await ensureAgentInStore(body.agentId)

    // ── Security: accept EITHER a valid agent API key (tied to body.agentId) OR the platform secret ──
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && body.agentId && await validateAgentApiKeyAsync(body.agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
    }

    if (!body.name || !body.prompt || body.price === undefined)
      return NextResponse.json({ error: 'name, prompt, price required' }, { status: 400 })

    // Paid skills require a publisher address for payout
    if (parseFloat(body.price) > 0 && !ethers.isAddress(body.publisherAddress || '')) {
      return NextResponse.json({ error: 'publisherAddress is required for paid skills' }, { status: 400 })
    }

    // ── Anti-spoofing: bind the skill's publisher to the AUTHENTICATED agent ──
    // When the caller authed with an agent API key, they may only publish AS
    // that agent — never attribute the skill to someone else's agentId. Only
    // platform-secret callers (internal seeding/SDK) may set an arbitrary
    // publisherAgentId.
    if (hasValidApiKey) {
      if (body.publisherAgentId && body.publisherAgentId !== body.agentId) {
        return NextResponse.json(
          { error: 'publisherAgentId must match your authenticated agentId.' },
          { status: 403 }
        )
      }
      body.publisherAgentId = body.agentId
    } else if (!body.publisherAgentId) {
      return NextResponse.json({ error: 'publisherAgentId required' }, { status: 400 })
    }

    // Step 1 — create in local store instantly
    const skill = createSkill(body)

    try {
      // Step 2 — upload to 0G Storage before reporting success
      const hash = await uploadToStorage(skill)
      updateSkillHash(skill.id, hash)
      const hydratedSkill = { ...skill, storageHash: hash }
      upsertHydratedSkill(hydratedSkill)
      await upsertSkillManifestRecord(hydratedSkill)
      console.log(`✓ Skill ${skill.id} stored on 0G: ${hash}`)
      console.log(`  Explorer: ${getExplorerUrl(hash)}`)

      return NextResponse.json({ skill: hydratedSkill }, { status: 201 })
    } catch (error: any) {
      removeSkillFromStore(skill.id)
      return NextResponse.json({ error: error.message || 'Failed to store skill on 0G' }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * PUT — Update an existing skill, creating a new immutable version on 0G.
 * The previous version's 0G hash is preserved in `previousVersionHash`.
 */
export async function PUT(req: NextRequest) {
  try {
    await ensureHydrated()
    const body = await req.json()

    if (!body.skillId) {
      return NextResponse.json({ error: 'skillId is required to update a skill.' }, { status: 400 })
    }

    if (body.agentId) await ensureAgentInStore(body.agentId)

    // ── Security: caller must present a valid agent API key OR the platform
    // secret. Without this, ANYONE could rewrite any skill's prompt, price, or
    // payout address. (This check was previously missing entirely.) ──
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = apiKey && body.agentId && await validateAgentApiKeyAsync(body.agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
    }

    const existing = getSkillById(body.skillId)
    if (!existing) {
      return NextResponse.json({ error: `Skill [${body.skillId}] not found.` }, { status: 404 })
    }

    // ── Ownership: an agent-key caller may only edit skills they published.
    // Platform-secret callers (internal) may edit any skill. ──
    if (hasValidApiKey && existing.publisherAgentId !== body.agentId) {
      return NextResponse.json({ error: 'Forbidden — you can only update skills you published.' }, { status: 403 })
    }

    // ── Payout integrity (#8): if this update makes the skill paid, it MUST
    // have a valid publisher payout address — otherwise payments go nowhere. ──
    const nextPrice = body.price !== undefined ? body.price : existing.price
    const nextPublisherAddress =
      body.publisherAddress !== undefined ? body.publisherAddress : existing.publisherAddress
    if (parseFloat(nextPrice) > 0 && !ethers.isAddress(nextPublisherAddress || '')) {
      return NextResponse.json({ error: 'A valid publisherAddress is required for paid skills.' }, { status: 400 })
    }

    // Preserve the old version's 0G hash before overwriting
    const previousVersionHash = existing.storageHash
    const previousVersion = existing.version || 1

    // Apply updates to the skill (only allowed fields)
    if (body.name) existing.name = body.name
    if (body.description) existing.description = body.description
    if (body.prompt) existing.prompt = body.prompt
    if (body.price !== undefined) existing.price = body.price
    if (body.publisherAddress !== undefined) existing.publisherAddress = body.publisherAddress
    if (body.inputLabel) existing.inputLabel = body.inputLabel
    if (body.outputLabel) existing.outputLabel = body.outputLabel
    if (body.tags) existing.tags = body.tags

    // Bump version and link previous
    existing.version = previousVersion + 1
    existing.previousVersionHash = previousVersionHash

    try {
      // Upload the new version as a fresh 0G blob
      const newHash = await uploadToStorage(existing)
      updateSkillHash(existing.id, newHash)
      const hydratedSkill = { ...existing, storageHash: newHash }
      upsertHydratedSkill(hydratedSkill)
      await upsertSkillManifestRecord(hydratedSkill)

      console.log(`✓ Skill ${existing.id} updated to v${existing.version} on 0G: ${newHash}`)
      console.log(`  Previous version preserved at: ${previousVersionHash}`)
      console.log(`  Explorer: ${getExplorerUrl(newHash)}`)

      return NextResponse.json({
        skill: hydratedSkill,
        version: existing.version,
        previousVersionHash,
        message: `Skill updated to v${existing.version}. Previous version remains immutable on 0G.`,
      })
    } catch (error: any) {
      // Rollback version bump on failure
      existing.version = previousVersion
      existing.previousVersionHash = undefined
      return NextResponse.json({ error: error.message || 'Failed to store updated skill on 0G' }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
