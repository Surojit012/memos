from __future__ import annotations

from brain.memos.agent.agent import Agent
from brain.memos.agent.identity import Identity
from brain.memos.dreams.dream_engine import DreamEngine
from brain.memos.models.agent_profile import AgentProfile
from brain.memos.models.memory import MemoryType


def test_persistent_brain_demo_research_topics() -> None:
    agent = Agent(
        profile=AgentProfile(agent_id="persistent-brain-demo", name="Persistent Brain Demo"),
        identity=Identity(wallet_address="0xpersistent", agent_id="persistent-brain-demo", signature="sig", verified=True),
    )
    agent.remember(content="Research Nvidia earnings and GPU roadmap.", type=MemoryType.EPISODIC, tags=["nvidia", "gpu"], importance=5)
    agent.remember(content="Research GPUs used for AI model training.", type=MemoryType.EPISODIC, tags=["gpu", "ai"], importance=4)
    agent.remember(content="Research AI infrastructure for large model deployment.", type=MemoryType.EPISODIC, tags=["ai", "infrastructure"], importance=5)
    agent.remember(content="Research Nvidia data center GPUs for AI infrastructure.", type=MemoryType.EPISODIC, tags=["nvidia", "ai", "infrastructure"], importance=5)
    dream_engine = DreamEngine(memory_manager=agent.memory_manager)

    dream = dream_engine.dream(agent_id=agent.profile.agent_id)
    result = agent.reason(question="What topics do I consistently research?", tags=["ai", "infrastructure"])
    semantic_memories = agent.list_memories(type=MemoryType.SEMANTIC)

    assert semantic_memories
    assert dream.created_memory_ids[0] in [memory.id for memory in semantic_memories]
    assert result.answer
    assert "AI infrastructure" in result.answer or "ai infrastructure" in result.answer
    assert result.citations
    assert any(citation.startswith("memory:") for citation in result.citations)
    assert any(memory_id in result.used_memories for memory_id in dream.created_memory_ids)
