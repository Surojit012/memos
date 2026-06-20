"""LangGraph checkpoint registry for the MemoryOS Runtime layer."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CheckpointPersistenceEvent(BaseModel):
    """Checkpoint mutation event for future persistence adapters."""

    model_config = ConfigDict(frozen=True)

    event_type: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    thread_id: str = Field(..., min_length=1)
    checkpoint_id: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    emitted_at: datetime


class CheckpointRecord(BaseModel):
    """Runtime checkpoint record owned by MemoryOS."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    checkpoint_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    thread_id: str = Field(..., min_length=1)
    execution_id: str | None = None
    version: int = Field(default=1, ge=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    storage_hash: str | None = None

    @field_validator("created_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "CheckpointRecord":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)


class LangGraphCheckpointer:
    """Thread-safe checkpoint registry with persistence event hooks."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        event_sink: Callable[[CheckpointPersistenceEvent], None] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._event_sink = event_sink
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._checkpoints: dict[str, CheckpointRecord] = {}
        self._events: list[CheckpointPersistenceEvent] = []
        self._sequence = 0

    def save_checkpoint(
        self,
        *,
        agent_id: str,
        thread_id: str,
        payload: dict[str, Any],
        execution_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        version: int = 1,
        storage_hash: str | None = None,
        checkpoint_id: str | None = None,
    ) -> CheckpointRecord:
        """Save checkpoint state and emit a persistence event."""

        now = self._normalized_now()
        with self._lock:
            resolved_id = checkpoint_id or self._next_checkpoint_id()
            if resolved_id in self._checkpoints:
                raise ValueError(f"checkpoint id already exists: {resolved_id}")

            checkpoint = CheckpointRecord(
                checkpoint_id=resolved_id,
                agent_id=agent_id,
                thread_id=thread_id,
                execution_id=execution_id,
                version=version,
                payload=payload,
                metadata=metadata or {},
                created_at=now,
                updated_at=now,
                storage_hash=storage_hash,
            )
            self._checkpoints[resolved_id] = checkpoint
            result = checkpoint.clone()
            event = self._make_event(
                event_type="checkpoint.saved",
                agent_id=agent_id,
                thread_id=thread_id,
                checkpoint_id=resolved_id,
                emitted_at=now,
                payload={"execution_id": execution_id, "version": version},
            )
            self._events.append(event)

        self._publish_event(event)
        self._log("checkpoint_saved", agent_id=agent_id, thread_id=thread_id, checkpoint_id=result.checkpoint_id)
        return result

    def load_checkpoint(self, checkpoint_id: str) -> CheckpointRecord | None:
        """Load checkpoint state by id."""

        with self._lock:
            checkpoint = self._checkpoints.get(checkpoint_id)
            return checkpoint.clone() if checkpoint else None

    def list_checkpoints(
        self,
        *,
        agent_id: str | None = None,
        thread_id: str | None = None,
        execution_id: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[CheckpointRecord]:
        """List checkpoints in deterministic newest-first order."""

        if offset < 0:
            raise ValueError("offset must be greater than or equal to 0")
        if limit is not None and limit < 1:
            return []

        with self._lock:
            checkpoints = [
                checkpoint
                for checkpoint in self._checkpoints.values()
                if (agent_id is None or checkpoint.agent_id == agent_id)
                and (thread_id is None or checkpoint.thread_id == thread_id)
                and (execution_id is None or checkpoint.execution_id == execution_id)
            ]
            checkpoints.sort(key=lambda checkpoint: (-checkpoint.updated_at.timestamp(), checkpoint.checkpoint_id))
            sliced = checkpoints[offset : offset + limit if limit is not None else None]
            return [checkpoint.clone() for checkpoint in sliced]

    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint and emit a persistence event."""

        now = self._normalized_now()
        with self._lock:
            checkpoint = self._checkpoints.pop(checkpoint_id, None)
            if checkpoint is None:
                return False

            event = self._make_event(
                event_type="checkpoint.deleted",
                agent_id=checkpoint.agent_id,
                thread_id=checkpoint.thread_id,
                checkpoint_id=checkpoint.checkpoint_id,
                emitted_at=now,
            )
            self._events.append(event)

        self._publish_event(event)
        self._log(
            "checkpoint_deleted",
            agent_id=checkpoint.agent_id,
            thread_id=checkpoint.thread_id,
            checkpoint_id=checkpoint.checkpoint_id,
        )
        return True

    def drain_persistence_events(self) -> list[CheckpointPersistenceEvent]:
        """Return and clear emitted checkpoint persistence events."""

        with self._lock:
            events = list(self._events)
            self._events.clear()
            return events

    def peek_persistence_events(self) -> list[CheckpointPersistenceEvent]:
        """Return emitted checkpoint persistence events without clearing them."""

        with self._lock:
            return list(self._events)

    def _next_checkpoint_id(self) -> str:
        self._sequence += 1
        return f"checkpoint_{self._sequence:012d}"

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    def _make_event(
        self,
        *,
        event_type: str,
        agent_id: str,
        thread_id: str,
        checkpoint_id: str,
        emitted_at: datetime,
        payload: dict[str, Any] | None = None,
    ) -> CheckpointPersistenceEvent:
        return CheckpointPersistenceEvent(
            event_type=event_type,
            agent_id=agent_id,
            thread_id=thread_id,
            checkpoint_id=checkpoint_id,
            payload=payload or {},
            emitted_at=emitted_at,
        )

    def _publish_event(self, event: CheckpointPersistenceEvent) -> None:
        if self._event_sink is None:
            return

        try:
            self._event_sink(event)
        except Exception:
            self._logger.exception(
                "checkpoint_event_sink_failed",
                extra={
                    "event_type": event.event_type,
                    "agent_id": event.agent_id,
                    "thread_id": event.thread_id,
                    "checkpoint_id": event.checkpoint_id,
                },
            )

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
