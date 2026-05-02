"""
Unit tests for the MemoryOS Python SDK.

These tests mock the HTTP layer — no running server required.
Run with: cd packages/memoryos-py && python -m pytest tests/ -v
"""

import json
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from memoryos import MemoryOS, MemoryOSClient
from memoryos.types import Memory, Skill, AgentIdentity, SkillPublishInput


# ── Fixtures ─────────────────────────────────────────────────────

class MockResponse:
    """Mock httpx.Response for sync and async clients."""
    def __init__(self, data=None, status_code=200):
        self._data = data or {}
        self.status_code = status_code
        self.content = json.dumps(self._data).encode()
        self.is_success = 200 <= status_code < 300

    def json(self):
        return self._data


@pytest.fixture
def client():
    """Create a MemoryOS client with mocked HTTP transport."""
    c = MemoryOS(
        api_url="http://test.local:3000",
        agent_id="agent_test_unit",
    )
    return c


# ── Constructor Tests ────────────────────────────────────────────

class TestClientInit:
    def test_requires_api_url(self):
        with pytest.raises(ValueError, match="api_url"):
            MemoryOS("", "agent_id")

    def test_requires_agent_id(self):
        with pytest.raises(ValueError, match="agent_id"):
            MemoryOS("http://localhost:3000", "")

    def test_strips_trailing_slash(self):
        c = MemoryOS("http://localhost:3000///", "agent_id")
        assert c.api_url == "http://localhost:3000"

    def test_repr(self):
        c = MemoryOS("http://localhost:3000", "my_agent")
        assert "my_agent" in repr(c)
        assert "localhost" in repr(c)

    def test_alias_memoryos_equals_client(self):
        assert MemoryOS is MemoryOSClient


# ── Memory API Tests ────────────────────────────────────────────

class TestMemoryAPI:
    def test_save_builds_correct_request(self, client):
        mock_response = MockResponse({"memory": {"id": "mem_1234", "content": "test"}}, 201)
        client._sync_client.request = MagicMock(return_value=mock_response)

        result = client.memory.save(
            "User likes dark mode",
            type="semantic",
            tags=["pref"],
            importance=4,
        )

        # Verify the request was made correctly
        call_args = client._sync_client.request.call_args
        assert call_args[0][0] == "POST"
        assert "/api/memory" in call_args[0][1]

        body = json.loads(call_args[1]["content"])
        assert body["agentId"] == "agent_test_unit"
        assert body["content"] == "User likes dark mode"
        assert body["type"] == "semantic"
        assert body["tags"] == ["pref"]
        assert body["importance"] == 4

        assert result["memory"]["id"] == "mem_1234"

    def test_save_defaults(self, client):
        mock_response = MockResponse({"memory": {"id": "mem_5678"}})
        client._sync_client.request = MagicMock(return_value=mock_response)

        client.memory.save("test content")

        body = json.loads(client._sync_client.request.call_args[1]["content"])
        assert body["type"] == "semantic"
        assert body["tags"] == []
        assert body["importance"] == 3

    def test_list_with_filters(self, client):
        mock_response = MockResponse({"memories": [], "count": 0})
        client._sync_client.request = MagicMock(return_value=mock_response)

        client.memory.list(type="episodic", limit=5)

        url = client._sync_client.request.call_args[0][1]
        assert "type=episodic" in url
        assert "limit=5" in url
        assert "agentId=agent_test_unit" in url

    def test_search_sends_post(self, client):
        mock_response = MockResponse({"memories": [], "count": 0, "searchMethod": "hybrid"})
        client._sync_client.request = MagicMock(return_value=mock_response)

        result = client.memory.search("bitcoin price")

        call_args = client._sync_client.request.call_args
        assert call_args[0][0] == "POST"
        body = json.loads(call_args[1]["content"])
        assert body["query"] == "bitcoin price"

    def test_delete_includes_agent_id(self, client):
        mock_response = MockResponse({"deleted": True})
        client._sync_client.request = MagicMock(return_value=mock_response)

        client.memory.delete("mem_1234")

        url = client._sync_client.request.call_args[0][1]
        assert "mem_1234" in url
        assert "agentId=agent_test_unit" in url


# ── Skills API Tests ─────────────────────────────────────────────

class TestSkillsAPI:
    def test_list(self, client):
        mock_response = MockResponse({"skills": [{"id": "skill_1"}]})
        client._sync_client.request = MagicMock(return_value=mock_response)

        result = client.skills.list()
        assert len(result["skills"]) == 1

    def test_publish_injects_agent_id(self, client):
        mock_response = MockResponse({"skill": {"id": "skill_new"}})
        client._sync_client.request = MagicMock(return_value=mock_response)

        skill = SkillPublishInput(
            name="Test Skill",
            description="A test",
            prompt="Do something",
            price="0",
            publisher_name="Test",
        )
        client.skills.publish(skill)

        body = json.loads(client._sync_client.request.call_args[1]["content"])
        assert body["publisherAgentId"] == "agent_test_unit"

    def test_run(self, client):
        mock_response = MockResponse({"output": "result", "tokensUsed": 42})
        client._sync_client.request = MagicMock(return_value=mock_response)

        result = client.skills.run("skill_1", "input text")
        body = json.loads(client._sync_client.request.call_args[1]["content"])
        assert body["skillId"] == "skill_1"
        assert body["userInput"] == "input text"


# ── Identity API Tests ───────────────────────────────────────────

class TestIdentityAPI:
    def test_register(self, client):
        mock_response = MockResponse({"agent": {"agentId": "agent_test_unit"}})
        client._sync_client.request = MagicMock(return_value=mock_response)

        result = client.identity.register("Test Bot")
        body = json.loads(client._sync_client.request.call_args[1]["content"])
        assert body["name"] == "Test Bot"

    def test_register_defaults_to_agent_id(self, client):
        mock_response = MockResponse({"agent": {}})
        client._sync_client.request = MagicMock(return_value=mock_response)

        client.identity.register()
        body = json.loads(client._sync_client.request.call_args[1]["content"])
        assert body["name"] == "agent_test_unit"


# ── Error Handling Tests ─────────────────────────────────────────

class TestErrorHandling:
    def test_server_error_raises(self, client):
        mock_response = MockResponse({"error": "Internal Server Error"}, 500)
        client._sync_client.request = MagicMock(return_value=mock_response)

        with pytest.raises(RuntimeError, match="Internal Server Error"):
            client.memory.list()

    def test_connection_error_queues_write(self, client):
        import httpx
        client._sync_client.request = MagicMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        result = client.memory.save("offline data", type="semantic")
        assert result["queued"] is True
        assert client.offline_pending == 1

    def test_connection_error_raises_on_read(self, client):
        import httpx
        client._sync_client.request = MagicMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        with pytest.raises(ConnectionError, match="unreachable"):
            client.memory.list()


# ── Offline Queue Tests ──────────────────────────────────────────

class TestOfflineQueue:
    def test_queue_buffers_writes(self, client):
        import httpx
        client._sync_client.request = MagicMock(
            side_effect=httpx.ConnectError("down")
        )

        client.memory.save("data1", type="semantic")
        client.memory.save("data2", type="episodic")

        assert client.offline_pending == 2

    def test_flush_replays_writes(self, client):
        import httpx

        # First: queue some writes while offline
        client._sync_client.request = MagicMock(
            side_effect=httpx.ConnectError("down")
        )
        client.memory.save("queued data", type="semantic")
        assert client.offline_pending == 1

        # Then: come back online
        mock_response = MockResponse({"memory": {"id": "mem_flushed"}})
        client._sync_client.request = MagicMock(return_value=mock_response)

        results = client.flush_offline_queue()
        assert len(results) == 1
        assert results[0]["success"] is True
        assert client.offline_pending == 0


# ── Type Dataclass Tests ─────────────────────────────────────────

class TestTypes:
    def test_memory_from_dict(self):
        m = Memory.from_dict({
            "id": "mem_1",
            "agentId": "agent_a",
            "type": "semantic",
            "content": "hello",
            "tags": ["test"],
            "importance": 5,
        })
        assert m.id == "mem_1"
        assert m.type == "semantic"
        assert m.importance == 5

    def test_skill_from_dict(self):
        s = Skill.from_dict({
            "id": "skill_1",
            "name": "Test",
            "description": "desc",
            "category": "General",
            "prompt": "do stuff",
        })
        assert s.id == "skill_1"
        assert s.price == "0"  # default

    def test_skill_publish_input_to_dict(self):
        inp = SkillPublishInput(
            name="Test",
            description="desc",
            prompt="do stuff",
            price="0.01",
            publisher_name="Me",
        )
        d = inp.to_dict()
        assert d["name"] == "Test"
        assert d["price"] == "0.01"
        assert d["publisherName"] == "Me"


# ── Sub-API Existence Tests ──────────────────────────────────────

class TestSubAPIs:
    """Verify all expected sub-APIs exist on the client."""

    def test_has_all_apis(self, client):
        assert hasattr(client, "memory")
        assert hasattr(client, "skills")
        assert hasattr(client, "identity")
        assert hasattr(client, "snapshot")
        assert hasattr(client, "rag")
        assert hasattr(client, "dreams")
        assert hasattr(client, "reputation")
        assert hasattr(client, "pipeline")
        assert hasattr(client, "vault")
        assert hasattr(client, "import_memories")

    def test_dreams_has_methods(self, client):
        assert callable(client.dreams.sleep)
        assert callable(client.dreams.history)

    def test_vault_has_methods(self, client):
        assert callable(client.vault.save)
        assert callable(client.vault.list)

    def test_pipeline_has_methods(self, client):
        assert callable(client.pipeline.run)

    def test_snapshot_has_methods(self, client):
        assert callable(client.snapshot.create)
        assert callable(client.snapshot.list)
