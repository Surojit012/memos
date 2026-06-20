"""Module manifest model for MemoryOS capabilities."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ModuleManifest(BaseModel):
    """manifest.yaml-compatible Module execution manifest."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    module_id: str = Field(..., min_length=1)
    entrypoint: str = Field(..., min_length=1)
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)
    price: float = Field(default=0.0, ge=0.0)
    permissions: list[str] = Field(default_factory=list)

    @field_validator("module_id", "entrypoint")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("module_id and entrypoint must not be empty")
        return normalized

    @field_validator("permissions")
    @classmethod
    def _normalize_permissions(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for permission in value:
            clean = permission.strip().lower()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    def clone(self) -> "ModuleManifest":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
