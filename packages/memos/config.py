"""Configuration for the Memos Python SDK."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Environment(StrEnum):
    """Supported SDK environments."""

    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Config(BaseModel):
    """Runtime configuration for the Memos SDK."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    environment: Environment | str = Environment.DEVELOPMENT
    mock_mode: bool = True
    storage_enabled: bool = True
    compute_enabled: bool = True
    chain_enabled: bool = True

    @field_validator("environment")
    @classmethod
    def _normalize_environment(cls, value: Environment | str) -> Environment:
        if isinstance(value, Environment):
            return value
        clean = value.strip().lower()
        if not clean:
            raise ValueError("environment must not be empty")
        return Environment(clean)

    def clone(self) -> "Config":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
