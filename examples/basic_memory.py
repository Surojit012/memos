"""
Example: Basic Memory CRUD

Demonstrates saving, listing, searching, and deleting memories
using the MemoryOS Python SDK.

Run: python3 examples/basic_memory.py
"""

import sys
import os

# Resolve the local memoryos package (no pip install needed)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "packages", "memoryos-py"))

from memoryos import MemoryOS


def main():
    # 1. Connect to MemoryOS
    client = MemoryOS(
        api_url="http://localhost:3000",
        agent_id="agent_example_bot",
    )
    print(f"Connected: {client}\n")

    # 2. Register the agent (first time only)
    try:
        identity = client.identity.register("Example Bot")
        print(f"✓ Agent registered: {identity.get('agent', {}).get('name')}")
    except Exception as e:
        print(f"  Agent already exists or error: {e}")

    # 3. Save memories of different types
    print("\n── Saving Memories ──")

    client.memory.save(
        "User prefers dark mode and compact layouts",
        type="semantic",
        tags=["preference", "ui"],
        importance=4,
    )
    print("  ✓ Saved semantic memory (preference)")

    client.memory.save(
        "On May 1, deployed v2.0 to production with zero downtime",
        type="episodic",
        tags=["deployment", "milestone"],
        importance=5,
    )
    print("  ✓ Saved episodic memory (event)")

    client.memory.save(
        "Deploy checklist: 1) Run tests 2) Build 3) Stage 4) Smoke test 5) Promote",
        type="procedural",
        tags=["deployment", "process"],
        importance=4,
    )
    print("  ✓ Saved procedural memory (workflow)")

    # 4. List all memories
    print("\n── Listing Memories ──")
    result = client.memory.list(limit=10)
    memories = result.get("memories", [])
    print(f"  Found {len(memories)} memories:")
    for m in memories:
        print(f"    [{m['type']}] {m['content'][:60]}...")

    # 5. Semantic search
    print("\n── Semantic Search ──")
    search = client.memory.search("how to deploy")
    hits = search.get("memories", [])
    print(f"  Query: 'how to deploy' → {len(hits)} results")
    for hit in hits[:3]:
        print(f"    [{hit['type']}] {hit['content'][:60]}...")

    # 6. Platform status
    print("\n── Platform Status ──")
    status = client.status()
    print(f"  0G Configured: {status.get('configured')}")
    print(f"  Total Memories: {status.get('totalMemories', '?')}")

    client.close()
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
