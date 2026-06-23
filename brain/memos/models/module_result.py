"""Module execution result model for Memos Grow."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ModuleResult(BaseModel):
    """Agent-scoped result for using an installed Module."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    execution_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    module_id: str = Field(..., min_length=1)
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: Any
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("execution_id", "agent_id", "module_id")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("execution_id, agent_id, and module_id must not be empty")
        return normalized

    @field_validator("created_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "ModuleResult":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
