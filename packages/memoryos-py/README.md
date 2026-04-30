# MemoryOS Python SDK

> The 0G-native operating system for autonomous AI agents.

## Installation

```bash
pip install memoryos
```

Or install from source:
```bash
cd packages/memoryos-py
pip install -e .
```

## Quick Start

```python
from memoryos import MemoryOS

# Connect to your MemoryOS server
client = MemoryOS(
    api_url="http://localhost:3000",
    agent_id="my_trading_bot",
)

# Register the agent identity on 0G
client.identity.register("Alpha Trading Bot")

# Save a memory (automatically stored on 0G Storage)
client.memory.save(
    "BTC dropped 8% after Fed announcement on April 15",
    type="episodic",
    tags=["market", "btc", "fed"],
    importance=5,
)

# Semantic search using 0G Compute embeddings
results = client.memory.search("bitcoin price movements")
for mem in results.get("memories", []):
    print(f"  [{mem['type']}] {mem['content']}")

# Take a full brain snapshot (stored as one 0G blob)
snapshot = client.snapshot.create()
print(f"Brain hash: {snapshot['snapshotHash']}")

# List all skills on the marketplace
skills = client.skills.list()
```

## Async Support

```python
import asyncio
from memoryos import MemoryOS

async def main():
    client = MemoryOS("http://localhost:3000", "my_agent")
    
    # All write methods have async variants
    await client.memory.async_save("learned something new", type="semantic")
    results = await client.memory.async_search("recent learnings")
    
    await client.aclose()

asyncio.run(main())
```

## Offline Resilience

If the MemoryOS server is temporarily unreachable, write operations are automatically buffered in an in-memory queue:

```python
client = MemoryOS("http://localhost:3000", "my_agent", offline_queue_size=1000)

# This won't crash even if the server is down — it buffers the write
client.memory.save("important data", type="semantic")

print(f"Pending writes: {client.offline_pending}")

# When server comes back, flush the queue
results = client.flush_offline_queue()
```

## API Reference

### `MemoryOS(api_url, agent_id, *, headers=None, timeout=30.0)`

| Method | Description |
|:-------|:------------|
| `client.memory.save(content, *, type, tags, importance)` | Save a memory to 0G |
| `client.memory.list(*, type, limit)` | List agent memories |
| `client.memory.search(query)` | Semantic search via 0G Compute |
| `client.memory.get(memory_id)` | Get a specific memory |
| `client.memory.delete(memory_id)` | Delete a memory |
| `client.skills.list()` | List marketplace skills |
| `client.skills.publish(skill)` | Publish a new skill |
| `client.skills.run(skill_id, input)` | Execute a skill |
| `client.identity.get()` | Get agent identity |
| `client.identity.register(name)` | Register on 0G |
| `client.snapshot.create()` | Snapshot agent brain to 0G |
| `client.snapshot.list()` | List brain snapshots |
| `client.status()` | Platform health check |

## License

MIT
