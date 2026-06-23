"""Replaceable chain adapter for Memos 0G Chain integration."""

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

from brain.memos.agent.identity import Identity


class ChainMode(StrEnum):
    """Execution mode for the Chain Adapter."""

    MOCK = "mock"
    REAL = "real"


class ChainReceipt(BaseModel):
    """Verifiable receipt emitted by the Chain Adapter."""

    model_config = ConfigDict(frozen=True)

    receipt_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    receipt_type: str = Field(..., min_length=1)
    payload_hash: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("created_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


@runtime_checkable
class ChainClient(Protocol):
    """Minimal real chain client surface accepted by ChainAdapter."""

    def register_identity(self, identity: dict[str, Any]) -> dict[str, Any]: ...

    def create_receipt(self, agent_id: str, receipt_type: str, payload: dict[str, Any]) -> dict[str, Any]: ...

    def verify_receipt(self, receipt: dict[str, Any]) -> bool: ...


class ChainAdapter:
    """Register identities and receipts through 0G Chain hooks."""

    def __init__(
        self,
        *,
        mode: ChainMode | str = ChainMode.MOCK,
        client: ChainClient | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.mode = ChainMode(mode)
        self.active_mode = self.mode
        self._client = client
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._receipts: dict[str, ChainReceipt] = {}
        self._identities: dict[str, Identity] = {}

    def register_identity(self, identity: Identity) -> ChainReceipt:
        """Register an Agent identity and return a receipt."""

        payload = identity.model_dump(mode="json")
        if self.active_mode == ChainMode.REAL and self._client is not None:
            try:
                raw = self._client.register_identity(payload)
                receipt = self._receipt_from_raw(raw, identity.agent_id, "identity")
                self._store_receipt(receipt)
                self._store_identity(identity)
                return receipt
            except Exception:
                self._fallback("chain_register_identity_real_failed")

        self._store_identity(identity)
        return self.create_receipt(agent_id=identity.agent_id, receipt_type="identity", payload=payload)

    def create_receipt(
        self,
        *,
        agent_id: str,
        payload: dict[str, Any],
        receipt_type: str = "transaction",
    ) -> ChainReceipt:
        """Create a deterministic receipt for a payload."""

        clean_payload = self._copy_payload(payload)
        if self.active_mode == ChainMode.REAL and self._client is not None:
            try:
                raw = self._client.create_receipt(agent_id, receipt_type, clean_payload)
                receipt = self._receipt_from_raw(raw, agent_id, receipt_type)
                self._store_receipt(receipt)
                return receipt
            except Exception:
                self._fallback("chain_create_receipt_real_failed")

        payload_hash = self._hash_payload(clean_payload)
        receipt = ChainReceipt(
            receipt_id=f"mock_receipt_{hashlib.sha256(f'{agent_id}:{receipt_type}:{payload_hash}'.encode('utf-8')).hexdigest()}",
            agent_id=agent_id,
            receipt_type=receipt_type,
            payload_hash=payload_hash,
            metadata={"mode": ChainMode.MOCK.value},
            created_at=self._normalized_now(),
        )
        self._store_receipt(receipt)
        self._log("chain_receipt_created_mock", agent_id=agent_id, receipt_id=receipt.receipt_id)
        return receipt

    def verify_receipt(self, receipt: ChainReceipt | dict[str, Any] | str) -> bool:
        """Verify a receipt against the configured chain hook or local receipt store."""

        resolved = self._resolve_receipt(receipt)
        if resolved is None:
            return False

        if self.active_mode == ChainMode.REAL and self._client is not None:
            try:
                return bool(self._client.verify_receipt(resolved.model_dump(mode="json")))
            except Exception:
                self._fallback("chain_verify_receipt_real_failed")

        with self._lock:
            stored = self._receipts.get(resolved.receipt_id)
            return stored == resolved

    def get_identity(self, agent_id: str) -> Identity | None:
        """Return a registered identity by Agent id."""

        with self._lock:
            identity = self._identities.get(agent_id)
            return identity.clone() if identity else None

    def _store_receipt(self, receipt: ChainReceipt) -> None:
        with self._lock:
            self._receipts[receipt.receipt_id] = receipt

    def _store_identity(self, identity: Identity) -> None:
        with self._lock:
            self._identities[identity.agent_id] = identity.clone()

    def _resolve_receipt(self, receipt: ChainReceipt | dict[str, Any] | str) -> ChainReceipt | None:
        if isinstance(receipt, ChainReceipt):
            return receipt
        if isinstance(receipt, str):
            with self._lock:
                return self._receipts.get(receipt)
        return ChainReceipt(**receipt)

    def _receipt_from_raw(self, raw: dict[str, Any], agent_id: str, receipt_type: str) -> ChainReceipt:
        data = self._copy_payload(raw)
        data.setdefault("agent_id", agent_id)
        data.setdefault("receipt_type", receipt_type)
        data.setdefault("payload_hash", self._hash_payload(data))
        data.setdefault("receipt_id", f"real_receipt_{data['payload_hash']}")
        data.setdefault("metadata", {"mode": ChainMode.REAL.value})
        data.setdefault("created_at", self._normalized_now())
        return ChainReceipt(**data)

    def _fallback(self, event: str) -> None:
        self.active_mode = ChainMode.MOCK
        self._logger.warning(event, extra={"memos": {"fallback_mode": ChainMode.MOCK.value}})

    @staticmethod
    def _hash_payload(payload: dict[str, Any]) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

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
