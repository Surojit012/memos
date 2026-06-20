"""Provider routing for MemoryOS Reason."""

from __future__ import annotations

import logging
from threading import RLock
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

from brain.memoryos.reason.context_builder import ReasoningContext


class ProviderResponse(BaseModel):
    """Provider response returned to Reason Engine."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    answer: str = Field(..., min_length=1)
    provider_name: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)

    def clone(self) -> "ProviderResponse":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)


class ReasonProvider(Protocol):
    """Provider interface used by ProviderRouter."""

    name: str

    def invoke(self, context: ReasoningContext) -> ProviderResponse:
        """Return a provider response for the given context."""


class LocalReasonProvider:
    """Deterministic local provider for development and tests."""

    name = "local"

    def invoke(self, context: ReasoningContext) -> ProviderResponse:
        """Generate a deterministic explanation from supplied context."""

        memory_lines = [self._source_line(result) for result in context.memories]
        module_lines = [self._source_line(result) for result in context.modules]

        if memory_lines or module_lines:
            evidence = "; ".join(memory_lines + module_lines)
            answer = (
                f"Question: {context.question}\n"
                f"Answer: Based on MemoryOS context, the most relevant evidence is: {evidence}.\n"
                f"Explanation: I ranked available memories and Modules by keyword overlap, tag overlap, and importance, then answered from those ranked sources."
            )
        else:
            answer = (
                f"Question: {context.question}\n"
                "Answer: No cited MemoryOS sources were available for this question.\n"
                "Explanation: I could not ground the response in retrieved memories or Modules, so I did not infer beyond the available context."
            )

        return ProviderResponse(
            answer=answer,
            provider_name=self.name,
            metadata={
                "memory_count": len(context.memories),
                "module_count": len(context.modules),
                "provider_mode": "deterministic_local",
            },
        )

    def _source_line(self, result: Any) -> str:
        content = self._content(result.item)
        snippet = content[:160].strip()
        return f"{result.source_type}:{result.source_id} score={result.score} content={snippet}"

    @staticmethod
    def _content(item: Any) -> str:
        if isinstance(item, dict):
            values = [item.get("content", ""), item.get("name", ""), item.get("description", "")]
        else:
            values = [getattr(item, "content", ""), getattr(item, "name", ""), getattr(item, "description", "")]
        return " ".join(str(value).strip() for value in values if str(value).strip())


class ProviderRouter:
    """Thread-safe registry and invocation point for Reason providers."""

    def __init__(
        self,
        *,
        default_provider: ReasonProvider | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._providers: dict[str, ReasonProvider] = {}
        self._default_provider_name = ""
        provider = default_provider or LocalReasonProvider()
        self.register_provider(provider.name, provider)
        self.set_default_provider(provider.name)

    def register_provider(self, name: str, provider: ReasonProvider) -> None:
        """Register a provider implementation."""

        clean_name = self._normalize_name(name)
        with self._lock:
            self._providers[clean_name] = provider

        self._log("provider_registered", provider=clean_name)

    def get_provider(self, name: str | None = None) -> ReasonProvider:
        """Return a provider by name, or the default provider."""

        with self._lock:
            clean_name = self._normalize_name(name or self._default_provider_name)
            provider = self._providers.get(clean_name)
            if provider is None:
                raise ValueError(f"provider is not registered: {clean_name}")
            return provider

    def set_default_provider(self, name: str) -> None:
        """Set the default provider by registered name."""

        clean_name = self._normalize_name(name)
        with self._lock:
            if clean_name not in self._providers:
                raise ValueError(f"provider is not registered: {clean_name}")
            self._default_provider_name = clean_name

        self._log("default_provider_set", provider=clean_name)

    def invoke(self, context: ReasoningContext, *, provider_name: str | None = None) -> ProviderResponse:
        """Invoke the selected provider without calling external APIs."""

        provider = self.get_provider(provider_name)
        response = provider.invoke(context)
        result = response.clone()
        self._log("provider_invoked", provider=result.provider_name)
        return result

    @staticmethod
    def _normalize_name(name: str) -> str:
        clean = name.strip().lower()
        if not clean:
            raise ValueError("provider name must not be empty")
        return clean

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
