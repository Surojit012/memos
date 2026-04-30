"""
memoryos.client
~~~~~~~~~~~~~~~

The core MemoryOS Python SDK client.
Provides full parity with the TypeScript memoryos-openclaw package.

Usage:
    from memoryos import MemoryOS

    client = MemoryOS(
        api_url="http://localhost:3000",
        agent_id="agent_aria_support",
    )

    # Save a memory
    result = client.memory.save("User prefers dark mode", type="semantic", tags=["preference"])

    # List memories
    memories = client.memory.list(limit=10)

    # Semantic search via 0G Compute
    results = client.memory.search("user preferences")

    # Async usage
    import asyncio
    result = asyncio.run(client.memory.async_save("async memory"))
"""

from __future__ import annotations

import json
import logging
import time
import threading
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple
from urllib.parse import quote, urlencode

import httpx

from .types import (
    AgentIdentity,
    Memory,
    MemorySaveOptions,
    MemoryType,
    Skill,
    SkillPublishInput,
)

logger = logging.getLogger("memoryos")


# ── Offline Write Queue ────────────────────────────────────────

class _OfflineQueue:
    """
    Buffers failed writes in memory.
    When the server comes back online, flushes them in order.
    """

    def __init__(self, max_size: int = 500):
        self._queue: Deque[Tuple[str, str, Optional[dict]]] = deque(maxlen=max_size)
        self._lock = threading.Lock()

    @property
    def pending(self) -> int:
        return len(self._queue)

    def enqueue(self, method: str, path: str, body: Optional[dict]) -> None:
        with self._lock:
            self._queue.append((method, path, body))
            logger.warning(f"[OfflineQueue] Buffered {method} {path} ({self.pending} pending)")

    def drain(self) -> list:
        with self._lock:
            items = list(self._queue)
            self._queue.clear()
            return items


# ── Sub-clients (namespaced API groups) ────────────────────────

class _MemoryAPI:
    """client.memory.save(), .list(), .search(), .delete()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def save(
        self,
        content: str,
        *,
        type: MemoryType = "semantic",
        tags: Optional[List[str]] = None,
        importance: int = 3,
        metadata: Optional[Dict[str, str]] = None,
    ) -> dict:
        """Save a new memory to 0G Storage."""
        return self._c._request("POST", "/api/memory", body={
            "agentId": self._c.agent_id,
            "content": content,
            "type": type,
            "tags": tags or [],
            "importance": importance,
            "metadata": metadata,
        })

    async def async_save(
        self,
        content: str,
        *,
        type: MemoryType = "semantic",
        tags: Optional[List[str]] = None,
        importance: int = 3,
        metadata: Optional[Dict[str, str]] = None,
    ) -> dict:
        """Async version of save()."""
        return await self._c._async_request("POST", "/api/memory", body={
            "agentId": self._c.agent_id,
            "content": content,
            "type": type,
            "tags": tags or [],
            "importance": importance,
            "metadata": metadata,
        })

    def list(
        self,
        *,
        type: Optional[MemoryType] = None,
        limit: int = 20,
    ) -> dict:
        """List memories for this agent."""
        params = {"agentId": self._c.agent_id}
        if type:
            params["type"] = type
        params["limit"] = str(limit)
        qs = urlencode(params)
        return self._c._request("GET", f"/api/memory?{qs}")

    async def async_list(
        self,
        *,
        type: Optional[MemoryType] = None,
        limit: int = 20,
    ) -> dict:
        """Async version of list()."""
        params = {"agentId": self._c.agent_id}
        if type:
            params["type"] = type
        params["limit"] = str(limit)
        qs = urlencode(params)
        return await self._c._async_request("GET", f"/api/memory?{qs}")

    def get(self, memory_id: str) -> dict:
        """Get a specific memory by ID."""
        return self._c._request("GET", f"/api/memory/{quote(memory_id)}")

    def search(self, query: str) -> dict:
        """Semantic search using 0G Compute embeddings."""
        return self._c._request("POST", "/api/search", body={
            "agentId": self._c.agent_id,
            "query": query,
        })

    async def async_search(self, query: str) -> dict:
        """Async version of search()."""
        return await self._c._async_request("POST", "/api/search", body={
            "agentId": self._c.agent_id,
            "query": query,
        })

    def delete(self, memory_id: str) -> dict:
        """Delete a memory."""
        return self._c._request(
            "DELETE",
            f"/api/memory/{quote(memory_id)}?agentId={quote(self._c.agent_id)}",
        )


class _SkillsAPI:
    """client.skills.list(), .publish(), .run(), .pay()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def list(self) -> dict:
        """List all skills on the marketplace."""
        return self._c._request("GET", "/api/skills")

    def publish(self, skill: SkillPublishInput) -> dict:
        """Publish a new skill."""
        data = skill.to_dict()
        if not data.get("publisherAgentId"):
            data["publisherAgentId"] = self._c.agent_id
        return self._c._request("POST", "/api/skills", body=data)

    def run(self, skill_id: str, user_input: str, payment_proof: Optional[dict] = None) -> dict:
        """Execute a skill."""
        return self._c._request("POST", "/api/execute", body={
            "skillId": skill_id,
            "userInput": user_input,
            "paymentProof": payment_proof,
        })

    def pay(self, action: str, skill_id: str, tx_hash: Optional[str] = None) -> dict:
        """Prepare or verify a payment for a paid skill."""
        return self._c._request("POST", "/api/pay", body={
            "action": action,
            "skillId": skill_id,
            "txHash": tx_hash,
        })


class _IdentityAPI:
    """client.identity.get(), .register()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def get(self) -> dict:
        """Get this agent's identity from 0G."""
        return self._c._request("GET", f"/api/identity?agentId={quote(self._c.agent_id)}")

    def register(self, name: Optional[str] = None) -> dict:
        """Register a new agent identity on 0G."""
        return self._c._request("POST", "/api/identity", body={
            "agentId": self._c.agent_id,
            "name": name or self._c.agent_id,
        })


class _SnapshotAPI:
    """client.snapshot.create(), .list()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def create(self) -> dict:
        """Take a full brain snapshot of this agent, stored on 0G."""
        return self._c._request("POST", f"/api/agent/{quote(self._c.agent_id)}/snapshot")

    def list(self) -> dict:
        """List all snapshots for this agent."""
        return self._c._request("GET", f"/api/agent/{quote(self._c.agent_id)}/snapshot")


class _RAGAPI:
    """client.rag.ask()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def ask(self, query: str) -> dict:
        """Perform Contextual RAG over the agent's 0G memories."""
        return self._c._request("POST", "/api/rag", body={
            "agentId": self._c.agent_id,
            "query": query,
        })

    async def async_ask(self, query: str) -> dict:
        """Async version of ask()."""
        return await self._c._async_request("POST", "/api/rag", body={
            "agentId": self._c.agent_id,
            "query": query,
        })


class _DreamsAPI:
    """client.dreams.sleep(), .history()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def sleep(self) -> dict:
        """
        Trigger a "dream cycle" for this agent.

        The server will:
        1. Read recent episodic memories
        2. Run semantic consolidation via 0G Compute
        3. Extract generalized patterns into new semantic memories
        4. Process importance decay on stale memories
        5. Upload all changes back to 0G Storage

        Returns a summary of consolidated facts and decayed memories.
        """
        return self._c._request("POST", f"/api/agent/{quote(self._c.agent_id)}/dreams")

    async def async_sleep(self) -> dict:
        """Async version of sleep()."""
        return await self._c._async_request("POST", f"/api/agent/{quote(self._c.agent_id)}/dreams")

    def history(self) -> dict:
        """Get the dream cycle history for this agent."""
        return self._c._request("GET", f"/api/agent/{quote(self._c.agent_id)}/dreams")

    async def async_history(self) -> dict:
        """Async version of history()."""
        return await self._c._async_request("GET", f"/api/agent/{quote(self._c.agent_id)}/dreams")


class _ReputationAPI:
    """client.reputation.get()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def get(self, agent_id: Optional[str] = None) -> dict:
        """Get the reputation score for an agent (defaults to self)."""
        target = agent_id or self._c.agent_id
        return self._c._request("GET", f"/api/agent/{quote(target)}/reputation")

    async def async_get(self, agent_id: Optional[str] = None) -> dict:
        """Async version of get()."""
        target = agent_id or self._c.agent_id
        return await self._c._async_request("GET", f"/api/agent/{quote(target)}/reputation")


class _PipelineAPI:
    """client.pipeline.run()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def run(
        self,
        steps: List[Dict[str, str]],
        initial_input: str,
    ) -> dict:
        """
        Execute a multi-skill pipeline.

        Args:
            steps: List of {"skillId": "...", "transform": "..."} dicts.
                   transform is optional and reshapes output before the next step.
            initial_input: The starting input for the first skill.

        Returns:
            Pipeline result with final output and per-step traces.
        """
        return self._c._request("POST", "/api/pipeline", body={
            "steps": steps,
            "initialInput": initial_input,
            "agentId": self._c.agent_id,
        })

    async def async_run(
        self,
        steps: List[Dict[str, str]],
        initial_input: str,
    ) -> dict:
        """Async version of run()."""
        return await self._c._async_request("POST", "/api/pipeline", body={
            "steps": steps,
            "initialInput": initial_input,
            "agentId": self._c.agent_id,
        })


class _VaultAPI:
    """client.vault.save(), .list()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def save(
        self,
        content: str,
        *,
        type: MemoryType = "semantic",
        tags: Optional[List[str]] = None,
        importance: int = 3,
    ) -> dict:
        """
        Save an encrypted memory to the vault.
        Content is AES-256-GCM encrypted before upload to 0G Storage.
        Only the owning wallet can ever decrypt it.
        """
        return self._c._request("POST", "/api/memory/encrypted", body={
            "agentId": self._c.agent_id,
            "content": content,
            "type": type,
            "tags": tags or [],
            "importance": importance,
        })

    def list(self) -> dict:
        """List all encrypted vault memories for this agent."""
        qs = f"agentId={quote(self._c.agent_id)}"
        return self._c._request("GET", f"/api/memory/encrypted?{qs}")


class _ImportAPI:
    """client.import_memories()"""

    def __init__(self, client: "MemoryOSClient"):
        self._c = client

    def bulk(
        self,
        memories: List[Dict[str, Any]],
    ) -> dict:
        """
        Bulk-import memories into this agent's 0G Storage.

        Args:
            memories: List of dicts with keys: content, type, tags, importance.
                      Max 100 per call.

        Returns:
            Import results with per-memory success/failure status.
        """
        return self._c._request("POST", f"/api/agent/{quote(self._c.agent_id)}/import", body={
            "memories": memories,
        })

    async def async_bulk(
        self,
        memories: List[Dict[str, Any]],
    ) -> dict:
        """Async version of bulk()."""
        return await self._c._async_request("POST", f"/api/agent/{quote(self._c.agent_id)}/import", body={
            "memories": memories,
        })


# ── Main Client ────────────────────────────────────────────────

class MemoryOSClient:
    """
    The MemoryOS Python SDK client.

    Provides full parity with the TypeScript ``memoryos-openclaw`` package,
    plus async methods and an offline write queue for resilience.

    Args:
        api_url: Base URL of the MemoryOS server (e.g. ``http://localhost:3000``)
        agent_id: The agent ID to operate as
        headers: Extra HTTP headers (e.g. Authorization)
        timeout: Request timeout in seconds (default 30)
        offline_queue_size: Max buffered writes when server is unreachable (default 500)
    """

    def __init__(
        self,
        api_url: str,
        agent_id: str,
        *,
        headers: Optional[Dict[str, str]] = None,
        timeout: float = 30.0,
        offline_queue_size: int = 500,
    ):
        if not api_url or not agent_id:
            raise ValueError("MemoryOSClient requires api_url and agent_id")

        self.api_url = api_url.rstrip("/")
        self.agent_id = agent_id
        self._extra_headers = headers or {}
        self._timeout = timeout
        self._offline_queue = _OfflineQueue(max_size=offline_queue_size)

        # Synchronous + async HTTP clients (lazy init for async)
        self._sync_client = httpx.Client(timeout=timeout)
        self._async_client: Optional[httpx.AsyncClient] = None

        # Sub-APIs (namespaced)
        self.memory = _MemoryAPI(self)
        self.skills = _SkillsAPI(self)
        self.identity = _IdentityAPI(self)
        self.snapshot = _SnapshotAPI(self)
        self.rag = _RAGAPI(self)
        self.dreams = _DreamsAPI(self)
        self.reputation = _ReputationAPI(self)
        self.pipeline = _PipelineAPI(self)
        self.vault = _VaultAPI(self)
        self.import_memories = _ImportAPI(self)

    def _build_headers(self, extra: Optional[dict] = None) -> dict:
        h = {"Content-Type": "application/json", **self._extra_headers}
        if extra:
            h.update(extra)
        return h

    # ── Synchronous transport ──────────────────────────────────

    def _request(self, method: str, path: str, *, body: Optional[dict] = None) -> dict:
        url = f"{self.api_url}{path}"
        kwargs: Dict[str, Any] = {"headers": self._build_headers()}
        if body is not None:
            kwargs["content"] = json.dumps(body)

        try:
            resp = self._sync_client.request(method, url, **kwargs)
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            # Offline queue: buffer writes, raise on reads
            if method in ("POST", "PUT", "DELETE") and body is not None:
                self._offline_queue.enqueue(method, path, body)
                return {"queued": True, "pending": self._offline_queue.pending}
            raise ConnectionError(f"MemoryOS server unreachable: {exc}") from exc

        data = resp.json() if resp.content else {}
        if not resp.is_success:
            raise RuntimeError(data.get("error", f"MemoryOS request failed: {resp.status_code}"))
        return data

    # ── Async transport ────────────────────────────────────────

    async def _async_request(self, method: str, path: str, *, body: Optional[dict] = None) -> dict:
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(timeout=self._timeout)

        url = f"{self.api_url}{path}"
        kwargs: Dict[str, Any] = {"headers": self._build_headers()}
        if body is not None:
            kwargs["content"] = json.dumps(body)

        try:
            resp = await self._async_client.request(method, url, **kwargs)
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            if method in ("POST", "PUT", "DELETE") and body is not None:
                self._offline_queue.enqueue(method, path, body)
                return {"queued": True, "pending": self._offline_queue.pending}
            raise ConnectionError(f"MemoryOS server unreachable: {exc}") from exc

        data = resp.json() if resp.content else {}
        if not resp.is_success:
            raise RuntimeError(data.get("error", f"MemoryOS request failed: {resp.status_code}"))
        return data

    # ── Offline queue flush ────────────────────────────────────

    def flush_offline_queue(self) -> List[dict]:
        """
        Flush all buffered offline writes to the server.
        Call this when connectivity is restored.
        Returns a list of responses for each flushed item.
        """
        items = self._offline_queue.drain()
        results = []
        for method, path, body in items:
            try:
                result = self._request(method, path, body=body)
                results.append({"success": True, "path": path, "result": result})
            except Exception as e:
                # Re-queue if still failing
                self._offline_queue.enqueue(method, path, body)
                results.append({"success": False, "path": path, "error": str(e)})
                break  # Stop flushing if server is still down
        return results

    @property
    def offline_pending(self) -> int:
        """Number of writes buffered in the offline queue."""
        return self._offline_queue.pending

    # ── Top-level helpers ──────────────────────────────────────

    def status(self) -> dict:
        """Get the MemoryOS platform status (0G connectivity, manifest, etc.)."""
        return self._request("GET", "/api/status")

    def close(self) -> None:
        """Close the underlying HTTP connections."""
        self._sync_client.close()

    async def aclose(self) -> None:
        """Close the async HTTP client."""
        if self._async_client:
            await self._async_client.aclose()

    def __repr__(self) -> str:
        return f"MemoryOSClient(api_url={self.api_url!r}, agent_id={self.agent_id!r})"
