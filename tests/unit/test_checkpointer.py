from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from brain.memoryos.runtime.langgraph_checkpointer import LangGraphCheckpointer


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


@pytest.fixture
def checkpointer() -> LangGraphCheckpointer:
    return LangGraphCheckpointer(clock=DeterministicClock())


def test_save_load_list_delete_checkpoint(checkpointer: LangGraphCheckpointer) -> None:
    checkpoint = checkpointer.save_checkpoint(
        agent_id="agent-1",
        thread_id="thread-1",
        execution_id="execution-1",
        payload={"step": 1},
        metadata={"source": "unit"},
    )

    assert checkpoint.checkpoint_id == "checkpoint_000000000001"
    assert checkpoint.payload == {"step": 1}

    loaded = checkpointer.load_checkpoint(checkpoint.checkpoint_id)
    assert loaded == checkpoint

    loaded.payload["step"] = 99
    assert checkpointer.load_checkpoint(checkpoint.checkpoint_id).payload == {"step": 1}

    assert [item.checkpoint_id for item in checkpointer.list_checkpoints(agent_id="agent-1")] == [
        checkpoint.checkpoint_id
    ]
    assert checkpointer.delete_checkpoint(checkpoint.checkpoint_id) is True
    assert checkpointer.load_checkpoint(checkpoint.checkpoint_id) is None
    assert checkpointer.delete_checkpoint(checkpoint.checkpoint_id) is False

    assert [event.event_type for event in checkpointer.drain_persistence_events()] == [
        "checkpoint.saved",
        "checkpoint.deleted",
    ]


def test_duplicate_checkpoint_id_and_empty_state(checkpointer: LangGraphCheckpointer) -> None:
    checkpointer.save_checkpoint(
        agent_id="agent-1",
        thread_id="thread-1",
        payload={"step": 1},
        checkpoint_id="checkpoint-fixed",
    )

    with pytest.raises(ValueError, match="checkpoint id already exists"):
        checkpointer.save_checkpoint(
            agent_id="agent-1",
            thread_id="thread-1",
            payload={"step": 2},
            checkpoint_id="checkpoint-fixed",
        )

    assert checkpointer.load_checkpoint("missing") is None
    assert checkpointer.delete_checkpoint("missing") is False
    assert checkpointer.list_checkpoints(agent_id="missing") == []
    assert checkpointer.list_checkpoints(limit=0) == []

    with pytest.raises(ValueError, match="offset"):
        checkpointer.list_checkpoints(offset=-1)


def test_list_checkpoints_filters_and_ordering(checkpointer: LangGraphCheckpointer) -> None:
    first = checkpointer.save_checkpoint(agent_id="agent-1", thread_id="thread-1", payload={"step": 1})
    second = checkpointer.save_checkpoint(agent_id="agent-1", thread_id="thread-1", payload={"step": 2})
    third = checkpointer.save_checkpoint(agent_id="agent-1", thread_id="thread-2", payload={"step": 3})

    assert [item.checkpoint_id for item in checkpointer.list_checkpoints(thread_id="thread-1")] == [
        second.checkpoint_id,
        first.checkpoint_id,
    ]
    assert [item.checkpoint_id for item in checkpointer.list_checkpoints(limit=1, offset=1)] == [
        second.checkpoint_id
    ]
    assert [item.checkpoint_id for item in checkpointer.list_checkpoints(thread_id="thread-2")] == [
        third.checkpoint_id
    ]


def test_concurrent_checkpoint_saves_are_thread_safe() -> None:
    checkpointer = LangGraphCheckpointer(clock=DeterministicClock())

    def save_checkpoint(index: int) -> str:
        return checkpointer.save_checkpoint(
            agent_id="agent-1",
            thread_id=f"thread-{index % 3}",
            payload={"step": index},
        ).checkpoint_id

    with ThreadPoolExecutor(max_workers=8) as executor:
        ids = list(executor.map(save_checkpoint, range(40)))

    assert len(ids) == 40
    assert len(set(ids)) == 40
    assert len(checkpointer.list_checkpoints(agent_id="agent-1")) == 40
    assert len(checkpointer.peek_persistence_events()) == 40
