"""Local Module execution for Memos."""

from __future__ import annotations

from datetime import datetime, timezone
import inspect
import logging
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from brain.memos.modules.module_loader import LoadedModule


class ModuleExecutionResult(BaseModel):
    """Deterministic local Module execution envelope."""

    model_config = ConfigDict(frozen=False, validate_assignment=True)

    module_id: str = Field(..., min_length=1)
    output: Any
    metadata: dict[str, Any] = Field(default_factory=dict)
    executed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("executed_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "ModuleExecutionResult":
        """Return a deep copy safe for callers to mutate."""

        return self.model_copy(deep=True)


class ModuleExecutor:
    """Execute loaded local Modules without external services."""

    def __init__(self, *, logger: logging.Logger | None = None) -> None:
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()

    def execute(self, loaded_module: LoadedModule, inputs: dict[str, Any] | None = None) -> ModuleExecutionResult:
        """Execute a loaded Module handler locally."""

        clean_inputs = dict(inputs or {})
        self.validate_inputs(loaded_module, clean_inputs)
        with self._lock:
            output = self._invoke_handler(loaded_module, clean_inputs)
            result = ModuleExecutionResult(
                module_id=loaded_module.module.module_id,
                output=output,
                metadata=self.collect_metadata(loaded_module, clean_inputs, output),
            )

        self._log("module_executed", module_id=result.module_id)
        return result

    def validate_inputs(self, loaded_module: LoadedModule, inputs: dict[str, Any]) -> None:
        """Validate required manifest inputs are present."""

        input_schema = loaded_module.manifest.inputs
        for name, spec in input_schema.items():
            required = True
            expected_type: str | None = None
            if isinstance(spec, dict):
                required = bool(spec.get("required", True))
                expected_type = spec.get("type")
            if required and name not in inputs:
                raise ValueError(f"missing required module input: {name}")
            if expected_type and name in inputs and not self._matches_type(inputs[name], expected_type):
                raise ValueError(f"module input has invalid type: {name}")

    def collect_metadata(self, loaded_module: LoadedModule, inputs: dict[str, Any], output: Any) -> dict[str, Any]:
        """Collect deterministic execution metadata."""

        return {
            "entrypoint": loaded_module.manifest.entrypoint,
            "input_keys": sorted(inputs),
            "output_type": type(output).__name__,
            "permissions": list(loaded_module.manifest.permissions),
            "price": loaded_module.manifest.price,
        }

    def _invoke_handler(self, loaded_module: LoadedModule, inputs: dict[str, Any]) -> Any:
        signature = inspect.signature(loaded_module.handler)
        parameters = list(signature.parameters.values())
        if len(parameters) == 0:
            return loaded_module.handler()
        if len(parameters) == 1:
            return loaded_module.handler(inputs)
        return loaded_module.handler(**inputs)

    @staticmethod
    def _matches_type(value: Any, expected_type: str) -> bool:
        normalized = expected_type.strip().lower()
        type_map = {
            "any": object,
            "bool": bool,
            "boolean": bool,
            "dict": dict,
            "float": (float, int),
            "int": int,
            "integer": int,
            "list": list,
            "number": (float, int),
            "str": str,
            "string": str,
        }
        expected = type_map.get(normalized)
        if expected is None or expected is object:
            return True
        return isinstance(value, expected)

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
