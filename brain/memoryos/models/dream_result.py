"""Dream result model for MemoryOS Brain."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DreamResult(BaseModel):
    """Result of one deterministic memory consolidation run."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    dream_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    source_memory_ids: list[str] = Field(default_factory=list)
    created_memory_ids: list[str] = Field(default_factory=list)
    summary: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("dream_id", "agent_id", "summary")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("text fields must not be empty")
        return normalized

    @field_validator("source_memory_ids", "created_memory_ids")
    @classmethod
    def _deduplicate_ids(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for item in value:
            clean = item.strip()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @field_validator("started_at", "completed_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "DreamResult":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
