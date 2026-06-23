"""Local filesystem Module loader for Memos."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import ast
import hashlib
import importlib.util
import json
import logging
from pathlib import Path
import sys
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from brain.memos.models.module import Module
from brain.memos.models.module_manifest import ModuleManifest
from brain.memos.modules.module_validator import ModuleValidator


class LoadedModule(BaseModel):
    """Loaded local Module handler and metadata."""

    model_config = ConfigDict(frozen=False, validate_assignment=True, arbitrary_types_allowed=True)

    module: Module
    manifest: ModuleManifest
    module_path: Path
    handler: Callable[..., Any]
    loaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)

    def clone(self) -> "LoadedModule":
        """Return a copy preserving the loaded handler reference."""

        copy = self.model_copy(deep=False)
        copy.module = self.module.clone()
        copy.manifest = self.manifest.clone()
        copy.metadata = dict(self.metadata)
        return copy


class ModuleLoader:
    """Load, unload, and reload local Module packages."""

    def __init__(self, *, validator: ModuleValidator | None = None, logger: logging.Logger | None = None) -> None:
        self.validator = validator or ModuleValidator(logger=logger)
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._loaded: dict[str, LoadedModule] = {}
        self._python_module_names: dict[str, str] = {}

    def load_module(self, module_path: str | Path) -> LoadedModule:
        """Load a local Module package from disk."""

        root = Path(module_path).expanduser().resolve()
        structure = self.validator.validate_structure(root)
        manifest_data = self._read_manifest(structure["manifest"])
        manifest = self.validator.validate_manifest(manifest_data)
        entrypoint_file, function_name = self._parse_entrypoint(manifest.entrypoint)
        handler_path = (root / entrypoint_file).resolve()
        if root not in handler_path.parents and handler_path != root:
            raise ValueError("module entrypoint must stay inside the module directory")
        if handler_path != structure["handler"].resolve():
            raise ValueError("module entrypoint must resolve to handler.py")

        with self._lock:
            if manifest.module_id in self._loaded:
                raise ValueError(f"module already loaded: {manifest.module_id}")
            python_module_name = self._python_module_name(root, manifest.module_id)
            handler = self._load_handler(handler_path, python_module_name, function_name)
            module = Module(
                module_id=manifest.module_id,
                name=str(manifest_data.get("name") or manifest.module_id),
                description=str(manifest_data.get("description") or ""),
                version=str(manifest_data.get("version") or "0.1.0"),
                author=str(manifest_data.get("author") or ""),
                tags=list(manifest_data.get("tags") or []),
                metadata={"module_path": str(root)},
            )
            loaded = LoadedModule(
                module=module,
                manifest=manifest,
                module_path=root,
                handler=handler,
                metadata={"handler": function_name, "python_module": python_module_name},
            )
            self._loaded[manifest.module_id] = loaded
            self._python_module_names[manifest.module_id] = python_module_name
            result = loaded.clone()

        self._log("module_loaded", module_id=result.module.module_id, module_path=str(root))
        return result

    def unload_module(self, module_id: str) -> bool:
        """Unload a local Module package."""

        with self._lock:
            loaded = self._loaded.pop(module_id, None)
            python_module_name = self._python_module_names.pop(module_id, None)
            if loaded is None:
                return False
            if python_module_name:
                sys.modules.pop(python_module_name, None)

        self._log("module_unloaded", module_id=module_id)
        return True

    def reload_module(self, module_id: str) -> LoadedModule:
        """Reload a previously loaded local Module package."""

        with self._lock:
            loaded = self._loaded.get(module_id)
            if loaded is None:
                raise ValueError(f"module is not loaded: {module_id}")
            module_path = loaded.module_path
        self.unload_module(module_id)
        return self.load_module(module_path)

    def get_loaded_module(self, module_id: str) -> LoadedModule | None:
        """Return a loaded Module by id."""

        with self._lock:
            loaded = self._loaded.get(module_id)
            return loaded.clone() if loaded else None

    def _read_manifest(self, manifest_path: Path) -> dict[str, Any]:
        content = manifest_path.read_text(encoding="utf-8")
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = self._parse_simple_yaml(content)
        if not isinstance(parsed, dict):
            raise ValueError("manifest.yaml must parse to a mapping")
        return parsed

    def _parse_simple_yaml(self, content: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        current_key: str | None = None
        current_nested_key: str | None = None
        for raw_line in content.splitlines():
            line = raw_line.rstrip()
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if line.startswith("    ") and current_key and current_nested_key:
                existing = result.setdefault(current_key, {})
                if not isinstance(existing, dict):
                    raise ValueError(f"manifest key must be a mapping: {current_key}")
                nested = existing.setdefault(current_nested_key, {})
                if not isinstance(nested, dict):
                    raise ValueError(f"manifest key must be a nested mapping: {current_nested_key}")
                nested_key, nested_value = self._split_key_value(stripped)
                nested[nested_key] = self._parse_scalar(nested_value)
                continue
            if line.startswith("  - ") and current_key:
                existing = result.setdefault(current_key, [])
                if existing == {}:
                    existing = []
                    result[current_key] = existing
                if not isinstance(existing, list):
                    raise ValueError(f"manifest key must be a list: {current_key}")
                existing.append(self._parse_scalar(stripped[2:].strip()))
                current_nested_key = None
                continue
            if line.startswith("  ") and current_key:
                existing = result.setdefault(current_key, {})
                if not isinstance(existing, dict):
                    raise ValueError(f"manifest key must be a mapping: {current_key}")
                nested_key, nested_value = self._split_key_value(stripped)
                if nested_value == "":
                    existing[nested_key] = {}
                    current_nested_key = nested_key
                else:
                    existing[nested_key] = self._parse_scalar(nested_value)
                    current_nested_key = None
                continue
            key, value = self._split_key_value(stripped)
            current_key = key
            current_nested_key = None
            result[key] = {} if value == "" else self._parse_scalar(value)
        return result

    @staticmethod
    def _split_key_value(line: str) -> tuple[str, str]:
        if ":" not in line:
            raise ValueError(f"invalid manifest line: {line}")
        key, value = line.split(":", 1)
        clean_key = key.strip()
        if not clean_key:
            raise ValueError("manifest keys must not be empty")
        return clean_key, value.strip()

    @staticmethod
    def _parse_scalar(value: str) -> Any:
        if value == "":
            return ""
        lower = value.lower()
        if lower in {"true", "false"}:
            return lower == "true"
        if lower in {"null", "none"}:
            return None
        if value.startswith("[") or value.startswith("{"):
            return ast.literal_eval(value)
        try:
            if "." in value:
                return float(value)
            return int(value)
        except ValueError:
            return value.strip("\"'")

    @staticmethod
    def _parse_entrypoint(entrypoint: str) -> tuple[Path, str]:
        path_value, function_name = entrypoint.split(":", 1)
        return Path(path_value.strip()), function_name.strip()

    @staticmethod
    def _python_module_name(root: Path, module_id: str) -> str:
        digest = hashlib.sha256(str(root).encode("utf-8")).hexdigest()[:16]
        safe_module_id = "".join(char if char.isalnum() else "_" for char in module_id)
        return f"memos_module_{safe_module_id}_{digest}"

    def _load_handler(self, handler_path: Path, python_module_name: str, function_name: str) -> Callable[..., Any]:
        spec = importlib.util.spec_from_file_location(python_module_name, handler_path)
        if spec is None or spec.loader is None:
            raise ValueError(f"unable to load handler: {handler_path}")
        python_module = importlib.util.module_from_spec(spec)
        sys.modules[python_module_name] = python_module
        try:
            spec.loader.exec_module(python_module)
        except Exception:
            sys.modules.pop(python_module_name, None)
            raise
        handler = getattr(python_module, function_name, None)
        if not callable(handler):
            sys.modules.pop(python_module_name, None)
            raise ValueError(f"handler function not found: {function_name}")
        return handler

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
