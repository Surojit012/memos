# memos-py

Python SDK for [memos](https://memos.io) — persistent brain framework for AI agents.

## Installation
```bash
pip install memos-py
```

## Quick Start
```python
from memos import MemosClient

client = MemosClient(
    api_key="your_api_key",
    agent_id="your_agent_id"
)

# Store a memory
memory = client.store_memory(
    content="User prefers Python over JavaScript",
    type="semantic",
    importance=4
)

# Search memories
results = client.search("language preferences")
for r in results:
    print(f"{r.score:.2f} — {r.content}")

# Ask with memory context
response = client.query("What language does this user prefer?")
print(response.answer)

# Trigger dream consolidation
dream = client.trigger_dream()
print(f"Created {dream.new_memories_created} new memories")
```

## Authentication
Get your API key and agent ID from https://memos.io/dashboard

## Methods Reference

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `store_memory` | `content` (str), `type` (str="episodic"), `importance` (int=3), `tags` (list[str]=None) | `Memory` | Store a new memory for the agent |
| `list_memories` | None | `list[Memory]` | List all memories for the agent |
| `delete_memory` | `memory_id` (str) | `bool` | Delete a specific memory by ID |
| `search` | `query` (str), `search_type` (str="keyword"), `limit` (int=10) | `list[SearchResult]` | Search agent memories |
| `query` | `question` (str), `include_sources` (bool=True), `conversation_history` (list[dict]=None) | `RAGResponse` | Ask a question using RAG |
| `trigger_dream` | None | `DreamResult` | Trigger a dream consolidation cycle |
| `list_skills` | None | `list[Skill]` | List all available skills in the marketplace |
| `execute_skill` | `skill_id` (str), `input` (str) | `SkillResult` | Execute a skill |
| `run_pipeline` | `steps` (list[dict]), `input` (str) | `dict` | Run a multi-step pipeline |
| `get_identity` | None | `dict` | Get the agent's identity and reputation |

## Error Handling
```python
from memos import MemosError, AuthError, RateLimitError

try:
    client.store_memory("...")
except AuthError:
    print("Check your API key at memos.io/profile")
except RateLimitError:
    print("Rate limit hit — slow down requests")
except MemosError as e:
    print(f"API error {e.status_code}: {e.message}")
```

## Context Manager
```python
with Agent(api_key="...", agent_id="...") as client:
    client.store_memory("...")
# HTTP connection closed automatically
```

## Requirements
Python 3.8+
No additional dependencies beyond `httpx`.

## License
MIT
