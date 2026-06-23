"""Replaceable storage adapter for Memos 0G Storage integration."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
from enum import StrEnum
import hashlib
import json
import logging
from threading import RLock
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, field_validator

from brain.memos.models.dream_result import DreamResult
from brain.memos.models.memory import Memory
from brain.memos.runtime.langgraph_checkpointer import CheckpointRecord


class AdapterMode(StrEnum):
    """Execution mode for replaceable 0G adapters."""

    MOCK = "mock"
    REAL = "real"


class StorageObject(BaseModel):
    """Stored object returned by the Storage Adapter."""

    model_config = ConfigDict(frozen=True)

    storage_hash: str = Field(..., min_length=1)
    object_type: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("created_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


@runtime_checkable
class StorageClient(Protocol):
    """Minimal real storage client surface accepted by StorageAdapter."""

    def upload(self, payload: dict[str, Any], metadata: dict[str, Any]) -> str: ...

    def download(self, storage_hash: str) -> dict[str, Any] | None: ...

    def exists(self, storage_hash: str) -> bool: ...


class StorageAdapter:
    """Persist Memos state through 0G Storage or deterministic mock storage."""

    def __init__(
        self,
        *,
        mode: AdapterMode | str = AdapterMode.MOCK,
        client: StorageClient | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.mode = AdapterMode(mode)
        self.active_mode = self.mode
        self._client = client
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._objects: dict[str, StorageObject] = {}

    def upload(
        self,
        payload: dict[str, Any],
        *,
        object_type: str = "object",
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Upload a JSON-serializable payload and return a stable storage hash."""

        clean_payload = self._copy_payload(payload)
        clean_metadata = self._copy_payload(metadata or {})
        if self.active_mode == AdapterMode.REAL and self._client is not None:
            try:
                storage_hash = self._client.upload(clean_payload, clean_metadata)
                if storage_hash:
                    self._store(storage_hash, object_type, clean_payload, clean_metadata)
                    self._log("storage_uploaded_real", storage_hash=storage_hash, object_type=object_type)
                    return storage_hash
            except Exception:
                self._fallback("storage_upload_real_failed")

        storage_hash = self._hash_payload(object_type, clean_payload, clean_metadata)
        self._store(storage_hash, object_type, clean_payload, clean_metadata)
        self._log("storage_uploaded_mock", storage_hash=storage_hash, object_type=object_type)
        return storage_hash

    def download(self, storage_hash: str) -> dict[str, Any] | None:
        """Download a stored payload by hash."""

        if self.active_mode == AdapterMode.REAL and self._client is not None:
            try:
                payload = self._client.download(storage_hash)
                if payload is not None:
                    return self._copy_payload(payload)
            except Exception:
                self._fallback("storage_download_real_failed")

        with self._lock:
            stored = self._objects.get(storage_hash)
            return self._copy_payload(stored.payload) if stored else None

    def exists(self, storage_hash: str) -> bool:
        """Return whether a payload exists for the provided storage hash."""

        if self.active_mode == AdapterMode.REAL and self._client is not None:
            try:
                return bool(self._client.exists(storage_hash))
            except Exception:
                self._fallback("storage_exists_real_failed")

        with self._lock:
            return storage_hash in self._objects

    def persist_memory(self, memory: Memory) -> str:
        """Persist a Memory record."""

        return self.upload(memory.model_dump(mode="json"), object_type="memory", metadata={"agent_id": memory.agent_id})

    def persist_dream(self, dream: DreamResult) -> str:
        """Persist a Dream result."""

        return self.upload(dream.model_dump(mode="json"), object_type="dream", metadata={"agent_id": dream.agent_id})

    def persist_checkpoint(self, checkpoint: CheckpointRecord) -> str:
        """Persist a runtime checkpoint record."""

        return self.upload(
            checkpoint.model_dump(mode="json"),
            object_type="checkpoint",
            metadata={"agent_id": checkpoint.agent_id, "thread_id": checkpoint.thread_id},
        )

    def _store(self, storage_hash: str, object_type: str, payload: dict[str, Any], metadata: dict[str, Any]) -> None:
        now = self._normalized_now()
        with self._lock:
            self._objects[storage_hash] = StorageObject(
                storage_hash=storage_hash,
                object_type=object_type,
                payload=payload,
                metadata=metadata,
                created_at=now,
            )

    def _fallback(self, event: str) -> None:
        self.active_mode = AdapterMode.MOCK
        self._logger.warning(event, extra={"memos": {"fallback_mode": AdapterMode.MOCK.value}})

    @staticmethod
    def _hash_payload(object_type: str, payload: dict[str, Any], metadata: dict[str, Any]) -> str:
        encoded = json.dumps(
            {"object_type": object_type, "payload": payload, "metadata": metadata},
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        return f"mock_storage_{hashlib.sha256(encoded).hexdigest()}"

    @staticmethod
    def _copy_payload(payload: dict[str, Any]) -> dict[str, Any]:
        return json.loads(json.dumps(payload, sort_keys=True))

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
