"""Citation management for Memos Reason."""

from __future__ import annotations

import logging
from threading import RLock
from typing import Any

from brain.memos.reason.retriever import RankedResult


class CitationManager:
    """Create and attach Memos source citations."""

    def __init__(self, *, logger: logging.Logger | None = None) -> None:
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()

    def create_citations(
        self,
        *,
        memories: list[RankedResult],
        modules: list[RankedResult],
    ) -> list[str]:
        """Create stable citations in memory:{id} and module:{id} format."""

        with self._lock:
            citations = [f"memory:{memory.source_id}" for memory in memories]
            citations.extend(f"module:{module.source_id}" for module in modules)
            result = self._deduplicate(citations)

        self._log("citations_created", count=len(result))
        return result

    def attach_citations(self, answer: str, citations: list[str]) -> str:
        """Attach formatted citations to an answer."""

        clean_answer = answer.strip()
        formatted = self.format_citations(citations)
        if not formatted:
            return clean_answer
        return f"{clean_answer}\n\nCitations: {formatted}"

    def format_citations(self, citations: list[str]) -> str:
        """Format citations for display."""

        return ", ".join(self._deduplicate(citations))

    @staticmethod
    def _deduplicate(values: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for value in values:
            clean = value.strip()
            if clean and clean not in seen:
                seen.add(clean)
                result.append(clean)
        return result

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
