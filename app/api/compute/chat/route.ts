import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion, chatCompletionStream, toUserFacingComputeError } from '@/lib/0g-compute-inference'

/**
 * POST /api/compute/chat
 * Direct 0G Compute chat completion.
 * Body:
 *   - providerAddress: string (required)
 *   - messages: Array<{ role, content }> (required)
 *   - model: string (optional, overrides provider default)
 *   - stream: boolean (optional, default false)
 */
export async function POST(req: NextRequest) {
  try {
    const { providerAddress, messages, model, stream } = await req.json()

    if (!providerAddress) {
      return NextResponse.json({ error: 'providerAddress is required' }, { status: 400 })
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    // ── Streaming mode ──
    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const gen = chatCompletionStream(providerAddress, messages, { model })
            for await (const event of gen) {
              const sseData = `data: ${JSON.stringify(event)}\n\n`
              controller.enqueue(encoder.encode(sseData))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (err: any) {
            const errorEvent = `data: ${JSON.stringify({ type: 'error', error: toUserFacingComputeError(err) })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ── Standard mode ──
    const result = await chatCompletion(providerAddress, messages, { model })

    return NextResponse.json({
      output: result.output,
      model: result.model,
      tokensUsed: result.tokensUsed,
      providerAddress: result.providerAddress,
      chatID: result.chatID,
      verified: result.verified,
      computeNode: '0g-compute-decentralized',
      serviceType: result.serviceType,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: toUserFacingComputeError(error) },
      { status: 500 }
    )
  }
}
