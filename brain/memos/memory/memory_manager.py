"""Thread-safe Remember Engine for Memos Brain."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime, timezone
import logging
import re
from threading import RLock
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from brain.memos.memory.episodic import EpisodicMemory
from brain.memos.memory.procedural import ProceduralMemory
from brain.memos.memory.semantic import SemanticMemory
from brain.memos.models.brain_state import BrainState
from brain.memos.models.memory import Memory, MemoryType


class PersistenceEvent(BaseModel):
    """Mutation event emitted by MemoryManager for future persistence adapters."""

    model_config = ConfigDict(frozen=True)

    event_type: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    memory_id: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    emitted_at: datetime


class MemoryManager:
    """Manage Agent memories for the Brain Remember layer.

    The manager is intentionally local and adapter-free. It never calls 0G,
    never performs inference, and never runs vector search. Mutations emit
    persistence events that later Adapters can consume.
    """

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        event_sink: Callable[[PersistenceEvent], None] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._event_sink = event_sink
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._memories: dict[str, Memory] = {}
        self._brain_states: dict[str, BrainState] = {}
        self._events: list[PersistenceEvent] = []
        self._sequence = 0

    def store(
        self,
        *,
        agent_id: str,
        content: str,
        type: MemoryType | str = MemoryType.SEMANTIC,
        tags: Iterable[str] | None = None,
        importance: float = 3.0,
        embedding: list[float] | None = None,
        metadata: dict[str, Any] | None = None,
        storage_hash: str | None = None,
        memory_id: str | None = None,
    ) -> Memory:
        """Store a memory and emit a persistence event."""

        now = self._normalized_now()
        memory_type = self._coerce_memory_type(type)

        with self._lock:
            resolved_id = memory_id or self._next_memory_id()
            if resolved_id in self._memories:
                raise ValueError(f"memory id already exists: {resolved_id}")

            memory = self._build_memory(
                memory_type=memory_type,
                memory_id=resolved_id,
                agent_id=agent_id,
                content=content,
                tags=list(tags or []),
                importance=importance,
                embedding=embedding,
                metadata=metadata or {},
                created_at=now,
                updated_at=now,
                storage_hash=storage_hash,
            )

            self._memories[memory.id] = memory
            self._ensure_brain_state(agent_id, now).memory_count += 1
            self._brain_states[agent_id].updated_at = now
            result = memory.clone()
            event = self._make_event(
                event_type="memory.stored",
                agent_id=agent_id,
                memory_id=memory.id,
                emitted_at=now,
                payload={"type": memory.type.value},
            )
            self._events.append(event)

        self._publish_event(event)
        self._log("memory_stored", agent_id=agent_id, memory_id=result.id, memory_type=result.type.value)
        return result

    def retrieve(self, memory_id: str, *, increment_access: bool = True) -> Memory | None:
        """Retrieve a memory by id."""

        if increment_access:
            return self.increment_access(memory_id)

        with self._lock:
            memory = self._memories.get(memory_id)
            return memory.clone() if memory else None

    def search(
        self,
        *,
        agent_id: str,
        query: str | None = None,
        tags: Iterable[str] | None = None,
        type: MemoryType | str | None = None,
        limit: int = 10,
    ) -> list[Memory]:
        """Hybrid Phase 2 search using keywords, tags, and importance.

        Vector search is intentionally not implemented in Phase 2. The
        `embedding` field exists on Memory records for future adapter use.
        """

        if limit < 1:
            return []

        memory_type = self._coerce_memory_type(type) if type is not None else None
        query_tokens = self._tokens(query or "")
        tag_terms = self._normalize_terms(tags or [])

        with self._lock:
            candidates = [
                memory
                for memory in self._memories.values()
                if memory.agent_id == agent_id and (memory_type is None or memory.type == memory_type)
            ]

            scored: list[tuple[float, datetime, str, Memory]] = []
            has_search_terms = bool(query_tokens or tag_terms)

            for memory in candidates:
                score = self._score_memory(memory, query_tokens=query_tokens, tag_terms=tag_terms)
                if has_search_terms and score <= memory.importance:
                    continue
                scored.append((score, memory.updated_at, memory.id, memory))

            scored.sort(key=lambda item: (-item[0], -item[1].timestamp(), item[2]))
            results = [memory.clone() for _, _, _, memory in scored[:limit]]

        self._log(
            "memory_search",
            agent_id=agent_id,
            result_count=len(results),
            query=query or "",
            tags=tag_terms,
        )
        return results

    def delete(self, memory_id: str) -> bool:
        """Delete a memory and emit a persistence event."""

        now = self._normalized_now()
        with self._lock:
            memory = self._memories.pop(memory_id, None)
            if memory is None:
                return False

            state = self._ensure_brain_state(memory.agent_id, now)
            state.memory_count = max(0, state.memory_count - 1)
            state.updated_at = now
            event = self._make_event(
                event_type="memory.deleted",
                agent_id=memory.agent_id,
                memory_id=memory.id,
                emitted_at=now,
            )
            self._events.append(event)

        self._publish_event(event)
        self._log("memory_deleted", agent_id=memory.agent_id, memory_id=memory.id)
        return True

    def list_memories(
        self,
        *,
        agent_id: str | None = None,
        type: MemoryType | str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Memory]:
        """List memories in deterministic order."""

        if offset < 0:
            raise ValueError("offset must be greater than or equal to 0")
        if limit is not None and limit < 1:
            return []

        memory_type = self._coerce_memory_type(type) if type is not None else None

        with self._lock:
            memories = [
                memory
                for memory in self._memories.values()
                if (agent_id is None or memory.agent_id == agent_id)
                and (memory_type is None or memory.type == memory_type)
            ]
            memories.sort(key=lambda memory: (-memory.importance, -memory.updated_at.timestamp(), memory.id))
            sliced = memories[offset : offset + limit if limit is not None else None]
            return [memory.clone() for memory in sliced]

    def increment_access(self, memory_id: str) -> Memory | None:
        """Increment access count for a memory and emit a persistence event."""

        now = self._normalized_now()
        with self._lock:
            memory = self._memories.get(memory_id)
            if memory is None:
                return None

            memory.access_count += 1
            memory.updated_at = now
            self._ensure_brain_state(memory.agent_id, now).updated_at = now
            result = memory.clone()
            event = self._make_event(
                event_type="memory.accessed",
                agent_id=memory.agent_id,
                memory_id=memory.id,
                emitted_at=now,
                payload={"access_count": memory.access_count},
            )
            self._events.append(event)

        self._publish_event(event)
        self._log("memory_accessed", agent_id=result.agent_id, memory_id=result.id, access_count=result.access_count)
        return result

    def update_importance(self, memory_id: str, importance: float) -> Memory | None:
        """Update memory importance and emit a persistence event."""

        now = self._normalized_now()
        with self._lock:
            memory = self._memories.get(memory_id)
            if memory is None:
                return None

            old_importance = memory.importance
            memory.importance = importance
            memory.updated_at = now
            self._ensure_brain_state(memory.agent_id, now).updated_at = now
            result = memory.clone()
            event = self._make_event(
                event_type="memory.importance_updated",
                agent_id=memory.agent_id,
                memory_id=memory.id,
                emitted_at=now,
                payload={"old_importance": old_importance, "importance": memory.importance},
            )
            self._events.append(event)

        self._publish_event(event)
        self._log(
            "memory_importance_updated",
            agent_id=result.agent_id,
            memory_id=result.id,
            importance=result.importance,
        )
        return result

    def get_brain_state(self, agent_id: str) -> BrainState:
        """Return a copy of an Agent's Brain state summary."""

        now = self._normalized_now()
        with self._lock:
            return self._ensure_brain_state(agent_id, now).clone()

    def drain_persistence_events(self) -> list[PersistenceEvent]:
        """Return and clear emitted persistence events."""

        with self._lock:
            events = list(self._events)
            self._events.clear()
            return events

    def peek_persistence_events(self) -> list[PersistenceEvent]:
        """Return emitted persistence events without clearing them."""

        with self._lock:
            return list(self._events)

    def _build_memory(
        self,
        *,
        memory_type: MemoryType,
        memory_id: str,
        agent_id: str,
        content: str,
        tags: list[str],
        importance: float,
        embedding: list[float] | None,
        metadata: dict[str, Any],
        created_at: datetime,
        updated_at: datetime,
        storage_hash: str | None,
    ) -> Memory:
        common: dict[str, Any] = {
            "id": memory_id,
            "agent_id": agent_id,
            "content": content,
            "tags": tags,
            "importance": importance,
            "embedding": embedding,
            "metadata": metadata,
            "created_at": created_at,
            "updated_at": updated_at,
            "storage_hash": storage_hash,
        }
        if memory_type == MemoryType.EPISODIC:
            return EpisodicMemory.create(**common)
        if memory_type == MemoryType.SEMANTIC:
            return SemanticMemory.create(**common)
        if memory_type == MemoryType.PROCEDURAL:
            return ProceduralMemory.create(**common)
        raise ValueError(f"unsupported memory type: {memory_type}")

    def _score_memory(self, memory: Memory, *, query_tokens: list[str], tag_terms: list[str]) -> float:
        score = memory.importance
        content = memory.content.lower()
        content_tokens = self._tokens(memory.content)
        tag_set = set(memory.tags)

        for token in query_tokens:
            score += content_tokens.count(token) * 10
            if token in content and token not in content_tokens:
                score += 3
            if token in tag_set:
                score += 8
            else:
                score += sum(4 for tag in tag_set if token in tag)

        for tag in tag_terms:
            if tag in tag_set:
                score += 12
            else:
                score += sum(5 for existing in tag_set if tag in existing)

        return score

    def _publish_event(self, event: PersistenceEvent) -> None:
        if self._event_sink is None:
            return

        try:
            self._event_sink(event)
        except Exception:
            self._logger.exception(
                "persistence_event_sink_failed",
                extra={"event_type": event.event_type, "agent_id": event.agent_id, "memory_id": event.memory_id},
            )

    def _make_event(
        self,
        *,
        event_type: str,
        agent_id: str,
        memory_id: str,
        emitted_at: datetime,
        payload: dict[str, Any] | None = None,
    ) -> PersistenceEvent:
        return PersistenceEvent(
            event_type=event_type,
            agent_id=agent_id,
            memory_id=memory_id,
            payload=payload or {},
            emitted_at=emitted_at,
        )

    def _ensure_brain_state(self, agent_id: str, now: datetime) -> BrainState:
        state = self._brain_states.get(agent_id)
        if state is None:
            state = BrainState(agent_id=agent_id, updated_at=now)
            self._brain_states[agent_id] = state
        return state

    def _next_memory_id(self) -> str:
        self._sequence += 1
        return f"mem_{self._sequence:012d}"

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _coerce_memory_type(value: MemoryType | str) -> MemoryType:
        if isinstance(value, MemoryType):
            return value
        try:
            return MemoryType(value)
        except ValueError as exc:
            raise ValueError(f"unsupported memory type: {value}") from exc

    @staticmethod
    def _normalize_terms(values: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        terms: list[str] = []
        for value in values:
            clean = value.strip().lower()
            if clean and clean not in seen:
                seen.add(clean)
                terms.append(clean)
        return terms

    @staticmethod
    def _tokens(value: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", value.lower())

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
