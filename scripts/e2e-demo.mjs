import 'dotenv/config'
import { ethers } from 'ethers'

const appUrl = process.env.MEMORYOS_APP_URL || 'http://localhost:3001'

async function request(path, init = {}) {
  const response = await fetch(`${appUrl}${path}`, init)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`${path}: ${data.error || response.statusText}`)
  }
  return data
}

async function main() {
  console.log('='.repeat(60))
  console.log('🚀 MemoryOS 0G E2E Demo Flow')
  console.log('='.repeat(60) + '\n')
  
  const agentId = `agent_hacker_${Date.now()}`
  
  console.log(`[1] Registering Agent Identity on 0G...`)
  const identity = await request('/api/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, name: 'Hacker Agent' }),
  })
  console.log(`✓ Agent registered: ${identity.agent.agentId}`)
  console.log(`  Waiting for 0G Storage hash...`)

  console.log(`\n[2] Writing memories to 0G Storage...`)
  const m1 = await request('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      type: 'semantic',
      content: 'The user prefers Next.js for all web projects and specifically wants to use App Router.',
      importance: 5,
      tags: ['preferences', 'tech-stack'],
    }),
  })
  console.log(`✓ Memory 1 (Semantic) written: ${m1.memory.content}`)

  const m2 = await request('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      type: 'episodic',
      content: 'Debugged a memory alignment issue with the agent. Found that hydration from 0G was missing a wait condition.',
      importance: 4,
      tags: ['debugging', '0G'],
    }),
  })
  console.log(`✓ Memory 2 (Episodic) written: ${m2.memory.content}`)

  console.log('\n⏳ Waiting 5 seconds for 0G Compute embeddings to generate...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  console.log(`\n[3] Semantic Search via 0G Compute...`)
  const query = 'What does the user like to build websites with?'
  console.log(`  Query: "${query}"`)
  const search = await request('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, query }),
  })
  console.log(`✓ Found ${search.count} memories. Mode: ${search.searchMethod}`)
  if (search.count > 0) {
    console.log(`  Top match: "${search.memories[0].content}"`)
  }

  console.log(`\n[4] Publishing a Free Skill...`)
  const freeSkill = await request('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Stack Recommender',
      description: 'Recommends additional libraries based on core tech stack',
      category: 'Development',
      prompt: 'You suggest exactly two complementary libraries for this tech stack. Format as: "1. [Name] - [Reason]. 2. [Name] - [Reason]"',
      inputLabel: 'Tech Stack',
      outputLabel: 'Recommendations',
      price: '0',
      publisherName: 'Hacker Agent',
      publisherAgentId: agentId,
      tags: ['coding'],
    }),
  })
  console.log(`✓ Skill published: ${freeSkill.skill.name}`)

  console.log(`\n[5] Executing Free Skill...`)
  const exec1 = await request('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillId: freeSkill.skill.id,
      userInput: 'Next.js App Router',
    }),
  })
  console.log(`✓ Output:\n${exec1.output}`)
  console.log(`  Tokens: ${exec1.tokensUsed} | Model: ${exec1.model}`)

  console.log(`\n[6] Finding a Paid Skill in the Marketplace...`)
  const skillsRes = await request('/api/skills')
  const paidSkill = skillsRes.skills.find(s => parseFloat(s.price) > 0)
  
  if (!paidSkill) {
    console.log('⚠ No paid skills found. Skipping paid flow.')
  } else if (!process.env.WALLET_PRIVATE_KEY || !process.env.NEXT_PUBLIC_0G_RPC) {
    console.log('⚠ Missing WALLET_PRIVATE_KEY or NEXT_PUBLIC_0G_RPC needed to simulate payment. Skipping paid flow.')
  } else {
    console.log(`✓ Found paid skill: "${paidSkill.name}" (${paidSkill.price} OG)`)
    
    console.log(`\n[7] Simulating On-chain Payment...`)
    
    // Step 7a: Prepare payment payload
    const prepare = await request('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare', skillId: paidSkill.id }),
    })
    
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_0G_RPC)
    const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider)
    
    // Step 7b: Execute transaction via Escrow contract
    const contract = new ethers.Contract(prepare.contractAddress, prepare.contractAbi, wallet)
    console.log(`  Sending ${prepare.amountOg} OG to escrow contract...`)
    const tx = await contract.executeSkillPayment(
      prepare.skillId,
      prepare.publisherAddress,
      prepare.platformAddress,
      prepare.amountWei,
      { value: prepare.amountWei }
    )
    console.log(`  Waiting for confirmation (Tx: ${tx.hash})`)
    const receipt = await tx.wait()
    console.log(`✓ Payment confirmed in block ${receipt.blockNumber}`)
    
    // Step 7c: Verify payment backend
    console.log(`  Verifying payment receipt with backend...`)
    const verify = await request('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', skillId: paidSkill.id, txHash: receipt.hash }),
    })
    console.log(`✓ Payment valid. Expected 95% to publisher, 5% to platform.`)
    
    console.log(`\n[8] Executing Paid Skill...`)
    const exec2 = await request('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillId: paidSkill.id,
        userInput: 'Review this block: function foo() { setTimeout(()=>console.log(1),0); console.log(2); }',
        paymentProof: verify.paymentProof,
      }),
    })
    console.log(`✓ Paid execution successful!`)
    console.log(`  Output:\n${exec2.output}`)
    console.log(`  Tokens: ${exec2.tokensUsed} | Fee Distributed: ${exec2.fee} OG | Proof: ${exec2.paymentTxHash}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ End-to-End Demo Sequence Completed Successfully!')
  console.log('=' + '='.repeat(59))
}

main().catch(error => {
  console.error('\n❌ E2E Demo Failed:', error.message)
  process.exitCode = 1
})
