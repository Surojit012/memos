from __future__ import annotations

from brain.memoryos.memory.memory_manager import MemoryManager
from brain.memoryos.reason.citation_manager import CitationManager
from brain.memoryos.reason.context_builder import ContextBuilder
from brain.memoryos.reason.reason_engine import ReasonEngine
from brain.memoryos.reason.retriever import Retriever


def build_memories() -> list:
    manager = MemoryManager()
    low = manager.store(
        agent_id="agent-1",
        content="User asked about crypto wallets.",
        tags=["wallet"],
        importance=2,
    )
    high = manager.store(
        agent_id="agent-1",
        content="User repeatedly researches crypto and AI infrastructure.",
        tags=["research"],
        importance=5,
    )
    tagged = manager.store(
        agent_id="agent-1",
        content="User prefers concise technical summaries.",
        tags=["summary"],
        importance=4,
    )
    return [low, high, tagged]


def test_reason_engine_retrieves_and_ranks_memories() -> None:
    memories = build_memories()
    retriever = Retriever()

    results = retriever.retrieve_memories(agent_id="agent-1", question="crypto infrastructure", memories=memories)

    assert [result.source_id for result in results[:2]] == [memories[1].id, memories[0].id]
    assert results[0].score > results[1].score
    assert results[0].metadata["keyword_score"] > 0
    assert results[0].metadata["importance_score"] == 5


def test_reason_engine_generates_citations() -> None:
    memories = build_memories()
    modules = [
        {
            "module_id": "summarizer",
            "name": "Technical Summarizer",
            "description": "Summarizes technical content.",
            "tags": ["summary"],
            "importance": 4,
        }
    ]
    engine = ReasonEngine()

    result = engine.reason(
        agent_id="agent-1",
        question="How should I summarize technical AI content?",
        memories=memories,
        modules=modules,
        tags=["summary"],
    )

    assert result.answer
    assert result.execution_id == "reason_000000000001"
    assert f"memory:{memories[2].id}" in result.citations
    assert "module:summarizer" in result.citations
    assert "Citations:" in result.answer


def test_context_builder_truncates_context() -> None:
    memories = build_memories()
    retriever = Retriever()
    ranked_memories = retriever.retrieve_memories(agent_id="agent-1", question="user", memories=memories, limit=20)
    ranked_modules = retriever.retrieve_modules(
        agent_id="agent-1",
        question="module",
        modules=[
            {"module_id": f"module-{index}", "description": "module capability", "importance": index}
            for index in range(12)
        ],
        limit=12,
    )
    builder = ContextBuilder(max_memories=2, max_modules=3)

    context = builder.build_context(
        question="What context should be used?",
        memories=ranked_memories,
        modules=ranked_modules,
    )

    assert len(context.memories) == 2
    assert len(context.modules) == 3
    assert context.metadata["memory_count"] == 2
    assert context.metadata["module_count"] == 3


def test_empty_context_handling_is_deterministic() -> None:
    engine = ReasonEngine()

    result = engine.reason(agent_id="agent-1", question="What do we know?", memories=[], modules=[])

    assert result.answer
    assert result.citations == []
    assert result.used_memories == []
    assert result.used_modules == []
    assert "No cited MemoryOS sources" in result.answer
    assert result.metadata["provider"] == "local"


def test_module_retrieval_and_citation_formatting() -> None:
    retriever = Retriever()
    citation_manager = CitationManager()
    modules = [
        {
            "module_id": "summarizer",
            "name": "Technical Summarizer",
            "description": "Summarizes AI articles.",
            "tags": ["summary"],
            "importance": 4,
        },
        {
            "module_id": "classifier",
            "name": "Ticket Classifier",
            "description": "Classifies support tickets.",
            "tags": ["support"],
            "importance": 5,
        },
    ]

    results = retriever.retrieve_modules(
        agent_id="agent-1",
        question="summarize AI articles",
        modules=modules,
        tags=["summary"],
    )
    citations = citation_manager.create_citations(memories=[], modules=results)

    assert [result.source_id for result in results] == ["summarizer"]
    assert citations == ["module:summarizer"]
    assert citation_manager.format_citations(citations) == "module:summarizer"
