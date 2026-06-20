from __future__ import annotations

from brain.memoryos.agent.agent import Agent
from brain.memoryos.agent.identity import Identity
from brain.memoryos.models.agent_profile import AgentProfile


def test_memoryos_brain_demo_journey() -> None:
    agent = Agent(
        profile=AgentProfile(
            agent_id="demo-agent-1",
            name="MemoryOS Demo Agent",
            description="Demonstrates Remember and Reason with citations.",
        ),
        identity=Identity(wallet_address="0xdemo", agent_id="demo-agent-1", signature="demo-signature", verified=True),
    )

    first = agent.remember(
        content="User prefers short, technical answers.",
        tags=["style", "technical"],
        importance=5,
    )
    second = agent.remember(
        content="User is building MemoryOS as a persistent brain for AI agents.",
        tags=["memoryos", "ai"],
        importance=5,
    )
    third = agent.remember(
        content="Every grounded answer should include citations.",
        tags=["citations"],
        importance=4,
    )
    agent.install_module(
        module_id="technical-summarizer",
        name="Technical Summarizer",
        description="Summarizes technical project context.",
        tags=["technical"],
        importance=3,
    )

    result = agent.reason(
        question="How should MemoryOS answer technical questions?",
        tags=["technical", "memoryos", "citations"],
    )

    assert result.answer
    assert result.execution_id == "reason_000000000001"
    assert result.citations
    assert {first.id, second.id, third.id}.issubset(set(result.used_memories))
    assert "technical-summarizer" in result.used_modules
    assert f"memory:{first.id}" in result.citations
    assert f"memory:{second.id}" in result.citations
    assert f"memory:{third.id}" in result.citations
    assert "module:technical-summarizer" in result.citations
    assert "Citations:" in result.answer
    assert result.metadata["provider"] == "local"
