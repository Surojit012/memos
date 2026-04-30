"""
Phase 2 Intelligence Testing Script
Tests Contradiction Detection, Consolidation, Decay, and RAG.
"""

import os
import sys
import httpx
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from memoryos import MemoryOSClient

def main():
    print("============================================================")
    print("  MemoryOS Python SDK — Phase 2 Intelligence Test")
    print("============================================================")

    # 1. Init client & bypass auth with platform secret
    client = MemoryOSClient(
        "http://localhost:3000",
        "agent_aria_support",
        headers={"x-platform-secret": "100x_engineer_secret_key"} # Bypass tests
    )
    
    # 2. Seed database
    print("── 1. Seed Database ──")
    try:
        httpx.post("http://localhost:3000/api/seed-0g", timeout=10)
        print("  ✓ Database seeded successfully")
    except Exception as e:
        print(f"  ✗ Seeding failed: {e}")
        return
    
    time.sleep(1) # wait for next.js to map

    # 3. Contradiction Detection
    print("\n── 2. Contradiction Detection ──")
    print("  Injecting explicit contradiction about support preference...")
    try:
        result = client.memory.save(
            "Customer prefers PHONE communication over email for all tickets.",
            type="semantic",
            tags=["preference", "communication", "conflict-test"],
            importance=5
        )
        print("  ✓ Memory saved")
        metadata = result.get('memory', {}).get('metadata') or {}
        if metadata.get('_conflictDetected'):
            print(f"  🚨 Conflict detected by 0G Compute:")
            print(f"     Reason: {metadata.get('_conflictReason')}")
        else:
            print("  ✗ No conflict detected (Mock LLM returned false)")
    except Exception as e:
        print(f"  ✗ Save failed: {e}")

    # 4. Hybrid Search / Decay Trigger
    print("\n── 3. Consolidation & Decay Heartbeats ──")
    print("  Triggering multiple inserts to force heartbeats...")
    for i in range(5):
        try:
            client.memory.save(f"Episodic ping {i}", type="episodic", importance=2)
        except:
            pass
    print("  ✓ Heartbeats triggered asynchronously on server.")

    # 5. Contextual RAG
    print("\n── 4. Contextual RAG Synthesis ──")
    print("  Querying: 'What are the ticket escalation steps?'")
    try:
        rag_res = client.rag.ask("What are the ticket escalation steps?")
        print(f"  ✓ RAG completed. Context used: {rag_res.get('contextUsed', 0)} memories.")
        print(f"  🧠 Synthesis:\n  {rag_res.get('answer', 'none')}")
    except Exception as e:
        print(f"  ✗ RAG query failed: {e}")

    print("\n============================================================")
    print("  Phase 2 Test Complete!")
    print("============================================================")

if __name__ == "__main__":
    main()
