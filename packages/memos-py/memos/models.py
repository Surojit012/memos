"""memos-py data models using Python dataclasses."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Memory:
    """Represents a stored memory."""

    id: str
    agent_id: str
    content: str
    type: str
    importance: int
    tags: List[str] = field(default_factory=list)
    created_at: Optional[str] = None
    access_count: int = 0
    decay_score: float = 1.0


@dataclass
class SearchResult:
    """A single search result."""

    id: str
    content: str
    type: str
    importance: int
    score: float
    tags: List[str] = field(default_factory=list)


@dataclass
class RAGResponse:
    """Response from a RAG (retrieval-augmented generation) query."""

    answer: str
    sources: List[dict]  # type: ignore[type-arg]
    confidence: float


@dataclass
class Skill:
    """A skill available in the marketplace."""

    id: str
    name: str
    description: str
    category: str
    price: float
    publisher: str


@dataclass
class SkillResult:
    """Result of executing a skill."""

    skill_id: str
    result: str
    tokens_used: int
    model: str = ""
    compute_provider: str = ""


@dataclass
class DreamResult:
    """Result of a dream consolidation cycle."""

    memories_analyzed: int
    patterns_found: int
    new_memories_created: int
    dream_summary: str
    new_memories: List[dict]  # type: ignore[type-arg]
    duration: int
