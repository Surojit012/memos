"""Graph registry for the MemoryOS Runtime layer."""

from __future__ import annotations

from collections.abc import Callable
from copy import deepcopy
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GraphDefinition(BaseModel):
    """Registered LangGraph Graph reference."""

    model_config = ConfigDict(frozen=False, validate_assignment=True, arbitrary_types_allowed=True)

    graph_id: str = Field(..., min_length=1)
    graph: Any
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("created_at", "updated_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def clone(self) -> "GraphDefinition":
        """Return a copy of graph metadata and the original graph reference."""

        copy = self.model_copy(deep=False)
        copy.metadata = deepcopy(self.metadata)
        return copy


class GraphBuilder:
    """Thread-safe registry for LangGraph Graph references."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._graphs: dict[str, GraphDefinition] = {}

    def register_graph(
        self,
        *,
        graph_id: str,
        graph: Any,
        metadata: dict[str, Any] | None = None,
        replace: bool = False,
    ) -> GraphDefinition:
        """Register a LangGraph Graph reference."""

        now = self._normalized_now()
        with self._lock:
            if graph_id in self._graphs and not replace:
                raise ValueError(f"graph id already exists: {graph_id}")

            existing = self._graphs.get(graph_id)
            created_at = existing.created_at if existing else now
            definition = GraphDefinition(
                graph_id=graph_id,
                graph=graph,
                metadata=metadata or {},
                created_at=created_at,
                updated_at=now,
            )
            self._graphs[graph_id] = definition
            result = definition.clone()

        self._log("graph_registered", graph_id=result.graph_id, replaced=existing is not None)
        return result

    def get_graph(self, graph_id: str) -> GraphDefinition | None:
        """Return a registered graph by id."""

        with self._lock:
            graph = self._graphs.get(graph_id)
            return graph.clone() if graph else None

    def list_graphs(self, *, limit: int | None = None, offset: int = 0) -> list[GraphDefinition]:
        """List registered graphs in deterministic order."""

        if offset < 0:
            raise ValueError("offset must be greater than or equal to 0")
        if limit is not None and limit < 1:
            return []

        with self._lock:
            graphs = list(self._graphs.values())
            graphs.sort(key=lambda graph: graph.graph_id)
            sliced = graphs[offset : offset + limit if limit is not None else None]
            return [graph.clone() for graph in sliced]

    def remove_graph(self, graph_id: str) -> bool:
        """Remove a registered graph."""

        with self._lock:
            graph = self._graphs.pop(graph_id, None)
            if graph is None:
                return False

        self._log("graph_removed", graph_id=graph.graph_id)
        return True

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memoryos": fields})
