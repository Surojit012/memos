"""Reasoning context assembly for Memos Reason."""

from __future__ import annotations

from copy import deepcopy
import logging
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from brain.memos.reason.retriever import RankedResult


class ReasoningContext(BaseModel):
    """Bounded context used for provider invocation."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    question: str = Field(..., min_length=1)
    memories: list[RankedResult] = Field(default_factory=list)
    modules: list[RankedResult] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("question")
    @classmethod
    def _normalize_question(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("question must not be empty")
        return normalized

    def clone(self) -> "ReasoningContext":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)


class ContextBuilder:
    """Build deterministic provider context from ranked Reason sources."""

    def __init__(
        self,
        *,
        max_memories: int = 20,
        max_modules: int = 10,
        logger: logging.Logger | None = None,
    ) -> None:
        if max_memories < 0:
            raise ValueError("max_memories must be greater than or equal to 0")
        if max_modules < 0:
            raise ValueError("max_modules must be greater than or equal to 0")
        self.max_memories = max_memories
        self.max_modules = max_modules
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()

    def build_context(
        self,
        *,
        question: str,
        memories: list[RankedResult],
        modules: list[RankedResult],
        metadata: dict[str, Any] | None = None,
    ) -> ReasoningContext:
        """Build a bounded reasoning context."""

        with self._lock:
            context = ReasoningContext(
                question=question,
                memories=[memory.clone() for memory in memories],
                modules=[module.clone() for module in modules],
                metadata=deepcopy(metadata or {}),
            )
            context = self.truncate_context(context)
            result = self.attach_metadata(
                context,
                {
                    "memory_count": len(context.memories),
                    "module_count": len(context.modules),
                },
            )

        self._log("context_built", memory_count=len(result.memories), module_count=len(result.modules))
        return result

    def truncate_context(self, context: ReasoningContext) -> ReasoningContext:
        """Apply Memos Reason context limits."""

        truncated = context.clone()
        truncated.memories = truncated.memories[: self.max_memories]
        truncated.modules = truncated.modules[: self.max_modules]
        return truncated

    def attach_metadata(self, context: ReasoningContext, metadata: dict[str, Any]) -> ReasoningContext:
        """Attach metadata without mutating caller-owned context."""

        updated = context.clone()
        merged = deepcopy(updated.metadata)
        merged.update(deepcopy(metadata))
        updated.metadata = merged
        return updated

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
