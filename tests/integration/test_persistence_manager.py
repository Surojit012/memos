from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from brain.memos.dreams.dream_engine import DreamEngine
from brain.memos.memory.memory_manager import MemoryManager
from brain.memos.models.module import Module
from brain.memos.models.sync_result import SyncStatus
from brain.memos.persistence.persistence_manager import PersistenceManager
from brain.memos.persistence.restore_manager import RestoreManager
from brain.memos.persistence.sync_manager import SyncManager
from brain.memos.runtime.langgraph_checkpointer import LangGraphCheckpointer


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


def test_memory_dream_module_and_checkpoint_persistence() -> None:
    clock = DeterministicClock()
    memory_manager = MemoryManager(clock=clock)
    memory = memory_manager.store(agent_id="agent-1", content="User researches AI infrastructure.", tags=["ai"])
    dream = DreamEngine(memory_manager=memory_manager, clock=clock).dream(agent_id="agent-1")
    module = Module(module_id="research-module", name="Research Module", tags=["research"])
    checkpoint = LangGraphCheckpointer(clock=clock).save_checkpoint(
        agent_id="agent-1",
        thread_id="thread-1",
        execution_id="execution-1",
        payload={"step": "paused"},
    )
    emitted = []
    manager = PersistenceManager(clock=clock, adapter_sink=emitted.append)

    memory_event = manager.save_memory(memory)
    dream_event = manager.save_dream(dream)
    module_event = manager.save_module("agent-1", module)
    checkpoint_event = manager.save_checkpoint(checkpoint)

    assert [event.event_id for event in [memory_event, dream_event, module_event, checkpoint_event]] == [
        "persist_000000000001",
        "persist_000000000002",
        "persist_000000000003",
        "persist_000000000004",
    ]
    assert [event.object_type for event in emitted] == ["memory", "dream", "module", "checkpoint"]
    assert manager.list_events(agent_id="agent-1", object_type="memory")[0].object_id == memory.id


def test_sync_lifecycle_and_duplicate_protection() -> None:
    clock = DeterministicClock()
    memory = MemoryManager(clock=clock).store(agent_id="agent-1", content="Persistent memory.")
    manager = PersistenceManager(clock=clock)
    manager.save_memory(memory)

    result = manager.sync(agent_id="agent-1", sync_id="sync-fixed", metadata={"source": "test"})

    assert result.sync_id == "sync-fixed"
    assert result.status == SyncStatus.COMPLETED
    assert result.saved_memories == [memory.id]
    assert result.saved_dreams == []
    assert result.saved_modules == []
    assert result.saved_checkpoints == []
    assert result.metadata["event_count"] == 1

    with pytest.raises(ValueError, match="sync id already exists"):
        manager.sync_manager.queue_sync(agent_id="agent-1", sync_id="sync-fixed")
    with pytest.raises(ValueError, match="already completed"):
        manager.sync_manager.run_sync(sync_id="sync-fixed")


def test_sync_cancel_and_empty_state_handling() -> None:
    manager = PersistenceManager(clock=DeterministicClock())

    queued = manager.sync_manager.queue_sync(agent_id="agent-1")
    cancelled = manager.sync_manager.cancel_sync(queued.sync_id)
    empty_sync = manager.sync(agent_id="agent-empty")

    assert cancelled.status == SyncStatus.CANCELLED
    assert manager.sync_manager.get_status(queued.sync_id).status == SyncStatus.CANCELLED
    assert empty_sync.saved_memories == []
    assert empty_sync.saved_dreams == []
    assert empty_sync.saved_modules == []
    assert empty_sync.saved_checkpoints == []
    with pytest.raises(ValueError, match="is cancelled"):
        manager.sync_manager.run_sync(sync_id=queued.sync_id)
    with pytest.raises(ValueError, match="is not queued"):
        manager.sync_manager.cancel_sync("missing")


def test_restore_lifecycle_with_hooks() -> None:
    restore_manager = RestoreManager(
        memory_source=lambda agent_id: [{"agent_id": agent_id, "id": "mem-1"}],
        dream_source=lambda agent_id: [{"agent_id": agent_id, "dream_id": "dream-1"}],
        module_source=lambda agent_id: [{"agent_id": agent_id, "module_id": "module-1"}],
        checkpoint_source=lambda agent_id: [{"agent_id": agent_id, "checkpoint_id": "checkpoint-1"}],
    )
    manager = PersistenceManager(restore_manager=restore_manager)

    restored = manager.restore(agent_id="agent-1")

    assert restored["memories"] == [{"agent_id": "agent-1", "id": "mem-1"}]
    assert restored["dreams"] == [{"agent_id": "agent-1", "dream_id": "dream-1"}]
    assert restored["modules"] == [{"agent_id": "agent-1", "module_id": "module-1"}]
    assert restored["checkpoints"] == [{"agent_id": "agent-1", "checkpoint_id": "checkpoint-1"}]


def test_restore_empty_state_handling() -> None:
    manager = PersistenceManager()

    assert manager.restore(agent_id="agent-empty") == {
        "memories": [],
        "dreams": [],
        "modules": [],
        "checkpoints": [],
    }
    assert manager.list_events(agent_id="agent-empty") == []


def test_sync_manager_duplicate_cancel_and_status() -> None:
    manager = SyncManager(clock=DeterministicClock())
    queued = manager.queue_sync(agent_id="agent-1", sync_id="sync-1")

    assert queued.status == SyncStatus.PENDING
    assert manager.get_status("sync-1").status == SyncStatus.PENDING
    with pytest.raises(ValueError, match="sync id already exists"):
        manager.queue_sync(agent_id="agent-1", sync_id="sync-1")
    cancelled = manager.cancel_sync("sync-1")
    assert cancelled.status == SyncStatus.CANCELLED
