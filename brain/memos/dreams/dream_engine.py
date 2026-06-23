"""Dream Engine for Memos memory consolidation."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime, timezone
import logging
import re
from threading import RLock
from typing import Any

from brain.memos.dreams.dream_history import DreamHistory
from brain.memos.memory.memory_manager import MemoryManager
from brain.memos.models.dream_result import DreamResult
from brain.memos.models.memory import Memory, MemoryType


class DreamEngine:
    """Consolidate episodic memories into semantic knowledge."""

    def __init__(
        self,
        *,
        memory_manager: MemoryManager,
        dream_history: DreamHistory | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.memory_manager = memory_manager
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.dream_history = dream_history or DreamHistory(clock=self._clock, logger=self._logger)
        self._lock = RLock()
        self._sequence = 0
        self._min_importance = 0.1
        self._decay_factor = 0.8
        self._excluded_keywords = {
            "a",
            "an",
            "and",
            "are",
            "as",
            "at",
            "be",
            "by",
            "for",
            "from",
            "in",
            "is",
            "of",
            "on",
            "or",
            "that",
            "the",
            "to",
            "user",
            "with",
        }

    def collect_episodic_memories(self, *, agent_id: str, limit: int | None = None) -> list[Memory]:
        """Collect episodic memories for an Agent."""

        memories = self.memory_manager.list_memories(agent_id=agent_id, type=MemoryType.EPISODIC, limit=limit)
        memories.sort(key=lambda memory: (-memory.importance, memory.created_at.timestamp(), memory.id))
        self._log("episodic_memories_collected", agent_id=agent_id, count=len(memories))
        return memories

    def group_related_memories(self, memories: Iterable[Memory]) -> list[list[Memory]]:
        """Group memories by shared tags and keyword overlap."""

        ordered = list(memories)
        groups: list[list[Memory]] = []
        assigned: set[str] = set()
        for memory in ordered:
            if memory.id in assigned:
                continue
            group = [memory]
            assigned.add(memory.id)
            for candidate in ordered:
                if candidate.id in assigned:
                    continue
                if self._related(memory, candidate):
                    group.append(candidate)
                    assigned.add(candidate.id)
            group.sort(key=lambda item: (-item.importance, item.created_at.timestamp(), item.id))
            groups.append(group)

        groups.sort(key=lambda group: (-len(group), -sum(memory.importance for memory in group), group[0].id if group else ""))
        return groups

    def extract_patterns(self, memories: Iterable[Memory]) -> dict[str, Any]:
        """Extract deterministic tags, keywords, and evidence snippets."""

        ordered = list(memories)
        tags = self._common_tags(ordered)
        keywords = self._common_keywords(ordered)
        snippets = [self._normalize_sentence(memory.content) for memory in ordered]
        return {
            "tags": tags,
            "keywords": keywords,
            "snippets": snippets,
            "memory_count": len(ordered),
        }

    def create_semantic_memory(
        self,
        *,
        agent_id: str,
        summary: str,
        source_memories: list[Memory],
        patterns: dict[str, Any],
    ) -> Memory:
        """Create one semantic memory from consolidated episodic memories."""

        source_ids = [memory.id for memory in source_memories]
        tags = self._merge_tags(patterns.get("tags", []), ["dream", "consolidated"])
        importance = min(5.0, max(1.0, sum(memory.importance for memory in source_memories) / max(1, len(source_memories))))
        return self.memory_manager.store(
            agent_id=agent_id,
            type=MemoryType.SEMANTIC,
            content=summary,
            tags=tags,
            importance=importance,
            metadata={
                "source": "dream",
                "source_memory_ids": source_ids,
                "keywords": list(patterns.get("keywords", [])),
            },
        )

    def decay_old_memories(self, memories: Iterable[Memory]) -> list[Memory]:
        """Reduce consumed episodic memory importance using Dream decay rules."""

        updated: list[Memory] = []
        for memory in memories:
            decayed = max(self._min_importance, round(memory.importance * self._decay_factor, 4))
            result = self.memory_manager.update_importance(memory.id, decayed)
            if result is not None:
                updated.append(result)
        return updated

    def dream(self, *, agent_id: str, limit: int | None = None, dream_id: str | None = None) -> DreamResult:
        """Run deterministic memory consolidation for one Agent."""

        started_at = self._normalized_now()
        with self._lock:
            resolved_dream_id = dream_id or self._next_dream_id()

        episodic_memories = self.collect_episodic_memories(agent_id=agent_id, limit=limit)
        if not episodic_memories:
            completed_at = self._normalized_now()
            result = DreamResult(
                dream_id=resolved_dream_id,
                agent_id=agent_id,
                source_memory_ids=[],
                created_memory_ids=[],
                summary="No episodic memories available for consolidation.",
                metadata={"memory_count": 0, "created_semantic_memory": False},
                started_at=started_at,
                completed_at=completed_at,
            )
            return self.dream_history.record_dream(result)

        groups = self.group_related_memories(episodic_memories)
        selected_group = groups[0] if groups else episodic_memories
        patterns = self.extract_patterns(selected_group)
        summary = self._summarize(patterns)
        semantic_memory = self.create_semantic_memory(
            agent_id=agent_id,
            summary=summary,
            source_memories=selected_group,
            patterns=patterns,
        )
        decayed_memories = self.decay_old_memories(selected_group)
        completed_at = self._normalized_now()
        result = DreamResult(
            dream_id=resolved_dream_id,
            agent_id=agent_id,
            source_memory_ids=[memory.id for memory in selected_group],
            created_memory_ids=[semantic_memory.id],
            summary=summary,
            metadata={
                "memory_count": len(selected_group),
                "group_count": len(groups),
                "tags": patterns["tags"],
                "keywords": patterns["keywords"],
                "decayed_memory_ids": [memory.id for memory in decayed_memories],
                "created_semantic_memory": True,
            },
            started_at=started_at,
            completed_at=completed_at,
        )
        recorded = self.dream_history.record_dream(result)
        self._log("dream_completed", agent_id=agent_id, dream_id=recorded.dream_id, memory_count=len(selected_group))
        return recorded

    def _related(self, first: Memory, second: Memory) -> bool:
        first_tags = set(first.tags)
        second_tags = set(second.tags)
        if first_tags & second_tags:
            return True
        first_keywords = set(self._keywords(first.content))
        second_keywords = set(self._keywords(second.content))
        return len(first_keywords & second_keywords) >= 2

    def _summarize(self, patterns: dict[str, Any]) -> str:
        memory_count = int(patterns.get("memory_count", 0))
        tags = list(patterns.get("tags", []))
        keywords = list(patterns.get("keywords", []))
        snippets = list(patterns.get("snippets", []))

        focus_parts = []
        if tags:
            focus_parts.append("tags " + ", ".join(tags[:5]))
        if keywords:
            focus_parts.append("keywords " + ", ".join(keywords[:5]))
        focus = "; ".join(focus_parts) if focus_parts else "shared recurring context"

        evidence = " ".join(snippets[:3])
        if evidence:
            return f"Consolidated {memory_count} related experiences around {focus}. Evidence: {evidence}"
        return f"Consolidated {memory_count} related experiences around {focus}."

    def _common_tags(self, memories: list[Memory]) -> list[str]:
        counts: dict[str, int] = {}
        for memory in memories:
            for tag in memory.tags:
                counts[tag] = counts.get(tag, 0) + 1
        return [tag for tag, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))]

    def _common_keywords(self, memories: list[Memory]) -> list[str]:
        counts: dict[str, int] = {}
        for memory in memories:
            for keyword in self._keywords(memory.content):
                counts[keyword] = counts.get(keyword, 0) + 1
        return [keyword for keyword, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:10]]

    def _keywords(self, content: str) -> list[str]:
        tokens = re.findall(r"[a-z0-9]+", content.lower())
        return [token for token in tokens if len(token) > 2 and token not in self._excluded_keywords]

    @staticmethod
    def _normalize_sentence(content: str) -> str:
        normalized = " ".join(content.strip().split())
        if not normalized:
            return ""
        if normalized.endswith("."):
            return normalized
        return normalized + "."

    @staticmethod
    def _merge_tags(primary: Iterable[str], secondary: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for tag in list(primary) + list(secondary):
            clean = str(tag).strip().lower()
            if clean and clean not in seen:
                seen.add(clean)
                result.append(clean)
        return result

    def _next_dream_id(self) -> str:
        self._sequence += 1
        return f"dream_{self._sequence:012d}"

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
