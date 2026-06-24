/**
 * app/api/agent/[agentId]/reputation/route.ts
 *
 * On-Chain Reputation Score
 *
 * Computes a composite reputation score (0–100) for an agent based on:
 * - Skill execution volume (how many times their skills have been used)
 * - Memory depth (total memories = knowledge breadth)
 * - Cognitive maturity (dream cycles run)
 * - Economic value (total OG earned from skills)
 * - Longevity (days since registration)
 *
 * GET /api/agent/[agentId]/reputation → { reputationScore, breakdown }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMemories, getAllSkills } from '@/lib/store'
import { ensureHydrated, getAgentOrRestore } from '@/lib/hydration'

export const dynamic = 'force-dynamic'

interface ReputationBreakdown {
  skillExecutions: { raw: number; score: number; weight: number }
  memoryDepth: { raw: number; score: number; weight: number }
  earnings: { raw: number; score: number; weight: number }
  longevity: { raw: number; score: number; weight: number }
  skillsPublished: { raw: number; score: number; weight: number }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    await ensureHydrated()
    const agentId = params.agentId
    const agent = await getAgentOrRestore(agentId)

    if (!agent) {
      return NextResponse.json({ error: `Agent [${agentId}] not found.` }, { status: 404 })
    }

    // ── Gather raw metrics ──
    const memories = getMemories(agentId, undefined, 100000)
    const allSkills = getAllSkills()
    const agentSkills = allSkills.filter(s => s.publisherAgentId === agentId)
    const totalSkillExecutions = agentSkills.reduce((sum, s) => sum + s.usageCount, 0)
    const daysSinceCreation = Math.max(1, (Date.now() - agent.createdAt) / (1000 * 60 * 60 * 24))

    // ── Scoring functions (each returns 0–100) ──

    // Skill executions: logarithmic scale, 1000 executions = 100
    const execScore = Math.min(100, Math.log10(Math.max(1, totalSkillExecutions)) / Math.log10(1000) * 100)

    // Memory depth: logarithmic scale, 500 memories = 100
    const memoryScore = Math.min(100, Math.log10(Math.max(1, memories.length)) / Math.log10(500) * 100)

    // Earnings: logarithmic scale, 1 OG earned = 100
    const earningsScore = Math.min(100, Math.log10(Math.max(0.001, agent.totalEarned)) / Math.log10(1) * 100)

    // Longevity: linear scale, 30 days = 100
    const longevityScore = Math.min(100, (daysSinceCreation / 30) * 100)

    // Skills published: 5 skills = 100
    const publishedScore = Math.min(100, (agentSkills.length / 5) * 100)

    // ── Weighted composite ──
    const weights = {
      skillExecutions: 0.30,
      memoryDepth: 0.20,
      earnings: 0.20,
      longevity: 0.15,
      skillsPublished: 0.15,
    }

    const compositeScore = Math.round(
      execScore * weights.skillExecutions +
      memoryScore * weights.memoryDepth +
      earningsScore * weights.earnings +
      longevityScore * weights.longevity +
      publishedScore * weights.skillsPublished
    )

    // ── Tier assignment ──
    let tier: string
    if (compositeScore >= 80) tier = 'Diamond'
    else if (compositeScore >= 60) tier = 'Gold'
    else if (compositeScore >= 40) tier = 'Silver'
    else if (compositeScore >= 20) tier = 'Bronze'
    else tier = 'Newcomer'

    const breakdown: ReputationBreakdown = {
      skillExecutions: { raw: totalSkillExecutions, score: Math.round(execScore), weight: weights.skillExecutions },
      memoryDepth: { raw: memories.length, score: Math.round(memoryScore), weight: weights.memoryDepth },
      earnings: { raw: agent.totalEarned, score: Math.round(earningsScore), weight: weights.earnings },
      longevity: { raw: Math.round(daysSinceCreation), score: Math.round(longevityScore), weight: weights.longevity },
      skillsPublished: { raw: agentSkills.length, score: Math.round(publishedScore), weight: weights.skillsPublished },
    }

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      reputationScore: compositeScore,
      tier,
      breakdown,
      message: `${agent.name} has a ${tier}-tier reputation score of ${compositeScore}/100.`,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
