"""Episodic memories: short-term experiences owned by an Agent."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from brain.memoryos.models.memory import Memory, MemoryType


class EpisodicMemory(Memory):
    """Short-term experience memory.

    Examples:
    - User likes AI.
    - User asked about crypto.
    """

    type: Literal[MemoryType.EPISODIC] = MemoryType.EPISODIC

    @classmethod
    def create(
        cls,
        *,
        id: str,
        agent_id: str,
        content: str,
        tags: list[str] | None = None,
        importance: float = 3.0,
        embedding: list[float] | None = None,
        metadata: dict[str, Any] | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        storage_hash: str | None = None,
    ) -> "EpisodicMemory":
        """Create an episodic memory."""

        data: dict[str, Any] = {
            "id": id,
            "agent_id": agent_id,
            "content": content,
            "tags": tags or [],
            "importance": importance,
            "embedding": embedding,
            "metadata": metadata or {},
            "storage_hash": storage_hash,
        }
        if created_at is not None:
            data["created_at"] = created_at
        if updated_at is not None:
            data["updated_at"] = updated_at
        return cls(**data)
