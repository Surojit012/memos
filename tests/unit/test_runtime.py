from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from brain.memos.runtime.execution_context import ExecutionStatus
from brain.memos.runtime.graph_builder import GraphBuilder
from brain.memos.runtime.langgraph_runtime import LangGraphRuntime


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


@pytest.fixture
def graph_builder() -> GraphBuilder:
    builder = GraphBuilder(clock=DeterministicClock())
    builder.register_graph(graph_id="graph-1", graph={"nodes": ["input", "output"]})
    return builder


@pytest.fixture
def runtime(graph_builder: GraphBuilder) -> LangGraphRuntime:
    return LangGraphRuntime(graph_builder=graph_builder, clock=DeterministicClock())


def test_graph_registry_register_get_list_and_remove() -> None:
    builder = GraphBuilder(clock=DeterministicClock())
    graph = {"nodes": ["input"]}
    registered = builder.register_graph(graph_id="graph-a", graph=graph, metadata={"name": "A"})

    assert registered.graph_id == "graph-a"
    assert builder.get_graph("graph-a").graph is graph
    assert [item.graph_id for item in builder.list_graphs()] == ["graph-a"]

    replacement = {"nodes": ["input", "output"]}
    replaced = builder.register_graph(graph_id="graph-a", graph=replacement, replace=True)
    assert replaced.graph is replacement

    assert builder.remove_graph("graph-a") is True
    assert builder.get_graph("graph-a") is None
    assert builder.remove_graph("graph-a") is False


def test_graph_registry_duplicate_and_empty_state() -> None:
    builder = GraphBuilder(clock=DeterministicClock())
    builder.register_graph(graph_id="graph-a", graph={})

    with pytest.raises(ValueError, match="graph id already exists"):
        builder.register_graph(graph_id="graph-a", graph={})

    assert builder.get_graph("missing") is None
    assert builder.list_graphs(limit=0) == []

    with pytest.raises(ValueError, match="offset"):
        builder.list_graphs(offset=-1)


def test_runtime_start_pause_resume_stop(runtime: LangGraphRuntime) -> None:
    execution = runtime.start(agent_id="agent-1", graph_id="graph-1", metadata={"request": "unit"})

    assert execution.execution_id == "execution_000000000001"
    assert execution.status == ExecutionStatus.RUNNING
    assert runtime.thread_manager.get_thread(execution.thread_id).status == ExecutionStatus.RUNNING

    paused = runtime.pause(execution.execution_id)
    assert paused is not None
    assert paused.status == ExecutionStatus.PAUSED

    resumed = runtime.resume(execution.execution_id, metadata={"resumed": True})
    assert resumed is not None
    assert resumed.status == ExecutionStatus.RUNNING
    assert resumed.metadata["resumed"] is True

    stopped = runtime.stop(execution.execution_id)
    assert stopped is not None
    assert stopped.status == ExecutionStatus.COMPLETED
    assert runtime.get_execution(execution.execution_id).status == ExecutionStatus.COMPLETED


def test_runtime_failed_stop(runtime: LangGraphRuntime) -> None:
    execution = runtime.start(agent_id="agent-1", graph_id="graph-1")
    failed = runtime.stop(execution.execution_id, failed=True, metadata={"error": "boom"})

    assert failed is not None
    assert failed.status == ExecutionStatus.FAILED
    assert failed.metadata["error"] == "boom"


def test_runtime_invalid_states_and_duplicate_ids(runtime: LangGraphRuntime) -> None:
    with pytest.raises(ValueError, match="graph is not registered"):
        runtime.start(agent_id="agent-1", graph_id="missing")

    execution = runtime.start(agent_id="agent-1", graph_id="graph-1", execution_id="execution-fixed")

    with pytest.raises(ValueError, match="execution id already exists"):
        runtime.start(agent_id="agent-1", graph_id="graph-1", execution_id="execution-fixed")

    with pytest.raises(ValueError, match="cannot transition"):
        runtime.resume(execution.execution_id)

    assert runtime.pause("missing") is None
    assert runtime.resume("missing") is None
    assert runtime.stop("missing") is None
    assert runtime.get_execution("missing") is None

    runtime.stop(execution.execution_id)
    with pytest.raises(ValueError, match="cannot transition"):
        runtime.pause(execution.execution_id)


def test_runtime_rejects_missing_or_foreign_threads(runtime: LangGraphRuntime) -> None:
    foreign_thread = runtime.thread_manager.create_thread(agent_id="agent-2")

    with pytest.raises(ValueError, match="thread does not belong to agent"):
        runtime.start(agent_id="agent-1", graph_id="graph-1", thread_id=foreign_thread.thread_id)

    with pytest.raises(ValueError, match="thread is not registered"):
        runtime.start(agent_id="agent-1", graph_id="graph-1", thread_id="missing")


def test_concurrent_runtime_starts_are_thread_safe(graph_builder: GraphBuilder) -> None:
    runtime = LangGraphRuntime(graph_builder=graph_builder, clock=DeterministicClock())

    def start_execution(index: int) -> str:
        return runtime.start(agent_id=f"agent-{index % 4}", graph_id="graph-1").execution_id

    with ThreadPoolExecutor(max_workers=8) as executor:
        ids = list(executor.map(start_execution, range(40)))

    assert len(ids) == 40
    assert len(set(ids)) == 40
    assert all(runtime.get_execution(execution_id) is not None for execution_id in ids)
