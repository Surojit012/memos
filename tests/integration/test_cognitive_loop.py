from __future__ import annotations

from brain.memoryos.agent.agent import Agent
from brain.memoryos.agent.identity import Identity
from brain.memoryos.dreams.dream_engine import DreamEngine
from brain.memoryos.models.agent_profile import AgentProfile
from brain.memoryos.models.memory import MemoryType


def test_complete_cognitive_loop_remember_dream_reason() -> None:
    agent = Agent(
        profile=AgentProfile(agent_id="agent-loop-1", name="Loop Agent"),
        identity=Identity(wallet_address="0xloop", agent_id="agent-loop-1", signature="sig", verified=True),
    )
    memories = [
        agent.remember(content="User researches Nvidia GPUs for AI infrastructure.", type=MemoryType.EPISODIC, tags=["nvidia", "gpu", "ai"], importance=5),
        agent.remember(content="User studies GPU clusters for AI infrastructure.", type=MemoryType.EPISODIC, tags=["gpu", "infrastructure"], importance=4),
        agent.remember(content="User compares Nvidia chips for model training.", type=MemoryType.EPISODIC, tags=["nvidia", "training"], importance=4),
        agent.remember(content="User tracks AI infrastructure market trends.", type=MemoryType.EPISODIC, tags=["ai", "infrastructure"], importance=5),
        agent.remember(content="User prefers concise research summaries.", type=MemoryType.EPISODIC, tags=["summary"], importance=3),
    ]
    dream_engine = DreamEngine(memory_manager=agent.memory_manager)

    dream = dream_engine.dream(agent_id=agent.profile.agent_id)
    result = agent.reason(question="What should I remember about AI infrastructure research?", tags=["ai", "infrastructure"])
    semantic_memories = agent.list_memories(type=MemoryType.SEMANTIC)

    assert semantic_memories
    assert dream.created_memory_ids[0] in [memory.id for memory in semantic_memories]
    assert all(agent.get_memory(memory.id, increment_access=False).importance < memory.importance for memory in memories if memory.id in dream.source_memory_ids)
    assert result.answer
    assert result.execution_id
    assert result.citations
    assert any(citation.startswith("memory:") for citation in result.citations)
    assert any(memory_id in result.used_memories for memory_id in dream.created_memory_ids)
