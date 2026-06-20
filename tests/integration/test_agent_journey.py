from __future__ import annotations

import json
from pathlib import Path

from brain.memoryos.memory.memory_manager import MemoryManager
from brain.memoryos.models.memory import MemoryType
from brain.memoryos.runtime.execution_context import ExecutionStatus
from brain.memoryos.runtime.graph_builder import GraphBuilder
from brain.memoryos.runtime.langgraph_checkpointer import LangGraphCheckpointer
from brain.memoryos.runtime.langgraph_runtime import LangGraphRuntime
from brain.memoryos.runtime.thread_manager import ThreadManager


def load_fixture() -> dict:
    fixture_path = Path(__file__).parents[1] / "fixtures" / "agent_journey.json"
    return json.loads(fixture_path.read_text(encoding="utf-8"))


def test_agent_journey_remember_thread_checkpoint_resume_execution() -> None:
    fixture = load_fixture()
    memory_manager = MemoryManager()
    graph_builder = GraphBuilder()
    thread_manager = ThreadManager()
    checkpointer = LangGraphCheckpointer()
    runtime = LangGraphRuntime(
        graph_builder=graph_builder,
        thread_manager=thread_manager,
        checkpointer=checkpointer,
    )

    graph_builder.register_graph(graph_id=fixture["graph_id"], graph={"kind": "state-registry-only"})

    memory = memory_manager.store(
        agent_id=fixture["agent_id"],
        type=MemoryType.EPISODIC,
        content=fixture["memory_content"],
        tags=fixture["memory_tags"],
        importance=4,
    )
    assert memory_manager.retrieve(memory.id, increment_access=False) == memory

    thread = thread_manager.create_thread(agent_id=fixture["agent_id"])
    execution = runtime.start(
        agent_id=fixture["agent_id"],
        graph_id=fixture["graph_id"],
        thread_id=thread.thread_id,
    )
    assert execution.status == ExecutionStatus.RUNNING

    paused = runtime.pause(execution.execution_id)
    assert paused is not None
    assert paused.status == ExecutionStatus.PAUSED

    checkpoint = checkpointer.save_checkpoint(
        agent_id=fixture["agent_id"],
        thread_id=thread.thread_id,
        execution_id=execution.execution_id,
        payload=fixture["checkpoint_payload"],
        metadata={"memory_id": memory.id},
    )
    assert checkpointer.load_checkpoint(checkpoint.checkpoint_id).payload == fixture["checkpoint_payload"]

    resumed = runtime.resume(execution.execution_id, metadata={"checkpoint_id": checkpoint.checkpoint_id})
    assert resumed is not None
    assert resumed.status == ExecutionStatus.RUNNING
    assert resumed.metadata["checkpoint_id"] == checkpoint.checkpoint_id

    completed = runtime.stop(execution.execution_id)
    assert completed is not None
    assert completed.status == ExecutionStatus.COMPLETED

    assert memory_manager.search(agent_id=fixture["agent_id"], query="technical summaries")[0].id == memory.id
    assert thread_manager.get_thread(thread.thread_id).status == ExecutionStatus.COMPLETED
    assert [item.checkpoint_id for item in checkpointer.list_checkpoints(thread_id=thread.thread_id)] == [
        checkpoint.checkpoint_id
    ]
    assert [event.event_type for event in memory_manager.peek_persistence_events()] == ["memory.stored"]
    assert [event.event_type for event in checkpointer.peek_persistence_events()] == ["checkpoint.saved"]
