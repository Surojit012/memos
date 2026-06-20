"""Validation for local MemoryOS Module packages."""

from __future__ import annotations

from pathlib import Path
import logging
from threading import RLock
from typing import Any

from brain.memoryos.models.module_manifest import ModuleManifest


class ModuleValidator:
    """Validate Module manifests, package structure, and permissions."""

    def __init__(self, *, logger: logging.Logger | None = None) -> None:
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()

    def validate_manifest(self, manifest: ModuleManifest | dict[str, Any]) -> ModuleManifest:
        """Validate and normalize a Module manifest."""

        resolved = manifest.clone() if isinstance(manifest, ModuleManifest) else ModuleManifest(**manifest)
        self.validate_permissions(resolved.permissions)
        entrypoint_path, function_name = self._parse_entrypoint(resolved.entrypoint)
        if entrypoint_path.name != "handler.py":
            raise ValueError("module entrypoint must target handler.py")
        if not function_name:
            raise ValueError("module entrypoint must include a callable name")
        self._log("manifest_validated", module_id=resolved.module_id)
        return resolved

    def validate_structure(self, module_path: str | Path) -> dict[str, Path]:
        """Validate manifest.yaml, handler.py, and README.md exist locally."""

        root = Path(module_path).expanduser().resolve()
        if not root.exists() or not root.is_dir():
            raise ValueError(f"module path must be an existing directory: {root}")
        required = {
            "manifest": root / "manifest.yaml",
            "handler": root / "handler.py",
            "readme": root / "README.md",
        }
        missing = [path.name for path in required.values() if not path.exists() or not path.is_file()]
        if missing:
            raise ValueError(f"module package missing required files: {', '.join(sorted(missing))}")
        self._log("module_structure_validated", module_path=str(root))
        return required

    def validate_permissions(self, permissions: list[str]) -> list[str]:
        """Validate local-only Module permissions."""

        forbidden = self._forbidden_permissions()
        normalized: list[str] = []
        seen: set[str] = set()
        with self._lock:
            for permission in permissions:
                clean = permission.strip().lower()
                if not clean:
                    continue
                if clean in forbidden or any(token in clean for token in forbidden):
                    raise ValueError(f"permission is not allowed for local Modules: {clean}")
                if clean not in seen:
                    seen.add(clean)
                    normalized.append(clean)
        return normalized

    def _parse_entrypoint(self, entrypoint: str) -> tuple[Path, str]:
        if "://" in entrypoint:
            raise ValueError("module entrypoint must be a local file reference")
        if ":" not in entrypoint:
            raise ValueError("module entrypoint must use file.py:function format")
        path_value, function_name = entrypoint.split(":", 1)
        return Path(path_value.strip()), function_name.strip()

    @staticmethod
    def _forbidden_permissions() -> set[str]:
        return {
            "0g",
            "chain",
            "dashboard",
            "economy",
            "langgraph",
            "marketplace",
            "network",
            "payment",
            "payments",
            "remote",
            "wallet",
        }

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
