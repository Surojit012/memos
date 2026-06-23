"""Thread-safe local Module registry for Memos."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from brain.memos.models.module import Module


class ModuleRegistry:
    """Register and list local Modules."""

    def __init__(self, *, logger: logging.Logger | None = None) -> None:
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._modules: dict[str, Module] = {}

    def register_module(
        self,
        module: Module | None = None,
        *,
        module_id: str | None = None,
        name: str | None = None,
        description: str = "",
        version: str = "0.1.0",
        author: str = "",
        tags: Iterable[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Module:
        """Register one Module with duplicate protection."""

        resolved = module.clone() if module else Module(
            module_id=module_id or "",
            name=name or module_id or "",
            description=description,
            version=version,
            author=author,
            tags=list(tags or []),
            created_at=datetime.now(timezone.utc),
            metadata=metadata or {},
        )
        with self._lock:
            if resolved.module_id in self._modules:
                raise ValueError(f"module id already registered: {resolved.module_id}")
            self._modules[resolved.module_id] = resolved.clone()
            result = self._modules[resolved.module_id].clone()

        self._log("module_registered", module_id=result.module_id)
        return result

    def get_module(self, module_id: str) -> Module | None:
        """Return one Module by id."""

        with self._lock:
            module = self._modules.get(module_id)
            return module.clone() if module else None

    def list_modules(self, *, tags: Iterable[str] | None = None, limit: int | None = None, offset: int = 0) -> list[Module]:
        """List Modules in deterministic order."""

        if offset < 0:
            raise ValueError("offset must be greater than or equal to 0")
        if limit is not None and limit < 1:
            return []
        tag_filter = self._normalize_tags(tags or [])
        with self._lock:
            modules = list(self._modules.values())
            if tag_filter:
                required = set(tag_filter)
                modules = [module for module in modules if required.issubset(set(module.tags))]
            modules.sort(key=lambda module: module.module_id)
            sliced = modules[offset : offset + limit if limit is not None else None]
            return [module.clone() for module in sliced]

    def remove_module(self, module_id: str) -> bool:
        """Remove one Module by id."""

        with self._lock:
            module = self._modules.pop(module_id, None)
            if module is None:
                return False

        self._log("module_removed", module_id=module.module_id)
        return True

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
