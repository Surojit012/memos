"""Primary Memos Python SDK interface."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone
import hashlib
import logging
from pathlib import Path
from threading import RLock
from typing import Any

from brain.memos.adapters.adapter_manager import AdapterManager
from brain.memos.agent.agent import Agent as CoreAgent
from brain.memos.agent.identity import Identity
from brain.memos.dreams.dream_engine import DreamEngine
from brain.memos.models.agent_profile import AgentProfile
from brain.memos.models.dream_result import DreamResult
from brain.memos.models.memory import Memory, MemoryType
from brain.memos.models.module_result import ModuleResult
from brain.memos.models.reason_result import ReasonResult
from brain.memos.models.sync_result import SyncResult
from brain.memos.persistence.persistence_manager import PersistenceManager

from memos.config import Config
from memos.exceptions import MemosError, ModuleError, PersistenceError, SyncError
from memos.version import SDK_VERSION, Version


class Client:
    """Small SDK client for initializing Memos runtime services."""

    def __init__(self, *, config: Config | None = None, logger: logging.Logger | None = None) -> None:
        self.config = config.clone() if config else Config()
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._initialized = False
        self.adapter_manager = AdapterManager(
            storage_mode="mock" if self.config.mock_mode else "real",
            compute_mode="mock" if self.config.mock_mode else "real",
            chain_mode="mock" if self.config.mock_mode else "real",
            logger=self._logger,
        )
        self.persistence_manager = PersistenceManager(logger=self._logger)

    def initialize(self) -> "Client":
        """Initialize the SDK client."""

        with self._lock:
            self._initialized = True
        self._log("sdk_initialized", environment=str(self.config.environment))
        return self

    def health(self) -> dict[str, Any]:
        """Return current SDK health."""

        with self._lock:
            initialized = self._initialized
        return {
            "ok": True,
            "initialized": initialized,
            "environment": str(self.config.environment),
            "mock_mode": self.config.mock_mode,
            "storage_enabled": self.config.storage_enabled,
            "compute_enabled": self.config.compute_enabled,
            "chain_enabled": self.config.chain_enabled,
        }

    def version(self) -> Version:
        """Return SDK version metadata."""

        return SDK_VERSION

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})


class Agent:
    """Developer-facing Memos Agent SDK wrapper."""

    def __init__(
        self,
        *,
        name: str,
        description: str = "",
        agent_id: str | None = None,
        wallet_address: str | None = None,
        config: Config | None = None,
        client: Client | None = None,
        metadata: dict[str, Any] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        clean_name = name.strip()
        if not clean_name:
            raise ValueError("name must not be empty")

        self.config = config.clone() if config else Config()
        self.client = client or Client(config=self.config, logger=logger).initialize()
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self.agent_id = agent_id.strip() if agent_id else self._agent_id_from_name(clean_name)
        self._last_dream: DreamResult | None = None

        profile = AgentProfile(
            agent_id=self.agent_id,
            name=clean_name,
            description=description,
            metadata=dict(metadata or {}),
        )
        identity = Identity(
            wallet_address=(wallet_address or f"local:{self.agent_id}").strip(),
            agent_id=self.agent_id,
            signature="",
            verified=False,
        )
        self._agent = CoreAgent(profile=profile, identity=identity, logger=self._logger)
        self._dream_engine = DreamEngine(memory_manager=self._agent.memory_manager, logger=self._logger)

    def remember(
        self,
        content: str,
        *,
        type: MemoryType | str = MemoryType.EPISODIC,
        tags: Iterable[str] | None = None,
        importance: int = 3,
        metadata: dict[str, Any] | None = None,
    ) -> Memory:
        """Store a memory for this Agent and emit a persistence event."""

        try:
            memory = self._agent.remember(
                content=content,
                type=type,
                tags=tags,
                importance=importance,
                metadata=metadata,
            )
            if self.config.storage_enabled:
                self.client.persistence_manager.save_memory(memory)
            return memory
        except Exception as exc:
            raise MemosError(str(exc)) from exc

    def dream(self) -> DreamResult:
        """Run deterministic memory consolidation for this Agent."""

        try:
            dream = self._dream_engine.dream(agent_id=self.agent_id)
            with self._lock:
                self._last_dream = dream.clone()
                self._agent.brain_state.last_dreamed_at = dream.completed_at
                self._agent.brain_state.dream_count += 1
                self._agent.brain_state.updated_at = self._now()
            if self.config.storage_enabled:
                self.client.persistence_manager.save_dream(dream)
                for memory_id in dream.created_memory_ids:
                    memory = self._agent.memory_manager.retrieve(memory_id, increment_access=False)
                    if memory is not None:
                        self.client.persistence_manager.save_memory(memory)
            return dream
        except Exception as exc:
            raise MemosError(str(exc)) from exc

    def reason(self, question: str, *, tags: Iterable[str] | None = None) -> ReasonResult:
        """Reason over this Agent's persistent brain."""

        try:
            return self._agent.reason(question=question, tags=tags)
        except Exception as exc:
            raise MemosError(str(exc)) from exc

    def install_module(
        self,
        module_id: str,
        *,
        module_path: str | Path,
        name: str | None = None,
        description: str = "",
        version: str = "0.1.0",
        author: str = "",
        tags: Iterable[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Install one local Module for this Agent."""

        try:
            installed = self._agent.install_module(
                module_id=module_id,
                module_path=module_path,
                name=name,
                description=description,
                version=version,
                author=author,
                tags=tags,
                metadata=metadata,
            )
            registered = self._agent.module_registry.get_module(installed["module_id"])
            if registered is not None and self.config.storage_enabled:
                self.client.persistence_manager.save_module(self.agent_id, registered)
            return installed
        except Exception as exc:
            raise ModuleError(str(exc)) from exc

    def use_module(self, module_id: str, *, inputs: dict[str, Any] | None = None) -> ModuleResult:
        """Execute an installed local Module."""

        try:
            return self._agent.use_module(module_id=module_id, inputs=inputs or {})
        except Exception as exc:
            raise ModuleError(str(exc)) from exc

    def sync(self) -> SyncResult:
        """Synchronize emitted persistence events."""

        try:
            return self.client.persistence_manager.sync(agent_id=self.agent_id)
        except Exception as exc:
            raise SyncError(str(exc)) from exc

    def list_memories(self) -> list[Memory]:
        """List memories owned by this Agent."""

        return self._agent.list_memories()

    def health(self) -> dict[str, Any]:
        """Return SDK and Agent health."""

        health = self.client.health()
        health["agent_id"] = self.agent_id
        health["memory_count"] = len(self.list_memories())
        health["module_count"] = len(self._agent.list_modules())
        return health

    @property
    def core(self) -> CoreAgent:
        """Return the underlying framework Agent for advanced framework users."""

        return self._agent

    @staticmethod
    def _agent_id_from_name(name: str) -> str:
        normalized = "".join(character.lower() if character.isalnum() else "-" for character in name)
        compact = "-".join(part for part in normalized.split("-") if part)
        digest = hashlib.sha256(name.encode("utf-8")).hexdigest()[:8]
        return f"agent-{compact or 'memos'}-{digest}"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)


__all__ = [
    "Agent",
    "Client",
    "Config",
    "MemosError",
    "ModuleError",
    "PersistenceError",
    "SyncError",
    "Version",
]
