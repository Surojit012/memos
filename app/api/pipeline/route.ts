/**
 * app/api/pipeline/route.ts
 *
 * Skill Composition Pipelines — chain multiple skills together.
 *
 * POST /api/pipeline
 * Body: {
 *   steps: [{ skillId: string, transform?: string }],
 *   initialInput: string,
 *   agentId?: string
 * }
 *
 * Executes skills sequentially: output of step N becomes input of step N+1.
 * An optional `transform` prompt per step can reshape the output before
 * passing it forward (e.g., "Extract only the summary paragraph").
 *
 * The full pipeline execution trace is stored as a single receipt on 0G Storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSkillById, recordSkillExecution } from '@/lib/store'
import { ensureHydrated } from '@/lib/hydration'
import { uploadToStorage, getExplorerUrl } from '@/lib/0g-storage'
import { computeInference } from '@/lib/intelligence/llm'
import { validatePlatformSecret, validateAgentApiKeyAsync, ensureAgentInStore } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { createHash } from 'crypto'
import { v4 as uuid } from 'uuid'

export const dynamic = 'force-dynamic'

interface PipelineStep {
  skillId: string
  transform?: string // Optional prompt to reshape output before passing to next step
}

interface PipelineStepResult {
  stepIndex: number
  skillId: string
  skillName: string
  input: string
  output: string
  inputHash: string
  outputHash: string
  durationMs: number
}

export async function POST(req: NextRequest) {
  try {
    // Pipelines chain N skill executions — even more LLM-cost-sensitive, so a
    // tighter cap than single execute.
    const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 })
    if (limited) return limited
    await ensureHydrated()
    const { steps, initialInput, agentId } = await req.json()

    if (agentId) await ensureAgentInStore(agentId)

    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const hasValidApiKey = agentId && apiKey && await validateAgentApiKeyAsync(agentId, apiKey)
    const hasValidPlatformSecret = validatePlatformSecret(req)
    if (!hasValidApiKey && !hasValidPlatformSecret) {
      return NextResponse.json({ error: 'Unauthorized — provide a valid Agent API Key or platform secret.' }, { status: 401 })
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'steps array is required (at least 1 step).' }, { status: 400 })
    }
    if (!initialInput) {
      return NextResponse.json({ error: 'initialInput is required.' }, { status: 400 })
    }
    if (steps.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 steps per pipeline.' }, { status: 400 })
    }

    // Validate all skills exist before starting
    for (const step of steps) {
      const skill = getSkillById(step.skillId)
      if (!skill) {
        return NextResponse.json({
          error: `Skill [${step.skillId}] not found. All skills must exist before pipeline execution.`,
        }, { status: 404 })
      }
    }

    const pipelineId = `pipe_${uuid().slice(0, 12)}`
    const pipelineStart = Date.now()
    const stepResults: PipelineStepResult[] = []
    let currentInput = initialInput

    console.log(`\n🔗 Pipeline ${pipelineId} started with ${steps.length} steps`)

    // ── Execute steps sequentially ──
    for (let i = 0; i < steps.length; i++) {
      const step: PipelineStep = steps[i]
      const skill = getSkillById(step.skillId)!
      const stepStart = Date.now()

      console.log(`  Step ${i + 1}/${steps.length}: ${skill.name} (${skill.id})`)

      // Run the skill via 0G Compute inference
      const output = await computeInference({
        systemPrompt: skill.prompt,
        userPrompt: currentInput,
        temperature: 0.3,
      })

      recordSkillExecution(skill.id)

      const stepResult: PipelineStepResult = {
        stepIndex: i,
        skillId: skill.id,
        skillName: skill.name,
        input: currentInput.slice(0, 200) + (currentInput.length > 200 ? '...' : ''),
        output: output.slice(0, 500) + (output.length > 500 ? '...' : ''),
        inputHash: createHash('sha256').update(currentInput).digest('hex'),
        outputHash: createHash('sha256').update(output).digest('hex'),
        durationMs: Date.now() - stepStart,
      }
      stepResults.push(stepResult)

      // Apply optional transform before passing to next step
      if (step.transform) {
        currentInput = await computeInference({
          systemPrompt: `You are a data transformer. Reshape the following output according to this instruction: "${step.transform}"`,
          userPrompt: output,
          temperature: 0.1,
        })
      } else {
        currentInput = output
      }
    }

    const totalDurationMs = Date.now() - pipelineStart

    // ── Build & Upload Pipeline Receipt to 0G ──
    const pipelineReceipt = {
      pipelineId,
      agentId: agentId || 'anonymous',
      steps: stepResults,
      initialInputHash: createHash('sha256').update(initialInput).digest('hex'),
      finalOutputHash: createHash('sha256').update(currentInput).digest('hex'),
      totalSteps: steps.length,
      totalDurationMs,
      timestamp: Date.now(),
    }

    let receiptHash: string | undefined
    try {
      receiptHash = await uploadToStorage(pipelineReceipt)
      console.log(`  📄 Pipeline receipt → 0G: ${receiptHash}`)
      console.log(`  Explorer: ${getExplorerUrl(receiptHash)}`)
    } catch (err: any) {
      console.warn(`  ⚠ Pipeline receipt upload failed: ${err.message}`)
    }

    console.log(`  ✅ Pipeline complete: ${steps.length} steps in ${totalDurationMs}ms\n`)

    return NextResponse.json({
      success: true,
      pipelineId,
      finalOutput: currentInput,
      steps: stepResults,
      totalSteps: steps.length,
      totalDurationMs,
      receipt: {
        storageHash: receiptHash,
        explorerUrl: receiptHash ? getExplorerUrl(receiptHash) : undefined,
      },
    })

  } catch (e: any) {
    console.error('Pipeline execution failed:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
