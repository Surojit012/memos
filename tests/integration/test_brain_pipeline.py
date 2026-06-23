from __future__ import annotations

from brain.memos.agent.agent import Agent
from brain.memos.agent.identity import Identity
from brain.memos.models.agent_profile import AgentProfile


def test_brain_pipeline_remember_retrieve_reason_cite_answer() -> None:
    agent = Agent(
        profile=AgentProfile(agent_id="agent-brain-1", name="Brain QA Agent"),
        identity=Identity(wallet_address="0xbrain", agent_id="agent-brain-1", signature="sig", verified=True),
    )

    first = agent.remember(
        content="User prefers concise technical summaries.",
        tags=["summary"],
        importance=5,
    )
    second = agent.remember(
        content="User researches AI-native framework architecture.",
        tags=["ai", "architecture"],
        importance=4,
    )
    third = agent.remember(
        content="User wants every response grounded in citations.",
        tags=["citations"],
        importance=5,
    )

    memories = agent.list_memories()
    result = agent.reason(
        question="How should the agent answer AI architecture summary questions with citations?",
        tags=["summary", "ai", "citations"],
    )

    assert result.answer
    assert result.execution_id
    assert result.citations
    assert first.id in [memory.id for memory in memories]
    assert second.id in [memory.id for memory in memories]
    assert third.id in [memory.id for memory in memories]
    assert first.id in result.used_memories
    assert second.id in result.used_memories
    assert third.id in result.used_memories
    assert f"memory:{first.id}" in result.citations
    assert f"memory:{second.id}" in result.citations
    assert f"memory:{third.id}" in result.citations
    assert "Citations:" in result.answer
    assert result.metadata["provider"] == "local"
    assert agent.brain_state.memory_count == 3
    assert agent.brain_state.last_reasoned_at == result.created_at
