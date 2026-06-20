"""Memory models for the MemoryOS Brain Remember layer."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MemoryType(StrEnum):
    """Supported MemoryOS memory types."""

    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    PROCEDURAL = "procedural"


class Memory(BaseModel):
    """A durable knowledge unit owned by a MemoryOS Agent."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    type: MemoryType
    content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)
    importance: float = Field(default=3.0, ge=0.1, le=5.0)
    access_count: int = Field(default=0, ge=0)
    embedding: list[float] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    storage_hash: str | None = None

    @field_validator("content")
    @classmethod
    def _normalize_content(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("content must not be empty")
        return normalized

    @field_validator("tags")
    @classmethod
    def _normalize_tags(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for tag in value:
            clean = tag.strip().lower()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @field_validator("created_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "Memory":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
