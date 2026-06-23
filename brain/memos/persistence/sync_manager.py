"""Deterministic sync lifecycle manager for Memos persistence."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from brain.memos.models.sync_result import SyncResult, SyncStatus


class SyncManager:
    """Queue and run persistence syncs without background workers."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._syncs: dict[str, SyncResult] = {}
        self._sequence = 0

    def queue_sync(self, *, agent_id: str, sync_id: str | None = None, metadata: dict[str, Any] | None = None) -> SyncResult:
        """Queue one sync request."""

        now = self._normalized_now()
        with self._lock:
            resolved_id = sync_id or self._next_sync_id()
            if resolved_id in self._syncs:
                raise ValueError(f"sync id already exists: {resolved_id}")
            result = SyncResult(
                sync_id=resolved_id,
                agent_id=agent_id,
                status=SyncStatus.PENDING,
                metadata=metadata or {},
                started_at=now,
            )
            self._syncs[resolved_id] = result
            queued = result.clone()

        self._log("sync_queued", agent_id=agent_id, sync_id=queued.sync_id)
        return queued

    def run_sync(
        self,
        *,
        sync_id: str,
        saved_memories: list[str] | None = None,
        saved_dreams: list[str] | None = None,
        saved_modules: list[str] | None = None,
        saved_checkpoints: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Run a queued sync synchronously."""

        now = self._normalized_now()
        with self._lock:
            result = self._syncs.get(sync_id)
            if result is None:
                raise ValueError(f"sync is not queued: {sync_id}")
            if result.status == SyncStatus.CANCELLED:
                raise ValueError(f"sync is cancelled: {sync_id}")
            if result.status == SyncStatus.COMPLETED:
                raise ValueError(f"sync is already completed: {sync_id}")
            result.status = SyncStatus.RUNNING
            result.saved_memories = list(saved_memories or [])
            result.saved_dreams = list(saved_dreams or [])
            result.saved_modules = list(saved_modules or [])
            result.saved_checkpoints = list(saved_checkpoints or [])
            result.metadata.update(metadata or {})
            result.status = SyncStatus.COMPLETED
            result.completed_at = now
            completed = result.clone()

        self._log("sync_completed", agent_id=completed.agent_id, sync_id=completed.sync_id)
        return completed

    def get_status(self, sync_id: str) -> SyncResult | None:
        """Return sync status by id."""

        with self._lock:
            result = self._syncs.get(sync_id)
            return result.clone() if result else None

    def cancel_sync(self, sync_id: str) -> SyncResult:
        """Cancel a pending sync."""

        now = self._normalized_now()
        with self._lock:
            result = self._syncs.get(sync_id)
            if result is None:
                raise ValueError(f"sync is not queued: {sync_id}")
            if result.status == SyncStatus.COMPLETED:
                raise ValueError(f"sync is already completed: {sync_id}")
            result.status = SyncStatus.CANCELLED
            result.completed_at = now
            cancelled = result.clone()

        self._log("sync_cancelled", agent_id=cancelled.agent_id, sync_id=cancelled.sync_id)
        return cancelled

    def _next_sync_id(self) -> str:
        self._sequence += 1
        return f"sync_{self._sequence:012d}"

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
