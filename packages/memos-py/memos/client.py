"""Synchronous HTTP client for the memos API."""
from __future__ import annotations

from typing import Dict, List, Optional

import httpx

from .exceptions import AuthError, MemosError, NotFoundError, RateLimitError, ServerError
from .models import DreamResult, Memory, RAGResponse, SearchResult, Skill, SkillResult


class MemosClient:
    """Python client for the memos API.

    Usage::

        from memos import MemosClient

        client = MemosClient(
            api_key="mk0s_your_key",
            agent_id="your_agent_id",
            base_url="https://memos.io"
        )

        with MemosClient(api_key=..., agent_id=...) as client:
            client.store_memory("...")
    """

    def __init__(
        self,
        api_key: str,
        agent_id: str,
        base_url: str = "https://memos.io",
        timeout: float = 30.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise AuthError("api_key is required", status_code=None)
        if not agent_id or not agent_id.strip():
            raise MemosError("agent_id is required", status_code=None)

        self.api_key = api_key
        self.agent_id = agent_id
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Authorization": "Bearer {0}".format(api_key),
                "Content-Type": "application/json",
                "User-Agent": "memos-py/0.1.0",
            },
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _handle_response(self, response: httpx.Response) -> Dict:  # type: ignore[type-arg]
        """Parse response and raise typed exceptions on errors."""
        if response.status_code == 401:
            raise AuthError("Invalid or missing API key", 401)
        if response.status_code == 429:
            raise RateLimitError("Rate limit exceeded", 429)
        if response.status_code == 404:
            raise NotFoundError("Resource not found", 404)
        if response.status_code >= 500:
            raise ServerError("Server error: {0}".format(response.text), response.status_code)
        if not response.is_success:
            raise MemosError("Request failed: {0}".format(response.text), response.status_code)
        return response.json()  # type: ignore[no-any-return]

    @staticmethod
    def _build_memory(data: Dict) -> Memory:  # type: ignore[type-arg]
        """Safely build a Memory from a response dict, ignoring unknown keys."""
        known = Memory.__dataclass_fields__
        filtered = {k: v for k, v in data.items() if k in known}
        # Map camelCase keys from API
        if "agentId" in data and "agent_id" not in filtered:
            filtered["agent_id"] = data["agentId"]
        if "createdAt" in data and "created_at" not in filtered:
            filtered["created_at"] = data["createdAt"]
        if "accessCount" in data and "access_count" not in filtered:
            filtered["access_count"] = data["accessCount"]
        if "decayScore" in data and "decay_score" not in filtered:
            filtered["decay_score"] = data["decayScore"]
        return Memory(**filtered)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def store_memory(
        self,
        content: str,
        type: str = "episodic",
        importance: int = 3,
        tags: Optional[List[str]] = None,
    ) -> Memory:
        """Store a new memory for the agent.

        Args:
            content: The text content to store.
            type: Memory type — "episodic", "semantic", or "procedural".
            importance: Importance score from 1 to 5.
            tags: Optional list of string tags.

        Returns:
            The created Memory object.
        """
        response = self._client.post(
            "/api/memory",
            json={
                "agentId": self.agent_id,
                "content": content,
                "type": type,
                "importance": importance,
                "tags": tags or [],
            },
        )
        data = self._handle_response(response)
        memory_data = data.get("memory", data)
        return self._build_memory(memory_data)

    def list_memories(self) -> List[Memory]:
        """List all memories for the agent.

        Returns:
            A list of Memory objects.
        """
        response = self._client.get(
            "/api/memory",
            params={"agentId": self.agent_id},
        )
        data = self._handle_response(response)
        items = data.get("memories", data) if isinstance(data, dict) else data
        if not isinstance(items, list):
            items = []
        return [self._build_memory(m) for m in items]

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a specific memory by ID.

        Args:
            memory_id: The ID of the memory to delete.

        Returns:
            True if deletion was successful.
        """
        response = self._client.delete("/api/memory/{0}".format(memory_id))
        self._handle_response(response)
        return True

    def search(
        self,
        query: str,
        search_type: str = "keyword",
        limit: int = 10,
    ) -> List[SearchResult]:
        """Search agent memories.

        Args:
            query: The search query string.
            search_type: "keyword" or "semantic".
            limit: Maximum number of results.

        Returns:
            A list of SearchResult objects.
        """
        response = self._client.post(
            "/api/search",
            json={
                "agentId": self.agent_id,
                "query": query,
                "searchType": search_type,
                "limit": limit,
            },
        )
        data = self._handle_response(response)
        items = data.get("results", data) if isinstance(data, dict) else data
        if not isinstance(items, list):
            items = []
        return [
            SearchResult(
                id=r.get("id", ""),
                content=r.get("content", ""),
                type=r.get("type", ""),
                importance=r.get("importance", 0),
                score=r.get("score", 0.0),
                tags=r.get("tags", []),
            )
            for r in items
        ]

    def query(
        self,
        question: str,
        include_sources: bool = True,
        conversation_history: Optional[List[dict]] = None,  # type: ignore[type-arg]
    ) -> RAGResponse:
        """Ask a question using RAG (retrieval-augmented generation).

        Args:
            question: The question to ask.
            include_sources: Whether to include source memories.
            conversation_history: Optional prior conversation turns.

        Returns:
            A RAGResponse with answer, sources, and confidence.
        """
        response = self._client.post(
            "/api/rag",
            json={
                "agentId": self.agent_id,
                "query": question,
                "conversationHistory": conversation_history or [],
            },
        )
        data = self._handle_response(response)
        return RAGResponse(
            answer=data.get("answer", ""),
            sources=data.get("sources", []),
            confidence=data.get("confidence", 0.0),
        )

    def trigger_dream(self) -> DreamResult:
        """Trigger a dream consolidation cycle for the agent.

        Returns:
            A DreamResult with consolidation details.
        """
        response = self._client.post(
            "/api/agent/{0}/dreams".format(self.agent_id),
            json={},
        )
        data = self._handle_response(response)
        # The API returns: totalMemoriesProcessed / consolidatedCount /
        # durationMs / message / consolidated (list of strings).
        return DreamResult(
            memories_analyzed=data.get("totalMemoriesProcessed", 0),
            patterns_found=data.get("consolidatedCount", 0),
            new_memories_created=data.get("consolidatedCount", 0),
            dream_summary=data.get("message", ""),
            new_memories=data.get("consolidated", []),
            duration=data.get("durationMs", 0),
        )

    def list_skills(self) -> List[Skill]:
        """List all available skills in the marketplace.

        Returns:
            A list of Skill objects.
        """
        response = self._client.get("/api/skills")
        data = self._handle_response(response)
        items = data.get("skills", data) if isinstance(data, dict) else data
        if not isinstance(items, list):
            items = []
        return [
            Skill(
                id=s.get("id", ""),
                name=s.get("name", ""),
                description=s.get("description", ""),
                category=s.get("category", ""),
                price=s.get("price", 0.0),
                publisher=s.get("publisher", ""),
            )
            for s in items
        ]

    def execute_skill(self, skill_id: str, input: str) -> SkillResult:
        """Execute a skill.

        Args:
            skill_id: The ID of the skill to execute.
            input: The input string for the skill.

        Returns:
            A SkillResult with execution details.
        """
        response = self._client.post(
            "/api/execute",
            json={
                "agentId": self.agent_id,
                "skillId": skill_id,
                "userInput": input,
            },
        )
        data = self._handle_response(response)
        return SkillResult(
            skill_id=skill_id,
            result=data.get("output", ""),
            tokens_used=data.get("tokensUsed", 0),
            model=data.get("model", ""),
            compute_provider=data.get("computeProvider", ""),
        )

    def run_pipeline(self, steps: List[dict], input: str) -> dict:  # type: ignore[type-arg]
        """Run a multi-step pipeline.

        Args:
            steps: List of step dicts, each with at least a "skillId" key.
            input: The initial input string.

        Returns:
            Raw response dict (pipeline responses are complex).
        """
        response = self._client.post(
            "/api/pipeline",
            json={
                "agentId": self.agent_id,
                "steps": steps,
                "initialInput": input,
            },
        )
        return self._handle_response(response)

    def get_identity(self) -> dict:  # type: ignore[type-arg]
        """Get the agent's identity and reputation.

        Returns:
            Raw response dict with reputation data.
        """
        response = self._client.get(
            "/api/agent/{0}/reputation".format(self.agent_id),
        )
        return self._handle_response(response)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the underlying HTTP connection."""
        self._client.close()

    def __enter__(self) -> "MemosClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
