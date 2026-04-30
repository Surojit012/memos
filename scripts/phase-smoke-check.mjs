const appUrl = process.env.MEMORYOS_APP_URL || 'http://localhost:3000'

async function request(path, init = {}) {
  const response = await fetch(`${appUrl}${path}`, init)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`${path}: ${data.error || response.statusText}`)
  }
  return data
}

async function main() {
  const agentId = `agent_smoke_${Date.now()}`
  const memoryContent = 'User prefers mild food and short product updates.'

  console.log(`Using ${appUrl}`)
  console.log(`Writing memory for ${agentId}`)
  const memory = await request('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      type: 'semantic',
      content: memoryContent,
      importance: 4,
      tags: ['smoke', 'food'],
    }),
  })
  console.log(`Memory created: ${memory.memory.id}`)

  console.log('Waiting briefly for background embedding/storage jobs...')
  await new Promise(resolve => setTimeout(resolve, 4000))

  const search = await request('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, query: 'food preferences' }),
  })
  console.log(`Semantic search results: ${search.count}`)

  const skill = await request('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test Free Skill',
      description: 'Simple free skill for integration verification.',
      category: 'General',
      prompt: 'Return exactly one sentence acknowledging the input.',
      inputLabel: 'Input',
      outputLabel: 'Output',
      price: '0',
      publisherName: 'Smoke Test',
      publisherAgentId: agentId,
      publisherAddress: '',
      tags: ['smoke'],
    }),
  })
  console.log(`Skill published: ${skill.skill.id}`)

  const execution = await request('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillId: skill.skill.id,
      userInput: 'Confirm the smoke test is running.',
    }),
  })
  console.log(`Free skill execution output: ${execution.output}`)

  console.log('Smoke flow completed.')
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
