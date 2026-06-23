from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from brain.memos.dreams.dream_engine import DreamEngine
from brain.memos.dreams.dream_history import DreamHistory
from brain.memos.memory.memory_manager import MemoryManager
from brain.memos.models.dream_result import DreamResult
from brain.memos.models.memory import MemoryType


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


def create_engine() -> tuple[MemoryManager, DreamEngine]:
    clock = DeterministicClock()
    manager = MemoryManager(clock=clock)
    engine = DreamEngine(memory_manager=manager, clock=clock)
    return manager, engine


def test_tag_grouping_and_semantic_creation() -> None:
    manager, engine = create_engine()
    first = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="User studies Nvidia AI chips.", tags=["ai", "gpu"], importance=5)
    second = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="User researches GPU infrastructure.", tags=["gpu", "infrastructure"], importance=4)
    unrelated = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="User likes concise writing.", tags=["writing"], importance=3)

    groups = engine.group_related_memories(engine.collect_episodic_memories(agent_id="agent-1"))
    result = engine.dream(agent_id="agent-1")
    semantic = manager.retrieve(result.created_memory_ids[0], increment_access=False)

    assert [memory.id for memory in groups[0]] == [first.id, second.id]
    assert unrelated.id not in result.source_memory_ids
    assert semantic is not None
    assert semantic.type == MemoryType.SEMANTIC
    assert semantic.metadata["source"] == "dream"
    assert semantic.metadata["source_memory_ids"] == [first.id, second.id]
    assert "gpu" in semantic.tags


def test_keyword_grouping_without_shared_tags() -> None:
    manager, engine = create_engine()
    first = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="Nvidia GPUs power AI infrastructure.", tags=["nvidia"], importance=5)
    second = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="Modern GPUs support AI infrastructure workloads.", tags=["hardware"], importance=4)
    third = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="Billing emails should be concise.", tags=["writing"], importance=3)

    groups = engine.group_related_memories(engine.collect_episodic_memories(agent_id="agent-1"))

    assert [memory.id for memory in groups[0]] == [first.id, second.id]
    assert [memory.id for memory in groups[1]] == [third.id]


def test_importance_decay_and_history_creation() -> None:
    manager, engine = create_engine()
    first = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="User researches AI systems.", tags=["ai"], importance=5)
    second = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="User researches AI infrastructure.", tags=["ai"], importance=4)

    result = engine.dream(agent_id="agent-1", dream_id="dream-fixed")

    assert result.dream_id == "dream-fixed"
    assert engine.dream_history.get_dream("dream-fixed") == result
    assert [dream.dream_id for dream in engine.dream_history.list_dreams(agent_id="agent-1")] == ["dream-fixed"]
    assert manager.retrieve(first.id, increment_access=False).importance == 4.0
    assert manager.retrieve(second.id, increment_access=False).importance == 3.2
    assert result.metadata["decayed_memory_ids"] == [first.id, second.id]


def test_decay_never_reduces_below_minimum() -> None:
    manager, engine = create_engine()
    memory = manager.store(agent_id="agent-1", type=MemoryType.EPISODIC, content="Small memory.", tags=["small"], importance=0.1)

    updated = engine.decay_old_memories([memory])

    assert updated[0].importance == 0.1


def test_empty_state_handling() -> None:
    _, engine = create_engine()

    result = engine.dream(agent_id="agent-empty")

    assert result.source_memory_ids == []
    assert result.created_memory_ids == []
    assert result.metadata["created_semantic_memory"] is False
    assert "No episodic memories" in result.summary
    assert engine.dream_history.get_dream(result.dream_id) == result


def test_dream_history_duplicate_protection_and_delete() -> None:
    history = DreamHistory(clock=DeterministicClock())
    result = DreamResult(
        dream_id="dream-1",
        agent_id="agent-1",
        source_memory_ids=["mem-1"],
        created_memory_ids=["mem-2"],
        summary="Consolidated memory.",
    )

    recorded = history.record_dream(result)

    assert recorded == result
    with pytest.raises(ValueError, match="dream id already exists"):
        history.record_dream(result)
    assert history.delete_dream("dream-1") is True
    assert history.get_dream("dream-1") is None
    assert history.delete_dream("dream-1") is False
