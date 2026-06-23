"""Replaceable compute adapter for Memos 0G Compute integration."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
from enum import StrEnum
import hashlib
import logging
import re
from threading import RLock
from typing import Any, Protocol, runtime_checkable


class ComputeMode(StrEnum):
    """Execution mode for the Compute Adapter."""

    MOCK = "mock"
    REAL = "real"


@runtime_checkable
class ComputeClient(Protocol):
    """Minimal real compute client surface accepted by ComputeAdapter."""

    def embed(self, text: str, metadata: dict[str, Any]) -> list[float]: ...

    def infer(self, prompt: str, context: str, metadata: dict[str, Any]) -> str: ...

    def summarize(self, texts: list[str], metadata: dict[str, Any]) -> str: ...


class ComputeAdapter:
    """Route embeddings, inference, and summarization through 0G Compute hooks."""

    def __init__(
        self,
        *,
        mode: ComputeMode | str = ComputeMode.MOCK,
        client: ComputeClient | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.mode = ComputeMode(mode)
        self.active_mode = self.mode
        self._client = client
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._calls: list[dict[str, Any]] = []

    def embed(self, text: str, *, metadata: dict[str, Any] | None = None) -> list[float]:
        """Return a deterministic embedding vector or delegate to a real client."""

        clean = self._normalize_text(text)
        clean_metadata = dict(metadata or {})
        if self.active_mode == ComputeMode.REAL and self._client is not None:
            try:
                vector = self._client.embed(clean, clean_metadata)
                self._record("embed", clean_metadata)
                return [float(value) for value in vector]
            except Exception:
                self._fallback("compute_embed_real_failed")

        digest = hashlib.sha256(clean.encode("utf-8")).digest()
        vector = [round(byte / 255, 6) for byte in digest[:8]]
        self._record("embed", clean_metadata)
        return vector

    def infer(self, prompt: str, *, context: str = "", metadata: dict[str, Any] | None = None) -> str:
        """Return a deterministic inference response or delegate to a real client."""

        clean_prompt = self._normalize_text(prompt)
        clean_context = context.strip()
        clean_metadata = dict(metadata or {})
        if self.active_mode == ComputeMode.REAL and self._client is not None:
            try:
                response = self._client.infer(clean_prompt, clean_context, clean_metadata)
                self._record("infer", clean_metadata)
                return response.strip()
            except Exception:
                self._fallback("compute_infer_real_failed")

        prefix = clean_context if clean_context else clean_prompt
        response = f"Mock inference: {self._compact(prefix, 160)}"
        self._record("infer", clean_metadata)
        return response

    def summarize(self, texts: list[str], *, metadata: dict[str, Any] | None = None) -> str:
        """Return a deterministic summary or delegate to a real client."""

        clean_texts = [self._normalize_text(text) for text in texts if text.strip()]
        clean_metadata = dict(metadata or {})
        if self.active_mode == ComputeMode.REAL and self._client is not None:
            try:
                summary = self._client.summarize(clean_texts, clean_metadata)
                self._record("summarize", clean_metadata)
                return summary.strip()
            except Exception:
                self._fallback("compute_summarize_real_failed")

        if not clean_texts:
            summary = "No content to summarize."
        else:
            tokens = self._keywords(" ".join(clean_texts))
            summary = f"Summary: {', '.join(tokens[:8])}" if tokens else f"Summary: {self._compact(clean_texts[0], 160)}"
        self._record("summarize", clean_metadata)
        return summary

    def list_calls(self) -> list[dict[str, Any]]:
        """Return recorded compute calls in deterministic order."""

        with self._lock:
            return [dict(call) for call in self._calls]

    def _record(self, operation: str, metadata: dict[str, Any]) -> None:
        now = self._normalized_now()
        with self._lock:
            self._calls.append({"operation": operation, "metadata": dict(metadata), "called_at": now.isoformat()})
        self._log("compute_called", operation=operation)

    def _fallback(self, event: str) -> None:
        self.active_mode = ComputeMode.MOCK
        self._logger.warning(event, extra={"memos": {"fallback_mode": ComputeMode.MOCK.value}})

    @staticmethod
    def _normalize_text(text: str) -> str:
        clean = text.strip()
        if not clean:
            raise ValueError("text must not be empty")
        return clean

    @staticmethod
    def _compact(text: str, limit: int) -> str:
        return re.sub(r"\s+", " ", text).strip()[:limit]

    @staticmethod
    def _keywords(text: str) -> list[str]:
        seen: set[str] = set()
        words: list[str] = []
        for word in re.findall(r"[a-zA-Z0-9]+", text.lower()):
            if len(word) > 2 and word not in seen:
                seen.add(word)
                words.append(word)
        return words

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
