"""Execution context models for the Memos Runtime layer."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExecutionStatus(StrEnum):
    """Runtime execution states."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ExecutionContext(BaseModel):
    """Runtime-scoped execution state for a Memos Agent."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    execution_id: str = Field(..., min_length=1)
    thread_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    graph_id: str = Field(..., min_length=1)
    status: ExecutionStatus = ExecutionStatus.PENDING
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("started_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "ExecutionContext":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
