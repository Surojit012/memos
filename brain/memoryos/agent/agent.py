"""Agent Core for MemoryOS."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from copy import deepcopy
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from brain.memoryos.agent.identity import Identity
from brain.memoryos.memory.memory_manager import MemoryManager
from brain.memoryos.models.agent_profile import AgentProfile
from brain.memoryos.models.brain_state import BrainState
from brain.memoryos.models.memory import Memory, MemoryType
from brain.memoryos.models.reason_result import ReasonResult
from brain.memoryos.reason.reason_engine import ReasonEngine
from brain.memoryos.runtime.langgraph_runtime import LangGraphRuntime


class Agent:
    """MemoryOS Agent Core composed from Brain and Runtime components."""

    def __init__(
        self,
        *,
        profile: AgentProfile,
        identity: Identity,
        brain_state: BrainState | None = None,
        memory_manager: MemoryManager | None = None,
        reason_engine: ReasonEngine | None = None,
        runtime: LangGraphRuntime | None = None,
        installed_modules: Iterable[dict[str, Any]] | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        if profile.agent_id != identity.agent_id:
            raise ValueError("profile and identity must use the same agent_id")
        if brain_state is not None and brain_state.agent_id != profile.agent_id:
            raise ValueError("brain_state must use the same agent_id as profile")

        self.profile = profile.clone()
        self.identity = identity.clone()
        self.brain_state = brain_state.clone() if brain_state else BrainState(agent_id=profile.agent_id)
        self.memory_manager = memory_manager or MemoryManager()
        self.reason_engine = reason_engine or ReasonEngine()
        self.runtime = runtime or LangGraphRuntime()
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self.installed_modules: dict[str, dict[str, Any]] = {}

        for module in installed_modules or []:
            self.install_module(**module)

    def remember(
        self,
        *,
        content: str,
        type: MemoryType | str = MemoryType.SEMANTIC,
        tags: Iterable[str] | None = None,
        importance: int = 3,
        embedding: list[float] | None = None,
        metadata: dict[str, Any] | None = None,
        storage_hash: str | None = None,
        memory_id: str | None = None,
    ) -> Memory:
        """Store a memory for this Agent."""

        memory = self.memory_manager.store(
            agent_id=self.profile.agent_id,
            content=content,
            type=type,
            tags=tags,
            importance=importance,
            embedding=embedding,
            metadata=metadata,
            storage_hash=storage_hash,
            memory_id=memory_id,
        )
        with self._lock:
            self._sync_brain_state()
            self._touch_profile()

        self._log("agent_remembered", agent_id=self.profile.agent_id, memory_id=memory.id)
        return memory

    def reason(
        self,
        *,
        question: str,
        tags: Iterable[str] | None = None,
        provider_name: str | None = None,
        execution_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ReasonResult:
        """Reason over this Agent's memories and locally installed Modules."""

        with self._lock:
            modules = [deepcopy(module) for module in self.installed_modules.values()]

        result = self.reason_engine.reason(
            agent_id=self.profile.agent_id,
            question=question,
            memories=self.memory_manager.list_memories(agent_id=self.profile.agent_id),
            modules=modules,
            tags=tags,
            provider_name=provider_name,
            execution_id=execution_id,
            metadata=metadata,
        )

        with self._lock:
            now = self._normalized_now()
            self.brain_state.last_reasoned_at = result.created_at
            self.brain_state.updated_at = now
            self._touch_profile(now)

        self._log("agent_reasoned", agent_id=self.profile.agent_id, execution_id=result.execution_id)
        return result

    def get_memory(self, memory_id: str, *, increment_access: bool = True) -> Memory | None:
        """Return one Agent-owned memory by id."""

        memory = self.memory_manager.retrieve(memory_id, increment_access=False)
        if memory is None or memory.agent_id != self.profile.agent_id:
            return None
        if increment_access:
            return self.memory_manager.increment_access(memory_id)
        return memory

    def list_memories(
        self,
        *,
        type: MemoryType | str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Memory]:
        """List memories owned by this Agent."""

        return self.memory_manager.list_memories(
            agent_id=self.profile.agent_id,
            type=type,
            limit=limit,
            offset=offset,
        )

    def install_module(
        self,
        *,
        module_id: str,
        name: str | None = None,
        description: str = "",
        tags: Iterable[str] | None = None,
        importance: int = 1,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Register a Module locally for this Agent."""

        clean_module_id = module_id.strip()
        if not clean_module_id:
            raise ValueError("module_id must not be empty")
        if importance < 0:
            raise ValueError("importance must be greater than or equal to 0")

        now = self._normalized_now()
        module = {
            "module_id": clean_module_id,
            "name": (name or clean_module_id).strip(),
            "description": description.strip(),
            "tags": self._normalize_tags(tags or []),
            "importance": importance,
            "metadata": deepcopy(metadata or {}),
            "installed_at": now,
        }
        if not module["name"]:
            raise ValueError("module name must not be empty")

        with self._lock:
            if clean_module_id in self.installed_modules:
                raise ValueError(f"module id already installed: {clean_module_id}")
            self.installed_modules[clean_module_id] = deepcopy(module)
            self.brain_state.installed_modules = sorted(self.installed_modules)
            self.brain_state.updated_at = now
            self._touch_profile(now)
            result = deepcopy(module)

        self._log("agent_module_installed", agent_id=self.profile.agent_id, module_id=clean_module_id)
        return result

    def list_modules(self) -> list[dict[str, Any]]:
        """List locally registered Modules in deterministic order."""

        with self._lock:
            return [deepcopy(self.installed_modules[module_id]) for module_id in sorted(self.installed_modules)]

    def get_profile(self) -> AgentProfile:
        """Return this Agent's profile."""

        with self._lock:
            return self.profile.clone()

    def _sync_brain_state(self) -> None:
        state = self.memory_manager.get_brain_state(self.profile.agent_id)
        state.installed_modules = sorted(self.installed_modules)
        state.last_reasoned_at = self.brain_state.last_reasoned_at
        state.last_dreamed_at = self.brain_state.last_dreamed_at
        state.dream_count = self.brain_state.dream_count
        self.brain_state = state

    def _touch_profile(self, now: datetime | None = None) -> None:
        timestamp = now or self._normalized_now()
        self.profile.updated_at = timestamp

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _normalize_tags(tags: Iterable[str]) -> list[str]:
        if isinstance(tags, str):
            tags = [tags]
        seen: set[str] = set()
        normalized: list[str] = []
        for tag in tags:
            clean = tag.strip().lower()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
