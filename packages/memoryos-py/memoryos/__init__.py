"""
MemoryOS Python SDK
~~~~~~~~~~~~~~~~~~~

The 0G-native operating system for autonomous AI agents.

Quick Start:
    >>> from memoryos import MemoryOS
    >>>
    >>> client = MemoryOS("http://localhost:3000", "my_agent_id")
    >>> client.memory.save("User prefers dark mode", type="semantic")
    >>> memories = client.memory.list(limit=5)
    >>> results = client.memory.search("user preferences")

Async Usage:
    >>> import asyncio
    >>> from memoryos import MemoryOS
    >>>
    >>> async def main():
    ...     client = MemoryOS("http://localhost:3000", "my_agent_id")
    ...     result = await client.memory.async_save("async memory")
    ...     await client.aclose()
    >>>
    >>> asyncio.run(main())
"""

__version__ = "0.1.0"

from .client import MemoryOSClient
from .types import (
    AgentIdentity,
    Memory,
    MemorySaveOptions,
    MemoryType,
    Skill,
    SkillPublishInput,
)

# Convenience alias — `from memoryos import MemoryOS`
MemoryOS = MemoryOSClient

__all__ = [
    "MemoryOS",
    "MemoryOSClient",
    "Memory",
    "MemoryType",
    "MemorySaveOptions",
    "Skill",
    "SkillPublishInput",
    "AgentIdentity",
]
