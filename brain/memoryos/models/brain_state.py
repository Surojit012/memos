"""Brain state model for MemoryOS agents."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BrainState(BaseModel):
    """Mutable state summary for an Agent's MemoryOS Brain."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    agent_id: str = Field(..., min_length=1)
    memory_count: int = Field(default=0, ge=0)
    dream_count: int = Field(default=0, ge=0)
    installed_modules: list[str] = Field(default_factory=list)
    last_reasoned_at: datetime | None = None
    last_dreamed_at: datetime | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("installed_modules")
    @classmethod
    def _normalize_installed_modules(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for module_id in value:
            clean = module_id.strip()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @field_validator("last_reasoned_at", "last_dreamed_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "BrainState":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
