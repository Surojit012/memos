"""Restore hooks for Memos persistence."""

from __future__ import annotations

from collections.abc import Callable
import logging
from threading import RLock
from typing import Any


class RestoreManager:
    """Restore local snapshots through future adapter hooks."""

    def __init__(
        self,
        *,
        memory_source: Callable[[str], list[Any]] | None = None,
        dream_source: Callable[[str], list[Any]] | None = None,
        module_source: Callable[[str], list[Any]] | None = None,
        checkpoint_source: Callable[[str], list[Any]] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._memory_source = memory_source
        self._dream_source = dream_source
        self._module_source = module_source
        self._checkpoint_source = checkpoint_source
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()

    def restore_memories(self, agent_id: str) -> list[Any]:
        """Restore memories for an Agent from the configured hook."""

        return self._restore(agent_id, self._memory_source, "memories_restored")

    def restore_dreams(self, agent_id: str) -> list[Any]:
        """Restore dreams for an Agent from the configured hook."""

        return self._restore(agent_id, self._dream_source, "dreams_restored")

    def restore_modules(self, agent_id: str) -> list[Any]:
        """Restore modules for an Agent from the configured hook."""

        return self._restore(agent_id, self._module_source, "modules_restored")

    def restore_checkpoints(self, agent_id: str) -> list[Any]:
        """Restore checkpoints for an Agent from the configured hook."""

        return self._restore(agent_id, self._checkpoint_source, "checkpoints_restored")

    def _restore(self, agent_id: str, source: Callable[[str], list[Any]] | None, event: str) -> list[Any]:
        with self._lock:
            restored = list(source(agent_id)) if source else []
        self._log(event, agent_id=agent_id, count=len(restored))
        return restored

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
