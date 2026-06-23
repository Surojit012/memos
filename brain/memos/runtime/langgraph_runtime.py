"""LangGraph runtime state manager for Memos."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import logging
from threading import RLock
from typing import Any

from brain.memos.runtime.execution_context import ExecutionContext, ExecutionStatus
from brain.memos.runtime.graph_builder import GraphBuilder
from brain.memos.runtime.langgraph_checkpointer import LangGraphCheckpointer
from brain.memos.runtime.thread_manager import ThreadManager


class LangGraphRuntime:
    """Manage Runtime execution state without owning cognition."""

    def __init__(
        self,
        *,
        graph_builder: GraphBuilder | None = None,
        thread_manager: ThreadManager | None = None,
        checkpointer: LangGraphCheckpointer | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._clock = clock or self._utc_now
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.graph_builder = graph_builder or GraphBuilder(clock=self._clock, logger=self._logger)
        self.thread_manager = thread_manager or ThreadManager(clock=self._clock, logger=self._logger)
        self.checkpointer = checkpointer or LangGraphCheckpointer(clock=self._clock, logger=self._logger)
        self._lock = RLock()
        self._executions: dict[str, ExecutionContext] = {}
        self._sequence = 0

    def start(
        self,
        *,
        agent_id: str,
        graph_id: str,
        thread_id: str | None = None,
        execution_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ExecutionContext:
        """Start runtime execution state for a registered graph."""

        now = self._normalized_now()
        graph = self.graph_builder.get_graph(graph_id)
        if graph is None:
            raise ValueError(f"graph is not registered: {graph_id}")

        with self._lock:
            resolved_execution_id = execution_id or self._next_execution_id()
            if resolved_execution_id in self._executions:
                raise ValueError(f"execution id already exists: {resolved_execution_id}")

            thread = self.thread_manager.get_thread(thread_id) if thread_id else None
            if thread_id and thread is None:
                raise ValueError(f"thread is not registered: {thread_id}")
            if thread and thread.agent_id != agent_id:
                raise ValueError(f"thread does not belong to agent: {thread_id}")
            if thread is None:
                thread = self.thread_manager.create_thread(agent_id=agent_id)

            context = ExecutionContext(
                execution_id=resolved_execution_id,
                thread_id=thread.thread_id,
                agent_id=agent_id,
                graph_id=graph_id,
                status=ExecutionStatus.RUNNING,
                started_at=now,
                updated_at=now,
                metadata=metadata or {},
            )
            self._executions[context.execution_id] = context
            self.thread_manager.update_status(context.thread_id, ExecutionStatus.RUNNING)
            result = context.clone()

        self._log(
            "runtime_started",
            agent_id=result.agent_id,
            thread_id=result.thread_id,
            execution_id=result.execution_id,
            graph_id=result.graph_id,
        )
        return result

    def pause(self, execution_id: str, *, metadata: dict[str, Any] | None = None) -> ExecutionContext | None:
        """Pause a running execution."""

        return self._transition(
            execution_id,
            from_statuses={ExecutionStatus.RUNNING},
            to_status=ExecutionStatus.PAUSED,
            event="runtime_paused",
            metadata=metadata,
        )

    def resume(self, execution_id: str, *, metadata: dict[str, Any] | None = None) -> ExecutionContext | None:
        """Resume a paused execution."""

        return self._transition(
            execution_id,
            from_statuses={ExecutionStatus.PAUSED},
            to_status=ExecutionStatus.RUNNING,
            event="runtime_resumed",
            metadata=metadata,
        )

    def stop(
        self,
        execution_id: str,
        *,
        failed: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> ExecutionContext | None:
        """Stop execution state as completed or failed."""

        return self._transition(
            execution_id,
            from_statuses={ExecutionStatus.PENDING, ExecutionStatus.RUNNING, ExecutionStatus.PAUSED},
            to_status=ExecutionStatus.FAILED if failed else ExecutionStatus.COMPLETED,
            event="runtime_failed" if failed else "runtime_completed",
            metadata=metadata,
        )

    def get_execution(self, execution_id: str) -> ExecutionContext | None:
        """Return runtime execution state by id."""

        with self._lock:
            execution = self._executions.get(execution_id)
            return execution.clone() if execution else None

    def _transition(
        self,
        execution_id: str,
        *,
        from_statuses: set[ExecutionStatus],
        to_status: ExecutionStatus,
        event: str,
        metadata: dict[str, Any] | None,
    ) -> ExecutionContext | None:
        now = self._normalized_now()
        with self._lock:
            execution = self._executions.get(execution_id)
            if execution is None:
                return None
            if execution.status not in from_statuses:
                raise ValueError(
                    f"cannot transition execution {execution_id} from {execution.status.value} to {to_status.value}"
                )

            execution.status = to_status
            execution.updated_at = now
            if metadata:
                execution.metadata.update(metadata)
            self.thread_manager.update_status(execution.thread_id, to_status)
            result = execution.clone()

        self._log(
            event,
            agent_id=result.agent_id,
            thread_id=result.thread_id,
            execution_id=result.execution_id,
            status=result.status.value,
        )
        return result

    def _next_execution_id(self) -> str:
        self._sequence += 1
        return f"execution_{self._sequence:012d}"

    def _normalized_now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    def _log(self, event: str, **fields: Any) -> None:
        self._logger.info(event, extra={"memos": fields})
