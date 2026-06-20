"""Identity model for MemoryOS Agents."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Identity(BaseModel):
    """Wallet-bound Agent identity data."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    wallet_address: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    signature: str = ""
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("wallet_address", "agent_id", "signature")
    @classmethod
    def _normalize_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("wallet_address", "agent_id")
    @classmethod
    def _require_text(cls, value: str) -> str:
        if not value:
            raise ValueError("wallet_address and agent_id must not be empty")
        return value

    @field_validator("created_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "Identity":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)
