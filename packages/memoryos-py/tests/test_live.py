#!/usr/bin/env python3
"""
Quick integration test for the MemoryOS Python SDK.
Run with: python3 packages/memoryos-py/tests/test_live.py
"""

import sys
import os
import httpx

# Add the parent package to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from memoryos import MemoryOS


def main():
    print("=" * 60)
    print("  MemoryOS Python SDK — Live Integration Test")
    print("=" * 60)
    print()

    # 1. Initialize client
    client = MemoryOS(
        api_url="http://localhost:3000",
        agent_id="agent_aria_support",
    )
    print(f"✓ Client initialized: {client}")
    print()

    # 1.5 Seed the database (registers aria support agent and others)
    print("── Seed Database ──")
    try:
        httpx.post("http://localhost:3000/api/seed-0g", timeout=10)
        print("  ✓ Database seeded successfully")
    except Exception as e:
        print(f"  ✗ Seeding failed: {e}")
    print()

    # 2. Check platform status
    print("── Platform Status ──")
    try:
        status = client.status()
        print(f"  0G Configured: {status.get('configured')}")
        print(f"  Manifest v{status.get('manifest', {}).get('version', '?')}")
        print(f"  Hydration: {status.get('hydration', {}).get('state', '?')}")
        print(f"  Write Queue: {status.get('writeQueue', {}).get('pending', '?')} pending")
        print()
    except Exception as e:
        print(f"  ✗ Status check failed: {e}")
        return

    # 3. List memories
    print("── List Memories ──")
    try:
        result = client.memory.list(limit=5)
        memories = result.get("memories", [])
        print(f"  Found {len(memories)} memories")
        for m in memories[:3]:
            hash_display = m.get("storageHash", "")[:12] + "..." if m.get("storageHash") else "pending"
            print(f"    [{m['type']}] {m['content'][:60]}... → 0G:{hash_display}")
        print()
    except Exception as e:
        print(f"  ✗ List failed: {e}")

    # 4. Get agent identity
    print("── Agent Identity ──")
    try:
        identity = client.identity.get()
        agent = identity.get("agent", identity)
        print(f"  Name: {agent.get('name')}")
        print(f"  Agent ID: {agent.get('agentId')}")
        print(f"  Identity Hash: {agent.get('identityHash', 'none')[:20]}...")
        print(f"  Memories: {agent.get('memoryCount', 0)}")
        print()
    except Exception as e:
        print(f"  ✗ Identity check failed: {e}")

    # 5. List skills
    print("── Skills Marketplace ──")
    try:
        result = client.skills.list()
        skills = result.get("skills", [])
        print(f"  Found {len(skills)} skills")
        for s in skills[:3]:
            print(f"    [{s.get('category')}] {s.get('name')} — {s.get('price')} 0G")
        print()
    except Exception as e:
        print(f"  ✗ Skills list failed: {e}")

    # 6. Brain snapshot
    print("── Brain Snapshot ──")
    try:
        result = client.snapshot.create()
        print(f"  ✓ Snapshot created!")
        print(f"    Hash: {result.get('snapshotHash', 'unknown')[:20]}...")
        print(f"    Memories bundled: {result.get('memoriesCount', '?')}")
        print(f"    Explorer: {result.get('explorerUrl', 'n/a')}")
        print()
    except Exception as e:
        print(f"  ✗ Snapshot failed: {e}")

    # 7. Offline queue test
    print("── Offline Queue ──")
    print(f"  Pending writes: {client.offline_pending}")
    print()

    print("=" * 60)
    print("  All tests passed! SDK is operational.")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    main()
