"""Reason Engine for Memos Brain."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from brain.memos.models.reason_result import ReasonResult
from brain.memos.reason.citation_manager import CitationManager
from brain.memos.reason.context_builder import ContextBuilder, ReasoningContext
from brain.memos.reason.provider_router import ProviderResponse, ProviderRouter
from brain.memos.reason.retriever import RankedResult, Retriever


class ReasonEngine:
    """Coordinate retrieval, context assembly, provider invocation, and citations."""

    def __init__(
        self,
        *,
        retriever: Retriever | None = None,
        context_builder: ContextBuilder | None = None,
        citation_manager: CitationManager | None = None,
        provider_router: ProviderRouter | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.retriever = retriever or Retriever(logger=self._logger)
        self.context_builder = context_builder or ContextBuilder(logger=self._logger)
        self.citation_manager = citation_manager or CitationManager(logger=self._logger)
        self.provider_router = provider_router or ProviderRouter(logger=self._logger)
        self._lock = RLock()
        self._sequence = 0

    def reason(
        self,
        *,
        agent_id: str,
        question: str,
        memories: Iterable[Any] | None = None,
        modules: Iterable[Any] | None = None,
        tags: Iterable[str] | None = None,
        provider_name: str | None = None,
        execution_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ReasonResult:
        """Run the Memos Reason flow for one question."""

        created_at = self._normalized_now()
        with self._lock:
            resolved_execution_id = execution_id or self._next_execution_id()

        ranked_memories = self.retriever.retrieve_memories(
            agent_id=agent_id,
            question=question,
            memories=memories,
            tags=tags or [],
        )
        ranked_modules = self.retriever.retrieve_modules(
            agent_id=agent_id,
            question=question,
            modules=modules,
            tags=tags or [],
        )
        context = self.assemble_reasoning_context(
            question=question,
            memories=ranked_memories,
            modules=ranked_modules,
            metadata=metadata or {},
        )
        provider_response = self.generate_response(context=context, provider_name=provider_name)
        citations = self.citation_manager.create_citations(memories=context.memories, modules=context.modules)
        answer = self.citation_manager.attach_citations(provider_response.answer, citations)

        result = ReasonResult(
            execution_id=resolved_execution_id,
            agent_id=agent_id,
            question=question,
            answer=answer,
            citations=citations,
            used_memories=[memory.source_id for memory in context.memories],
            used_modules=[module.source_id for module in context.modules],
            metadata={
                **context.metadata,
                "provider": provider_response.provider_name,
                "provider_metadata": provider_response.metadata,
                "citation_count": len(citations),
            },
            latency_ms=int(provider_response.metadata.get("latency_ms", 0) or 0),
            created_at=created_at,
        )
        self._log(
            "reason_completed",
            agent_id=agent_id,
            execution_id=result.execution_id,
            memory_count=len(result.used_memories),
            module_count=len(result.used_modules),
            citation_count=len(result.citations),
        )
        return result

    def assemble_reasoning_context(
        self,
        *,
        question: str,
        memories: list[RankedResult],
        modules: list[RankedResult],
        metadata: dict[str, Any] | None = None,
    ) -> ReasoningContext:
        """Assemble bounded provider context for Reason."""

        return self.context_builder.build_context(
            question=question,
            memories=memories,
            modules=modules,
            metadata=metadata or {},
        )

    def generate_response(
        self,
        *,
        context: ReasoningContext,
        provider_name: str | None = None,
    ) -> ProviderResponse:
        """Generate a provider response from reasoning context."""

        return self.provider_router.invoke(context, provider_name=provider_name)

    def _next_execution_id(self) -> str:
        self._sequence += 1
        return f"reason_{self._sequence:012d}"

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
