from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from brain.memos.runtime.execution_context import ExecutionStatus
from brain.memos.runtime.thread_manager import ThreadManager


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


@pytest.fixture
def manager() -> ThreadManager:
    return ThreadManager(clock=DeterministicClock())


def test_create_get_update_list_and_delete_thread(manager: ThreadManager) -> None:
    thread = manager.create_thread(agent_id="agent-1", metadata={"source": "unit"})

    assert thread.thread_id == "thread_000000000001"
    assert thread.status == ExecutionStatus.PENDING
    assert manager.get_thread(thread.thread_id) == thread

    updated = manager.update_status(thread.thread_id, ExecutionStatus.RUNNING)
    assert updated is not None
    assert updated.status == ExecutionStatus.RUNNING

    assert [item.thread_id for item in manager.list_threads(agent_id="agent-1")] == [thread.thread_id]
    assert [item.thread_id for item in manager.list_threads(status="RUNNING")] == [thread.thread_id]

    assert manager.delete_thread(thread.thread_id) is True
    assert manager.get_thread(thread.thread_id) is None
    assert manager.delete_thread(thread.thread_id) is False


def test_duplicate_thread_id_and_invalid_status(manager: ThreadManager) -> None:
    manager.create_thread(agent_id="agent-1", thread_id="thread-fixed")

    with pytest.raises(ValueError, match="thread id already exists"):
        manager.create_thread(agent_id="agent-1", thread_id="thread-fixed")

    with pytest.raises(ValueError, match="unsupported execution status"):
        manager.update_status("thread-fixed", "UNKNOWN")


def test_empty_state_handling(manager: ThreadManager) -> None:
    assert manager.get_thread("missing") is None
    assert manager.update_status("missing", ExecutionStatus.RUNNING) is None
    assert manager.delete_thread("missing") is False
    assert manager.list_threads() == []
    assert manager.list_threads(limit=0) == []

    with pytest.raises(ValueError, match="offset"):
        manager.list_threads(offset=-1)


def test_concurrent_thread_creation_is_thread_safe() -> None:
    manager = ThreadManager(clock=DeterministicClock())

    def create_thread(index: int) -> str:
        return manager.create_thread(agent_id=f"agent-{index % 4}").thread_id

    with ThreadPoolExecutor(max_workers=8) as executor:
        ids = list(executor.map(create_thread, range(40)))

    assert len(ids) == 40
    assert len(set(ids)) == 40
    assert len(manager.list_threads()) == 40
