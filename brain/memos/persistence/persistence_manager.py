"""Single persistence entrypoint for Memos."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from brain.memos.models.dream_result import DreamResult
from brain.memos.models.memory import Memory
from brain.memos.models.module import Module
from brain.memos.models.sync_result import SyncResult
from brain.memos.persistence.restore_manager import RestoreManager
from brain.memos.persistence.sync_manager import SyncManager
from brain.memos.runtime.langgraph_checkpointer import CheckpointRecord


class PersistenceEvent(BaseModel):
    """Local persistence event emitted for future adapters."""

    model_config = ConfigDict(frozen=True)

    event_id: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    object_id: str = Field(..., min_length=1)
    object_type: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    emitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("emitted_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class PersistenceManager:
    """Emit persistence events and coordinate sync/restore hooks."""

    def __init__(
        self,
        *,
        sync_manager: SyncManager | None = None,
        restore_manager: RestoreManager | None = None,
        adapter_sink: Callable[[PersistenceEvent], None] | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.sync_manager = sync_manager or SyncManager(clock=self._clock, logger=self._logger)
        self.restore_manager = restore_manager or RestoreManager(logger=self._logger)
        self._adapter_sink = adapter_sink
        self._lock = RLock()
        self._events: dict[str, PersistenceEvent] = {}
        self._sequence = 0

    def save_memory(self, memory: Memory) -> PersistenceEvent:
        """Emit a memory persistence event."""

        return self._save(
            event_type="memory.save_requested",
            agent_id=memory.agent_id,
            object_id=memory.id,
            object_type="memory",
            payload=memory.model_dump(mode="json"),
        )

    def save_dream(self, dream: DreamResult) -> PersistenceEvent:
        """Emit a dream persistence event."""

        return self._save(
            event_type="dream.save_requested",
            agent_id=dream.agent_id,
            object_id=dream.dream_id,
            object_type="dream",
            payload=dream.model_dump(mode="json"),
        )

    def save_module(self, agent_id: str, module: Module) -> PersistenceEvent:
        """Emit a module persistence event."""

        return self._save(
            event_type="module.save_requested",
            agent_id=agent_id,
            object_id=module.module_id,
            object_type="module",
            payload=module.model_dump(mode="json"),
        )

    def save_checkpoint(self, checkpoint: CheckpointRecord) -> PersistenceEvent:
        """Emit a runtime checkpoint persistence event."""

        return self._save(
            event_type="checkpoint.save_requested",
            agent_id=checkpoint.agent_id,
            object_id=checkpoint.checkpoint_id,
            object_type="checkpoint",
            payload=checkpoint.model_dump(mode="json"),
        )

    def sync(self, *, agent_id: str, sync_id: str | None = None, metadata: dict[str, Any] | None = None) -> SyncResult:
        """Synchronously mark queued persistence events as synced."""

        queued = self.sync_manager.queue_sync(agent_id=agent_id, sync_id=sync_id, metadata=metadata)
        with self._lock:
            events = [event for event in self._events.values() if event.agent_id == agent_id]
            memories = self._ids_for(events, "memory")
            dreams = self._ids_for(events, "dream")
            modules = self._ids_for(events, "module")
            checkpoints = self._ids_for(events, "checkpoint")
        result = self.sync_manager.run_sync(
            sync_id=queued.sync_id,
            saved_memories=memories,
            saved_dreams=dreams,
            saved_modules=modules,
            saved_checkpoints=checkpoints,
            metadata={"event_count": len(events)},
        )
        self._log("persistence_synced", agent_id=agent_id, sync_id=result.sync_id)
        return result

    def restore(self, *, agent_id: str) -> dict[str, list[Any]]:
        """Restore all object categories through configured hooks."""

        restored = {
            "memories": self.restore_manager.restore_memories(agent_id),
            "dreams": self.restore_manager.restore_dreams(agent_id),
            "modules": self.restore_manager.restore_modules(agent_id),
            "checkpoints": self.restore_manager.restore_checkpoints(agent_id),
        }
        self._log("persistence_restored", agent_id=agent_id)
        return restored

    def list_events(self, *, agent_id: str | None = None, object_type: str | None = None) -> list[PersistenceEvent]:
        """List emitted persistence events in deterministic order."""

        with self._lock:
            events = [
                event
                for event in self._events.values()
                if (agent_id is None or event.agent_id == agent_id)
                and (object_type is None or event.object_type == object_type)
            ]
            events.sort(key=lambda event: event.event_id)
            return list(events)

    def _save(
        self,
        *,
        event_type: str,
        agent_id: str,
        object_id: str,
        object_type: str,
        payload: dict[str, Any],
    ) -> PersistenceEvent:
        now = self._normalized_now()
        with self._lock:
            event_id = self._next_event_id()
            if event_id in self._events:
                raise ValueError(f"persistence event id already exists: {event_id}")
            event = PersistenceEvent(
                event_id=event_id,
                event_type=event_type,
                agent_id=agent_id,
                object_id=object_id,
                object_type=object_type,
                payload=payload,
                emitted_at=now,
            )
            self._events[event_id] = event
        self._publish(event)
        self._log("persistence_event_emitted", agent_id=agent_id, event_id=event.event_id, object_type=object_type)
        return event

    def _publish(self, event: PersistenceEvent) -> None:
        if self._adapter_sink is None:
            return
        try:
            self._adapter_sink(event)
        except Exception:
            self._logger.exception(
                "persistence_adapter_sink_failed",
                extra={"event_id": event.event_id, "agent_id": event.agent_id, "object_type": event.object_type},
            )

    @staticmethod
    def _ids_for(events: list[PersistenceEvent], object_type: str) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for event in events:
            if event.object_type == object_type and event.object_id not in seen:
                seen.add(event.object_id)
                result.append(event.object_id)
        return result

    def _next_event_id(self) -> str:
        self._sequence += 1
        return f"persist_{self._sequence:012d}"

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
