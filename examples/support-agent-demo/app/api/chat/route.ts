import { NextRequest, NextResponse } from 'next/server'
import { memoryClient } from '@/lib/memoryClient'

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || ''
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL || 'accounts/fireworks/models/llama-v3p3-70b-instruct'

async function generateWithLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!FIREWORKS_API_KEY) {
    return `[LLM unavailable — no FIREWORKS_API_KEY]\n\n${userPrompt}`
  }

  const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
    },
    body: JSON.stringify({
      model: FIREWORKS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 512,
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'I could not generate a response.'
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // Step 1: Retrieve context from 0G via RAG
    let context = ""
    let ragMemories: any[] = []
    try {
      const ragResult = await memoryClient.rag.ask(message)
      context = ragResult.answer || ""
      ragMemories = ragResult.memories || []
    } catch (e: any) {
      console.warn("RAG failed:", e.message)
    }

    // Step 2: Save the user's message as an episodic memory to 0G
    try {
      await memoryClient.memory.save(message, {
        type: 'episodic',
        importance: 3,
        tags: ['support_chat', 'user']
      })
    } catch (e: any) {
      console.error("Failed to save memory:", e.message)
    }

    // Step 3: Generate a real conversational response using LLM + RAG context
    const memoryContext = ragMemories.length > 0
      ? ragMemories.map((m: any, i: number) => `[Memory ${i+1}] ${m.content}`).join('\n')
      : context || 'No prior memories found for this user.'

    const systemPrompt = `You are a friendly, helpful AI support agent powered by MemoryOS and the 0G decentralized network.
You have access to the user's past conversation memories stored immutably on 0G Storage.
Use the retrieved memories below to give personalized, context-aware responses.
If you have no relevant memories, acknowledge that and respond helpfully.
Be concise, warm, and professional. Never fabricate information not in the memories.`

    const userPrompt = `RETRIEVED MEMORIES FROM 0G STORAGE:
${memoryContext}

USER MESSAGE:
${message}

Respond naturally to the user, referencing their past memories if relevant.`

    const reply = await generateWithLLM(systemPrompt, userPrompt)

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error("Chat error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
