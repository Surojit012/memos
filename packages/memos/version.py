"""Memos SDK version metadata."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Version(BaseModel):
    """Version metadata for the Memos SDK."""

    model_config = ConfigDict(frozen=True)

    package: str = Field(default="memos", min_length=1)
    version: str = Field(default="0.1.0", min_length=1)
    api: str = Field(default="v1", min_length=1)

    def __str__(self) -> str:
        return self.version


SDK_VERSION = Version()
