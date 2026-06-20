"""Agent profile model for MemoryOS."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AgentProfile(BaseModel):
    """Human-readable profile for a MemoryOS Agent."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    agent_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("agent_id", "name", "description")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("agent_id", "name")
    @classmethod
    def _require_text(cls, value: str) -> str:
        if not value:
            raise ValueError("agent_id and name must not be empty")
        return value

    @field_validator("created_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "AgentProfile":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
