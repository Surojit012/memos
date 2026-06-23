"""Agent Core for Memos."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from copy import deepcopy
from datetime import datetime, timezone
import logging
from pathlib import Path
from threading import RLock
from typing import Any

from brain.memos.agent.identity import Identity
from brain.memos.memory.memory_manager import MemoryManager
from brain.memos.models.agent_profile import AgentProfile
from brain.memos.models.brain_state import BrainState
from brain.memos.models.memory import Memory, MemoryType
from brain.memos.models.module_result import ModuleResult
from brain.memos.models.reason_result import ReasonResult
from brain.memos.modules.module_executor import ModuleExecutor
from brain.memos.modules.module_loader import ModuleLoader
from brain.memos.modules.module_registry import ModuleRegistry
from brain.memos.reason.reason_engine import ReasonEngine
from brain.memos.runtime.langgraph_runtime import LangGraphRuntime


class Agent:
    """Memos Agent Core composed from Brain and Runtime components."""

    def __init__(
        self,
        *,
        profile: AgentProfile,
        identity: Identity,
        brain_state: BrainState | None = None,
        memory_manager: MemoryManager | None = None,
        reason_engine: ReasonEngine | None = None,
        runtime: LangGraphRuntime | None = None,
        module_registry: ModuleRegistry | None = None,
        module_loader: ModuleLoader | None = None,
        module_executor: ModuleExecutor | None = None,
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
        self.module_registry = module_registry or ModuleRegistry()
        self.module_loader = module_loader or ModuleLoader()
        self.module_executor = module_executor or ModuleExecutor()
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self.installed_modules: dict[str, dict[str, Any]] = {}
        self._module_execution_sequence = 0

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
        version: str = "0.1.0",
        author: str = "",
        tags: Iterable[str] | None = None,
        importance: int = 1,
        module_path: str | Path | None = None,
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
            "version": version.strip(),
            "author": author.strip(),
            "tags": self._normalize_tags(tags or []),
            "importance": importance,
            "metadata": deepcopy(metadata or {}),
            "installed_at": now,
        }
        if module_path is not None:
            module["module_path"] = str(Path(module_path).expanduser().resolve())
        if not module["name"]:
            raise ValueError("module name must not be empty")
        if not module["version"]:
            raise ValueError("module version must not be empty")

        with self._lock:
            if clean_module_id in self.installed_modules:
                raise ValueError(f"module id already installed: {clean_module_id}")
            registered_module = self.module_registry.register_module(
                module_id=clean_module_id,
                name=module["name"],
                description=module["description"],
                version=module["version"],
                author=module["author"],
                tags=module["tags"],
                metadata={
                    **deepcopy(module["metadata"]),
                    **({"module_path": module["module_path"]} if "module_path" in module else {}),
                },
            )
            self.installed_modules[clean_module_id] = deepcopy(module)
            self.brain_state.installed_modules = sorted(self.installed_modules)
            self.brain_state.updated_at = now
            self._touch_profile(now)
            result = deepcopy(module)
            result["registry_module"] = registered_module.model_dump()

        self._log("agent_module_installed", agent_id=self.profile.agent_id, module_id=clean_module_id)
        return result

    def use_module(
        self,
        *,
        module_id: str,
        inputs: dict[str, Any] | None = None,
        execution_id: str | None = None,
    ) -> ModuleResult:
        """Execute an installed local Module."""

        clean_module_id = module_id.strip()
        if not clean_module_id:
            raise ValueError("module_id must not be empty")

        with self._lock:
            installed = deepcopy(self.installed_modules.get(clean_module_id))
            if installed is None:
                raise ValueError(f"module is not installed: {clean_module_id}")
            registered = self.module_registry.get_module(clean_module_id)
            if registered is None:
                raise ValueError(f"module is not registered: {clean_module_id}")
            resolved_execution_id = execution_id or self._next_module_execution_id()

        module_path = installed.get("module_path") or registered.metadata.get("module_path")
        if not module_path:
            raise ValueError(f"module has no local module_path: {clean_module_id}")

        loaded = self.module_loader.get_loaded_module(clean_module_id)
        if loaded is None:
            loaded = self.module_loader.load_module(module_path)
        if loaded.module.module_id != clean_module_id:
            raise ValueError(f"loaded module id does not match installed module: {clean_module_id}")
        execution = self.module_executor.execute(loaded, inputs or {})
        created_at = self._normalized_now()
        result = ModuleResult(
            execution_id=resolved_execution_id,
            agent_id=self.profile.agent_id,
            module_id=clean_module_id,
            inputs=deepcopy(inputs or {}),
            outputs=execution.output,
            metadata={
                **execution.metadata,
                "module_name": registered.name,
                "module_version": registered.version,
            },
            latency_ms=0,
            created_at=created_at,
        )

        with self._lock:
            self.brain_state.updated_at = created_at
            self._touch_profile(created_at)

        self._log(
            "agent_module_used",
            agent_id=self.profile.agent_id,
            module_id=clean_module_id,
            execution_id=result.execution_id,
        )
        return result

    def uninstall_module(self, module_id: str) -> bool:
        """Uninstall a local Module for this Agent."""

        clean_module_id = module_id.strip()
        if not clean_module_id:
            raise ValueError("module_id must not be empty")
        now = self._normalized_now()
        with self._lock:
            if clean_module_id not in self.installed_modules:
                raise ValueError(f"module is not installed: {clean_module_id}")
            self.installed_modules.pop(clean_module_id)
            self.module_registry.remove_module(clean_module_id)
            self.module_loader.unload_module(clean_module_id)
            self.brain_state.installed_modules = sorted(self.installed_modules)
            self.brain_state.updated_at = now
            self._touch_profile(now)

        self._log("agent_module_uninstalled", agent_id=self.profile.agent_id, module_id=clean_module_id)
        return True

    def get_installed_module(self, module_id: str) -> dict[str, Any] | None:
        """Return one locally installed Module."""

        with self._lock:
            module = self.installed_modules.get(module_id)
            return deepcopy(module) if module else None

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

    def _next_module_execution_id(self) -> str:
        self._module_execution_sequence += 1
        return f"module_exec_{self._module_execution_sequence:012d}"

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
        self._logger.info(event, extra={"memos": fields})
