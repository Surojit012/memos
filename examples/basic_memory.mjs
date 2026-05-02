/**
 * Example: Basic Memory CRUD with the JS SDK
 *
 * Demonstrates saving, listing, searching, and using skills
 * with the MemoryOS OpenClaw JS SDK.
 *
 * Run: node examples/basic_memory.mjs
 */

import { MemoryOSClient } from "memoryos-openclaw";

const client = new MemoryOSClient({
  apiUrl: "http://localhost:3000",
  agentId: "agent_example_js",
});

console.log("── MemoryOS JS SDK Example ──\n");

// 1. Register agent
try {
  const identity = await client.identity.register("JS Example Agent");
  console.log(`✓ Agent registered: ${identity.agent?.name || client.agentId}`);
} catch (e) {
  console.log(`  Agent exists or error: ${e.message}`);
}

// 2. Save memories
console.log("\n── Saving Memories ──");

await client.memory.save("User prefers TypeScript over JavaScript", {
  type: "semantic",
  tags: ["preference", "language"],
  importance: 4,
});
console.log("  ✓ Saved semantic memory");

await client.memory.save("Migrated database from Postgres to Supabase on April 28", {
  type: "episodic",
  tags: ["migration", "database"],
  importance: 5,
});
console.log("  ✓ Saved episodic memory");

// 3. List memories
console.log("\n── Listing Memories ──");
const list = await client.memory.list({ limit: 5 });
console.log(`  Found ${list.count} memories:`);
for (const m of list.memories) {
  console.log(`    [${m.type}] ${m.content.slice(0, 60)}...`);
}

// 4. Semantic search
console.log("\n── Semantic Search ──");
const search = await client.memory.search("database changes");
console.log(`  Query: 'database changes' → ${search.count} results`);
for (const m of search.memories.slice(0, 3)) {
  console.log(`    [${m.type}] ${m.content.slice(0, 60)}...`);
}

// 5. List skills
console.log("\n── Skills Marketplace ──");
const skills = await client.skills.list();
console.log(`  Found ${skills.skills.length} skills:`);
for (const s of skills.skills.slice(0, 3)) {
  console.log(`    [${s.category}] ${s.name} — ${s.price} OG`);
}

// 6. Platform status
console.log("\n── Status ──");
const status = await client.status();
console.log(`  0G Configured: ${status.configured}`);

client.close();
console.log("\n✅ Done!");
