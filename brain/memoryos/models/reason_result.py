"""Reason result model for MemoryOS Brain."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReasonResult(BaseModel):
    """Final response envelope produced by the Reason Engine."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    execution_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    citations: list[str] = Field(default_factory=list)
    used_memories: list[str] = Field(default_factory=list)
    used_modules: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("question", "answer")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("text fields must not be empty")
        return normalized

    @field_validator("citations", "used_memories", "used_modules")
    @classmethod
    def _deduplicate_strings(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for item in value:
            clean = item.strip()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @field_validator("citations")
    @classmethod
    def _validate_citations(cls, value: list[str]) -> list[str]:
        for citation in value:
            if not citation.startswith(("memory:", "module:")):
                raise ValueError("citations must use memory:{id} or module:{id} format")
        return value

    @field_validator("created_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "ReasonResult":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
