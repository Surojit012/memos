"""Thread management for the MemoryOS Runtime layer."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from brain.memoryos.runtime.execution_context import ExecutionStatus


class RuntimeThread(BaseModel):
    """Runtime thread record owned by MemoryOS."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    thread_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    status: ExecutionStatus = ExecutionStatus.PENDING
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("created_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "RuntimeThread":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)


class ThreadManager:
    """Thread-safe registry for runtime thread state."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._threads: dict[str, RuntimeThread] = {}
        self._sequence = 0

    def create_thread(
        self,
        *,
        agent_id: str,
        thread_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> RuntimeThread:
        """Create a runtime thread for an Agent."""

        now = self._normalized_now()
        with self._lock:
            resolved_id = thread_id or self._next_thread_id()
            if resolved_id in self._threads:
                raise ValueError(f"thread id already exists: {resolved_id}")

            thread = RuntimeThread(
                thread_id=resolved_id,
                agent_id=agent_id,
                status=ExecutionStatus.PENDING,
                metadata=metadata or {},
                created_at=now,
                updated_at=now,
            )
            self._threads[resolved_id] = thread
            result = thread.clone()

        self._log("thread_created", agent_id=agent_id, thread_id=result.thread_id)
        return result

    def get_thread(self, thread_id: str) -> RuntimeThread | None:
        """Return a runtime thread by id."""

        with self._lock:
            thread = self._threads.get(thread_id)
            return thread.clone() if thread else None

    def list_threads(
        self,
        *,
        agent_id: str | None = None,
        status: ExecutionStatus | str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[RuntimeThread]:
        """List threads in deterministic order."""

        if offset < 0:
            raise ValueError("offset must be greater than or equal to 0")
        if limit is not None and limit < 1:
            return []

        resolved_status = self._coerce_status(status) if status is not None else None

        with self._lock:
            threads = [
                thread
                for thread in self._threads.values()
                if (agent_id is None or thread.agent_id == agent_id)
                and (resolved_status is None or thread.status == resolved_status)
            ]
            threads.sort(key=lambda thread: (-thread.updated_at.timestamp(), thread.thread_id))
            sliced = threads[offset : offset + limit if limit is not None else None]
            return [thread.clone() for thread in sliced]

    def update_status(self, thread_id: str, status: ExecutionStatus | str) -> RuntimeThread | None:
        """Update a thread status."""

        now = self._normalized_now()
        resolved_status = self._coerce_status(status)

        with self._lock:
            thread = self._threads.get(thread_id)
            if thread is None:
                return None

            thread.status = resolved_status
            thread.updated_at = now
            result = thread.clone()

        self._log(
            "thread_status_updated",
            agent_id=result.agent_id,
            thread_id=result.thread_id,
            status=result.status.value,
        )
        return result

    def delete_thread(self, thread_id: str) -> bool:
        """Delete a runtime thread."""

        with self._lock:
            thread = self._threads.pop(thread_id, None)
            if thread is None:
                return False

        self._log("thread_deleted", agent_id=thread.agent_id, thread_id=thread.thread_id)
        return True

    def _next_thread_id(self) -> str:
        self._sequence += 1
        return f"thread_{self._sequence:012d}"

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _coerce_status(value: ExecutionStatus | str) -> ExecutionStatus:
        if isinstance(value, ExecutionStatus):
            return value
        try:
            return ExecutionStatus(value)
        except ValueError as exc:
            raise ValueError(f"unsupported execution status: {value}") from exc

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
