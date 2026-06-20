from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from brain.memoryos.memory.memory_manager import MemoryManager
from brain.memoryos.models.memory import MemoryType


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


@pytest.fixture
def manager() -> MemoryManager:
    return MemoryManager(clock=DeterministicClock())


def test_store_retrieve_update_list_and_delete(manager: MemoryManager) -> None:
    memory = manager.store(
        agent_id="agent-1",
        type=MemoryType.EPISODIC,
        content="User likes AI.",
        tags=["AI", "ai", "Preference"],
        importance=4,
        metadata={"source": "chat"},
    )

    assert memory.id == "mem_000000000001"
    assert memory.type == MemoryType.EPISODIC
    assert memory.tags == ["ai", "preference"]
    assert memory.access_count == 0

    retrieved = manager.retrieve(memory.id)
    assert retrieved is not None
    assert retrieved.access_count == 1

    incremented = manager.increment_access(memory.id)
    assert incremented is not None
    assert incremented.access_count == 2

    updated = manager.update_importance(memory.id, 5)
    assert updated is not None
    assert updated.importance == 5

    listed = manager.list_memories(agent_id="agent-1")
    assert [item.id for item in listed] == [memory.id]

    assert manager.delete(memory.id) is True
    assert manager.retrieve(memory.id) is None
    assert manager.delete(memory.id) is False
    assert manager.get_brain_state("agent-1").memory_count == 0

    events = [event.event_type for event in manager.drain_persistence_events()]
    assert events == [
        "memory.stored",
        "memory.accessed",
        "memory.accessed",
        "memory.importance_updated",
        "memory.deleted",
    ]


def test_keyword_search_tag_search_and_importance_scoring(manager: MemoryManager) -> None:
    low_importance_match = manager.store(
        agent_id="agent-1",
        type="episodic",
        content="User asked about crypto wallets.",
        tags=["wallet"],
        importance=2,
    )
    high_importance_match = manager.store(
        agent_id="agent-1",
        type="semantic",
        content="User repeatedly researches crypto and AI infrastructure.",
        tags=["research"],
        importance=5,
    )
    tag_match = manager.store(
        agent_id="agent-1",
        type="procedural",
        content="Always summarize dense technical articles.",
        tags=["technical-summary"],
        importance=3,
    )
    manager.store(
        agent_id="agent-1",
        content="Unrelated preference for short answers.",
        tags=["style"],
        importance=5,
    )

    keyword_results = manager.search(agent_id="agent-1", query="crypto")
    assert [item.id for item in keyword_results] == [high_importance_match.id, low_importance_match.id]

    tag_results = manager.search(agent_id="agent-1", tags=["technical-summary"])
    assert [item.id for item in tag_results] == [tag_match.id]

    all_results = manager.search(agent_id="agent-1")
    assert [item.importance for item in all_results] == [5, 5, 3, 2]


def test_duplicate_memory_handling(manager: MemoryManager) -> None:
    manager.store(agent_id="agent-1", content="First memory.", memory_id="fixed-memory")

    with pytest.raises(ValueError, match="memory id already exists"):
        manager.store(agent_id="agent-1", content="Duplicate memory.", memory_id="fixed-memory")


def test_empty_state_handling(manager: MemoryManager) -> None:
    assert manager.retrieve("missing") is None
    assert manager.increment_access("missing") is None
    assert manager.update_importance("missing", 4) is None
    assert manager.delete("missing") is False
    assert manager.search(agent_id="agent-1", query="anything") == []
    assert manager.list_memories(agent_id="agent-1") == []
    assert manager.list_memories(limit=0) == []
    assert manager.get_brain_state("agent-1").memory_count == 0


def test_list_memories_filters_and_pagination(manager: MemoryManager) -> None:
    first = manager.store(agent_id="agent-1", type="episodic", content="First.", importance=2)
    second = manager.store(agent_id="agent-1", type="semantic", content="Second.", importance=5)
    third = manager.store(agent_id="agent-2", type="semantic", content="Third.", importance=4)

    assert [item.id for item in manager.list_memories(agent_id="agent-1")] == [second.id, first.id]
    assert [item.id for item in manager.list_memories(type="semantic")] == [second.id, third.id]
    assert [item.id for item in manager.list_memories(limit=1, offset=1)] == [third.id]

    with pytest.raises(ValueError, match="offset"):
        manager.list_memories(offset=-1)


def test_concurrent_access_is_thread_safe() -> None:
    manager = MemoryManager(clock=DeterministicClock())

    def store_memory(index: int) -> str:
        return manager.store(agent_id="agent-1", content=f"Concurrent memory {index}.").id

    with ThreadPoolExecutor(max_workers=8) as executor:
        ids = list(executor.map(store_memory, range(40)))

    assert len(ids) == 40
    assert len(set(ids)) == 40
    assert manager.get_brain_state("agent-1").memory_count == 40

    with ThreadPoolExecutor(max_workers=8) as executor:
        access_counts = list(executor.map(lambda memory_id: manager.increment_access(memory_id), ids))

    assert all(memory is not None and memory.access_count == 1 for memory in access_counts)
    assert len(manager.list_memories(agent_id="agent-1")) == 40
