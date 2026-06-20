from __future__ import annotations

import pytest

from brain.memoryos.agent.agent import Agent
from brain.memoryos.agent.identity import Identity
from brain.memoryos.memory.memory_manager import MemoryManager
from brain.memoryos.models.agent_profile import AgentProfile


def create_agent(*, agent_id: str = "agent-1", memory_manager: MemoryManager | None = None) -> Agent:
    return Agent(
        profile=AgentProfile(agent_id=agent_id, name="Research Agent", description="Persistent research brain"),
        identity=Identity(wallet_address="0xabc", agent_id=agent_id, signature="sig", verified=True),
        memory_manager=memory_manager,
    )


def test_agent_core_remember_reason_list_and_get_memory() -> None:
    agent = create_agent()

    memory = agent.remember(
        content="User prefers concise technical summaries about AI systems.",
        tags=["ai", "summary"],
        importance=5,
    )
    result = agent.reason(question="How should I answer AI summary questions?", tags=["summary"])

    assert result.answer
    assert result.execution_id
    assert memory.id in result.used_memories
    assert f"memory:{memory.id}" in result.citations
    assert [item.id for item in agent.list_memories()] == [memory.id]
    assert agent.get_memory(memory.id).access_count == 1
    assert agent.brain_state.memory_count == 1
    assert agent.brain_state.last_reasoned_at == result.created_at


def test_agent_core_install_and_list_modules() -> None:
    agent = create_agent()

    first = agent.install_module(
        module_id="summarizer",
        name="Technical Summarizer",
        description="Summarizes technical articles.",
        tags=["summary"],
        importance=4,
    )
    second = agent.install_module(
        module_id="classifier",
        name="Ticket Classifier",
        description="Classifies support tickets.",
        tags=["support"],
        importance=2,
    )

    assert first["module_id"] == "summarizer"
    assert second["module_id"] == "classifier"
    assert [module["module_id"] for module in agent.list_modules()] == ["classifier", "summarizer"]
    assert agent.brain_state.installed_modules == ["classifier", "summarizer"]


def test_agent_core_duplicate_protection() -> None:
    agent = create_agent()

    agent.remember(content="Stable memory.", memory_id="memory-fixed")
    with pytest.raises(ValueError, match="memory id already exists"):
        agent.remember(content="Duplicate memory.", memory_id="memory-fixed")

    agent.install_module(module_id="summarizer", description="First install.")
    with pytest.raises(ValueError, match="module id already installed"):
        agent.install_module(module_id="summarizer", description="Duplicate install.")


def test_agent_core_does_not_return_foreign_memory() -> None:
    shared_memory = MemoryManager()
    agent = create_agent(memory_manager=shared_memory)
    foreign = shared_memory.store(agent_id="agent-2", content="Foreign memory.")

    assert agent.get_memory(foreign.id) is None
    assert shared_memory.retrieve(foreign.id, increment_access=False).access_count == 0


def test_agent_core_profile_and_module_copies_are_isolated() -> None:
    agent = create_agent()
    agent.install_module(module_id="summarizer", metadata={"nested": {"enabled": True}})

    profile = agent.get_profile()
    modules = agent.list_modules()
    profile.name = "Changed"
    modules[0]["metadata"]["nested"]["enabled"] = False

    assert agent.get_profile().name == "Research Agent"
    assert agent.list_modules()[0]["metadata"]["nested"]["enabled"] is True
