import 'dotenv/config'
import { ethers } from 'ethers'

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
  console.log('='.repeat(60))
  console.log('🧪 LIVE FEATURE TEST: STARTING FRESH')
  console.log('='.repeat(60) + '\n')
  
  const agent1Id = 'agent_live_0'
  const agent2Id = 'agent_live_1'
  
  console.log(`[1] Registering New Agents on 0G...`)
  const a1 = await request('/api/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: agent1Id, name: 'Surojit Assistant' }),
  })
  console.log(`✓ Agent 1 registered: ${a1.agent.name}`)
  
  const a2 = await request('/api/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: agent2Id, name: 'Hackathon Bot' }),
  })
  console.log(`✓ Agent 2 registered: ${a2.agent.name}`)

  console.log(`\n[2] Writing Memories to 0G Storage...`)
  // Agent 1 Memories
  await request('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent1Id, type: 'semantic',
      content: 'The user is building MemoryOS for the 0G APAC Hackathon.',
      importance: 5, tags: ['project', '0g', 'hackathon'],
    }),
  })
  
  await request('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent1Id, type: 'procedural',
      content: 'When writing PR descriptions, always include a testing checklist and link to the relevant 0G Storage hash.',
      importance: 4, tags: ['pr', 'workflow'],
    }),
  })
  console.log(`✓ Memories written for ${a1.agent.name}`)

  // Agent 2 Memories
  await request('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent2Id, type: 'episodic',
      content: 'We successfully deployed the SkillPaymentEscrow smart contract to the Galileo testnet today at block 120593.',
      importance: 3, tags: ['smart-contract', 'deployment'],
    }),
  })
  console.log(`✓ Memories written for ${a2.agent.name}`)


  console.log('\n⏳ Waiting 5s for 0G Compute background embeddings...')
  await new Promise(resolve => setTimeout(resolve, 5000))


  console.log(`\n[3] Testing Semantic Search...`)
  const searchResult = await request('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: agent1Id, query: 'What hackathon is the user doing?' }),
  })
  console.log(`✓ Search matched ${searchResult.count} memories.`)
  if (searchResult.count > 0) {
    console.log(`  Top hit: "${searchResult.memories[0].content}"`)
  }


  console.log(`\n[4] Publishing New Live Skills...`)
  const freeSkill = await request('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '0G Summary Tool',
      description: 'Summarizes a text into exact 3 bullet points.',
      category: 'General',
      prompt: 'Summarize the input text into exactly three short bullet points.',
      inputLabel: 'Text', outputLabel: 'Summary',
      price: '0', publisherName: 'Surojit Assistant', publisherAgentId: agent1Id,
    }),
  })
  console.log(`✓ Free Skill published: ${freeSkill.skill.name}`)

  const paidSkill = await request('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Advanced Solidity Security Audit',
      description: 'Finds smart contract vulnerabilities using AI.',
      category: 'Development',
      prompt: 'You are a Solidity auditor. Check this contract snippet for reentrancy, overflow, or access control bugs. Return YES if secure or NO with explained bugs.',
      inputLabel: 'Solidity Code', outputLabel: 'Audit Result',
      price: '0.005', publisherName: 'Hackathon Bot', publisherAgentId: agent2Id,
      publisherAddress: process.env.PLATFORM_WALLET_ADDRESS || '0x4b19893f92693d16e2e4268505509354a10E7a76',
    }),
  })
  console.log(`✓ Paid Skill published: ${paidSkill.skill.name} (${paidSkill.skill.price} OG)`)


  console.log(`\n[5] Executing Free Skill...`)
  const exec1 = await request('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillId: freeSkill.skill.id,
      userInput: 'MemoryOS is a decentralized agentic economy platform. It lets AI agents remember things via 0G Storage and pay each other using the 0G EVM for skills. It uses Fireworks AI for LLM streaming.',
    }),
  })
  console.log(`✓ Free skill output:\n  ${exec1.output.replace(/\\n/g, '\\n  ')}`)


  console.log(`\n[6] Executing Paid Skill Flow...`)
  const prepare = await request('/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'prepare', skillId: paidSkill.skill.id }),
  })
  
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_0G_RPC)
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider)
  const contract = new ethers.Contract(prepare.contractAddress, prepare.contractAbi, wallet)
  
  console.log(`  Sending ${prepare.amountOg} OG to smart contract on Galileo...`)
  const tx = await contract.executeSkillPayment(prepare.skillId, prepare.publisherAddress, prepare.platformAddress, prepare.amountWei, { value: prepare.amountWei })
  console.log(`  Waiting for transaction to settle (${tx.hash})...`)
  const receipt = await tx.wait()
  
  const verify = await request('/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', skillId: paidSkill.skill.id, txHash: receipt.hash }),
  })
  console.log(`✓ Payment confirmed on-chain!`)

  console.log(`  Running Paid Skill on Fireworks AI model...`)
  const exec2 = await request('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillId: paidSkill.skill.id,
      userInput: 'function withdraw() { payable(msg.sender).transfer(address(this).balance); }',
      paymentProof: verify.paymentProof,
    }),
  })
  console.log(`✓ Paid skill output:\n  ${exec2.output.replace(/\\n/g, '\\n  ')}`)
  
  
  console.log(`\n[7] Verifying Live App Status...`)
  const status = await request('/api/status')
  console.log(`✓ Status: ${status.storageStatus}`)
  console.log(`  Hydrated: Memories=${status.registry.memories}, Skills=${status.registry.skills}, Agents=${status.registry.agents}`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ ALL FEATURES LIVE TESTED AND WORKING!')
  console.log('=' + '='.repeat(59))
}

main().catch(console.error)
