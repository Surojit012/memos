/**
 * Example: Skill Pipeline
 *
 * Demonstrates publishing skills, chaining them in a pipeline,
 * and using the dreams API for memory consolidation.
 *
 * Run: node examples/skill_pipeline.mjs
 */

import { MemoryOSClient } from "memoryos-openclaw";

const client = new MemoryOSClient({
  apiUrl: "http://localhost:3000",
  agentId: "agent_pipeline_demo",
});

console.log("── MemoryOS Skill Pipeline Example ──\n");

// 1. Register
await client.identity.register("Pipeline Demo Agent");

// 2. Publish two skills
console.log("── Publishing Skills ──");

const summarizer = await client.skills.publish({
  name: "Text Summarizer",
  description: "Summarize any text into 2-3 key bullet points",
  category: "NLP",
  prompt: "Summarize the input into exactly 3 bullet points. Be concise.",
  inputLabel: "Text to summarize",
  outputLabel: "Bullet points",
  price: "0",
  publisherName: "Pipeline Agent",
  tags: ["nlp", "summary"],
});
console.log(`  ✓ Published: ${summarizer.skill.name} (${summarizer.skill.id})`);

const translator = await client.skills.publish({
  name: "Tone Adjuster",
  description: "Rewrite text in a professional business tone",
  category: "Writing",
  prompt: "Rewrite the following in a professional, formal business tone. Keep the meaning intact.",
  inputLabel: "Casual text",
  outputLabel: "Professional text",
  price: "0",
  publisherName: "Pipeline Agent",
  tags: ["writing", "tone"],
});
console.log(`  ✓ Published: ${translator.skill.name} (${translator.skill.id})`);

// 3. Run pipeline: Summarize → then make it professional
console.log("\n── Running Pipeline ──");
const result = await client.pipeline.run(
  [
    { skillId: summarizer.skill.id },
    { skillId: translator.skill.id },
  ],
  "We had a super chill meeting today where basically everyone agreed we should totally ship the new feature next week because the tests look pretty good and the PM said it's fine."
);
console.log(`  Final output:\n${result.finalOutput}`);

// 4. Trigger a dream cycle
console.log("\n── Agent Dreams ──");
try {
  const dream = await client.dreams.sleep();
  console.log(`  ✓ Dream cycle complete: ${dream.summary}`);
} catch (e) {
  console.log(`  Dream cycle: ${e.message}`);
}

// 5. Take a brain snapshot
console.log("\n── Brain Snapshot ──");
try {
  const snap = await client.snapshot.create();
  console.log(`  ✓ Snapshot hash: ${snap.snapshotHash?.slice(0, 20)}...`);
  console.log(`  Memories bundled: ${snap.memoriesCount}`);
} catch (e) {
  console.log(`  Snapshot: ${e.message}`);
}

client.close();
console.log("\n✅ Pipeline demo complete!");
