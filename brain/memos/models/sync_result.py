"""Sync result model for Memos persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SyncStatus(StrEnum):
    """Persistence sync lifecycle states."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class SyncResult(BaseModel):
    """Result of one Memos persistence sync run."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    sync_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    saved_memories: list[str] = Field(default_factory=list)
    saved_dreams: list[str] = Field(default_factory=list)
    saved_modules: list[str] = Field(default_factory=list)
    saved_checkpoints: list[str] = Field(default_factory=list)
    status: SyncStatus = SyncStatus.PENDING
    metadata: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None

    @field_validator("sync_id", "agent_id")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("sync_id and agent_id must not be empty")
        return normalized

    @field_validator("saved_memories", "saved_dreams", "saved_modules", "saved_checkpoints")
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
    def _ensure_timezone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "SyncResult":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
