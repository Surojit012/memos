"""Deterministic retrieval for MemoryOS Reason."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime
import logging
import re
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RankedResult(BaseModel):
    """Ranked MemoryOS source returned by Retriever."""

    model_config = ConfigDict(frozen=False, validate_assignment=True, arbitrary_types_allowed=True)

    source_type: str = Field(..., min_length=1)
    source_id: str = Field(..., min_length=1)
    score: float = Field(ge=0)
    item: Any
    metadata: dict[str, Any] = Field(default_factory=dict)

    def clone(self) -> "RankedResult":
        """Return a copy with metadata isolated and item reference preserved."""

        copy = self.model_copy(deep=False)
        copy.metadata = dict(self.metadata)
        return copy


class Retriever:
    """Retrieve and rank memories and Modules for Reason."""

    def __init__(
        self,
        *,
        memory_source: Callable[[str], Iterable[Any]] | None = None,
        module_source: Callable[[str], Iterable[Any]] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._memory_source = memory_source
        self._module_source = module_source
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()

    def retrieve_memories(
        self,
        *,
        agent_id: str,
        question: str,
        memories: Iterable[Any] | None = None,
        tags: Iterable[str] | None = None,
        limit: int = 20,
    ) -> list[RankedResult]:
        """Retrieve ranked memories using keyword, tag, and importance score."""

        if limit < 1:
            return []
        source = list(memories) if memories is not None else self._read_memory_source(agent_id)
        ranked = self.rank_results(
            items=source,
            question=question,
            tags=tags or [],
            source_type="memory",
            id_field="id",
        )
        results = ranked[:limit]
        self._log("memories_retrieved", agent_id=agent_id, count=len(results))
        return results

    def retrieve_modules(
        self,
        *,
        agent_id: str,
        question: str,
        modules: Iterable[Any] | None = None,
        tags: Iterable[str] | None = None,
        limit: int = 10,
    ) -> list[RankedResult]:
        """Retrieve ranked Modules using keyword, tag, and importance score."""

        if limit < 1:
            return []
        source = list(modules) if modules is not None else self._read_module_source(agent_id)
        ranked = self.rank_results(
            items=source,
            question=question,
            tags=tags or [],
            source_type="module",
            id_field="module_id",
        )
        results = ranked[:limit]
        self._log("modules_retrieved", agent_id=agent_id, count=len(results))
        return results

    def rank_results(
        self,
        *,
        items: Iterable[Any],
        question: str,
        tags: Iterable[str],
        source_type: str,
        id_field: str,
    ) -> list[RankedResult]:
        """Rank items deterministically using keyword, tag, and importance score."""

        query_tokens = self._tokens(question)
        tag_terms = self._normalize_terms(tags)
        ranked: list[RankedResult] = []

        with self._lock:
            for index, item in enumerate(items):
                source_id = self._source_id(item, id_field=id_field, fallback_index=index)
                content = self._content(item)
                item_tags = self._normalize_terms(self._field(item, "tags", default=[]))
                importance = self._importance(item)
                score = self._score(content=content, item_tags=item_tags, importance=importance, query_tokens=query_tokens, tag_terms=tag_terms)
                if query_tokens or tag_terms:
                    if score <= importance:
                        continue
                ranked.append(
                    RankedResult(
                        source_type=source_type,
                        source_id=source_id,
                        score=score,
                        item=item,
                        metadata={
                            "keyword_score": self._keyword_score(content, item_tags, query_tokens),
                            "tag_score": self._tag_score(item_tags, tag_terms),
                            "importance_score": importance,
                        },
                    )
                )

        ranked.sort(key=lambda result: (-result.score, -self._importance(result.item), self._updated_timestamp(result.item), result.source_id))
        return [result.clone() for result in ranked]

    def _read_memory_source(self, agent_id: str) -> list[Any]:
        if self._memory_source is None:
            return []
        return list(self._memory_source(agent_id))

    def _read_module_source(self, agent_id: str) -> list[Any]:
        if self._module_source is None:
            return []
        return list(self._module_source(agent_id))

    def _score(
        self,
        *,
        content: str,
        item_tags: list[str],
        importance: int,
        query_tokens: list[str],
        tag_terms: list[str],
    ) -> int:
        return importance + self._keyword_score(content, item_tags, query_tokens) + self._tag_score(item_tags, tag_terms)

    def _keyword_score(self, content: str, item_tags: list[str], query_tokens: list[str]) -> int:
        content_tokens = self._tokens(content)
        content_lower = content.lower()
        tag_set = set(item_tags)
        score = 0
        for token in query_tokens:
            score += content_tokens.count(token) * 10
            if token in content_lower and token not in content_tokens:
                score += 3
            if token in tag_set:
                score += 8
            else:
                score += sum(4 for tag in tag_set if token in tag)
        return score

    @staticmethod
    def _tag_score(item_tags: list[str], tag_terms: list[str]) -> int:
        tag_set = set(item_tags)
        score = 0
        for tag in tag_terms:
            if tag in tag_set:
                score += 12
            else:
                score += sum(5 for existing in tag_set if tag in existing)
        return score

    def _source_id(self, item: Any, *, id_field: str, fallback_index: int) -> str:
        value = self._field(item, id_field, default=None)
        if value is None and id_field == "module_id":
            value = self._field(item, "id", default=None)
        if value is None:
            value = f"anonymous_{fallback_index:012d}"
        return str(value)

    def _content(self, item: Any) -> str:
        parts = [
            self._field(item, "content", default=""),
            self._field(item, "name", default=""),
            self._field(item, "description", default=""),
            self._field(item, "README", default=""),
            self._field(item, "readme", default=""),
        ]
        return " ".join(str(part).strip() for part in parts if str(part).strip())

    def _importance(self, item: Any) -> float:
        value = self._field(item, "importance", default=1)
        try:
            return max(0.0, float(value))
        except (TypeError, ValueError):
            return 1.0

    @staticmethod
    def _updated_timestamp(item: Any) -> float:
        value = Retriever._field(item, "updated_at", default=None)
        if isinstance(value, datetime):
            return -value.timestamp()
        return 0.0

    @staticmethod
    def _field(item: Any, name: str, *, default: Any) -> Any:
        if isinstance(item, dict):
            return item.get(name, default)
        return getattr(item, name, default)

    @staticmethod
    def _normalize_terms(values: Iterable[Any]) -> list[str]:
        if isinstance(values, str):
            values = [values]
        seen: set[str] = set()
        normalized: list[str] = []
        for value in values:
            clean = str(value).strip().lower()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @staticmethod
    def _tokens(value: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", value.lower())

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
