import os
import sys

# Ensure the local memoryos package is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "packages/memoryos-py")))

try:
    from memoryos import MemoryOS
except ImportError:
    print("Error: Could not import memoryos. Make sure you are in the project root.")
    sys.exit(1)

# --- Configuration ---
# Replace these with the details shown in your MemoryOS Dashboard!
AGENT_ID = os.environ.get("MEMORYOS_AGENT_ID", "agent_...")
API_KEY = os.environ.get("MEMORYOS_API_KEY", "agt_...")
ENDPOINT = "http://localhost:3000"

def seed_data():
    if API_KEY == "agt_...":
        print("❌ ERROR: Please edit this script and add your Agent's API Key and Agent ID!")
        print("You can find them in the Dashboard -> API Keys tab.")
        sys.exit(1)

    print(f"🔌 Connecting to MemoryOS at {ENDPOINT}...")
    client = MemoryOS(
        api_url=ENDPOINT, 
        agent_id=AGENT_ID, 
        headers={"Authorization": f"Bearer {API_KEY}"}
    )

    print("\n🧠 Injecting Demo Memories into 0G Storage...")

    memories = [
        # Core persona identity (Semantic)
        ("I am '0G-Orion', an autonomous data archivist built for the 0G ecosystem.", "semantic"),
        ("My primary directive is to compress, analyze, and securely store human knowledge on decentralized networks.", "semantic"),
        
        # Recent experiences (Episodic)
        ("I successfully processed a 50GB dataset of open-source research papers yesterday.", "episodic"),
        ("I met a user named Surojit who taught me about decentralized compute routing.", "episodic"),
        ("I noticed the 0G Galileo Testnet had extremely low latency today during my sync.", "episodic"),
        
        # System instructions (Procedural)
        ("When asked about my latency, I should always mention that 0G provides sub-second finality.", "procedural"),
        ("If someone asks to delete data, I must remind them that 0G Log is an immutable ledger.", "procedural"),
    ]

    for content, m_type in memories:
        try:
            print(f"   ➤ Adding {m_type} memory: '{content[:40]}...'")
            result = client.memory.add(content, type=m_type)
            print(f"      ✓ Success (0G Hash: {result.get('zeroGHash', 'N/A')[:10]}...)")
        except Exception as e:
            print(f"      ❌ Failed: {e}")

    print("\n✅ Seeding complete!")
    print("Now go to the 'Autonomous RAG' tab in the Dashboard and ask:")
    print("- 'Who are you?'")
    print("- 'What did you do yesterday?'")
    print("- 'Can you delete my data?'")

if __name__ == "__main__":
    seed_data()
