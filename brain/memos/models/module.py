"""Module model for Memos capabilities."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Module(BaseModel):
    """Atomic installable capability metadata."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    module_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = ""
    version: str = Field(default="0.1.0", min_length=1)
    author: str = ""
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("module_id", "name", "description", "version", "author")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("module_id", "name", "version")
    @classmethod
    def _require_text(cls, value: str) -> str:
        if not value:
            raise ValueError("module_id, name, and version must not be empty")
        return value

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

    @field_validator("created_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "Module":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
