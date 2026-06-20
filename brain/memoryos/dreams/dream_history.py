"""Dream history registry for MemoryOS Brain."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from brain.memoryos.models.dream_result import DreamResult


class DreamHistory:
    """Thread-safe local registry of Dream results."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._dreams: dict[str, DreamResult] = {}

    def record_dream(self, result: DreamResult) -> DreamResult:
        """Record a Dream result."""

        with self._lock:
            if result.dream_id in self._dreams:
                raise ValueError(f"dream id already exists: {result.dream_id}")
            self._dreams[result.dream_id] = result.clone()
            recorded = self._dreams[result.dream_id].clone()

        self._log("dream_recorded", agent_id=recorded.agent_id, dream_id=recorded.dream_id)
        return recorded

    def get_dream(self, dream_id: str) -> DreamResult | None:
        """Return one Dream result by id."""

        with self._lock:
            result = self._dreams.get(dream_id)
            return result.clone() if result else None

    def list_dreams(
        self,
        *,
        agent_id: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[DreamResult]:
        """List Dream results in deterministic newest-first order."""

        if offset < 0:
            raise ValueError("offset must be greater than or equal to 0")
        if limit is not None and limit < 1:
            return []

        with self._lock:
            dreams = [
                dream
                for dream in self._dreams.values()
                if agent_id is None or dream.agent_id == agent_id
            ]
            dreams.sort(key=lambda dream: (-dream.completed_at.timestamp(), dream.dream_id))
            sliced = dreams[offset : offset + limit if limit is not None else None]
            return [dream.clone() for dream in sliced]

    def delete_dream(self, dream_id: str) -> bool:
        """Delete one Dream history record."""

        with self._lock:
            result = self._dreams.pop(dream_id, None)
            if result is None:
                return False

        self._log("dream_deleted", agent_id=result.agent_id, dream_id=result.dream_id)
        return True

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
