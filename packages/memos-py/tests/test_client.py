import pytest
from unittest.mock import MagicMock, patch

from memos import MemosClient, AuthError, RateLimitError, ServerError, MemosError
from memos.models import Memory, SearchResult, RAGResponse, DreamResult

def make_mock_response(status_code: int, json_data: dict):
    mock = MagicMock()
    mock.status_code = status_code
    mock.is_success = 200 <= status_code < 300
    mock.json.return_value = json_data
    mock.text = str(json_data)
    return mock

def test_init_requires_api_key():
    with pytest.raises(AuthError):
        MemosClient(api_key="", agent_id="agent_123")

def test_init_requires_agent_id():
    with pytest.raises(MemosError):
        MemosClient(api_key="mk0s_key", agent_id="")

@patch("httpx.Client.post")
def test_store_memory_success(mock_post):
    mock_post.return_value = make_mock_response(200, {
        "memory": {
            "id": "mem_1",
            "agent_id": "agent_123",
            "content": "test content",
            "type": "episodic",
            "importance": 3
        }
    })
    client = MemosClient(api_key="key", agent_id="agent")
    result = client.store_memory("test content")
    assert isinstance(result, Memory)
    assert result.content == "test content"

@patch("httpx.Client.post")
def test_store_memory_401(mock_post):
    mock_post.return_value = make_mock_response(401, {"error": "Unauthorized"})
    client = MemosClient(api_key="key", agent_id="agent")
    with pytest.raises(AuthError):
        client.store_memory("test")

@patch("httpx.Client.post")
def test_store_memory_429(mock_post):
    mock_post.return_value = make_mock_response(429, {"error": "Rate limit"})
    client = MemosClient(api_key="key", agent_id="agent")
    with pytest.raises(RateLimitError):
        client.store_memory("test")

@patch("httpx.Client.post")
def test_store_memory_500(mock_post):
    mock_post.return_value = make_mock_response(500, {"error": "Server error"})
    client = MemosClient(api_key="key", agent_id="agent")
    with pytest.raises(ServerError):
        client.store_memory("test")

@patch("httpx.Client.get")
def test_list_memories_returns_list(mock_get):
    mock_get.return_value = make_mock_response(200, {
        "memories": [
            {
                "id": "mem_1",
                "agent_id": "agent",
                "content": "c1",
                "type": "episodic",
                "importance": 3
            }
        ]
    })
    client = MemosClient(api_key="key", agent_id="agent")
    result = client.list_memories()
    assert isinstance(result, list)
    assert all(isinstance(m, Memory) for m in result)

@patch("httpx.Client.post")
def test_search_returns_results(mock_post):
    mock_post.return_value = make_mock_response(200, {
        "results": [
            {
                "id": "mem_1",
                "content": "test result",
                "type": "episodic",
                "importance": 3,
                "score": 0.95
            }
        ]
    })
    client = MemosClient(api_key="key", agent_id="agent")
    result = client.search("test query")
    assert isinstance(result, list)
    assert all(isinstance(r, SearchResult) for r in result)

@patch("httpx.Client.post")
def test_query_returns_rag_response(mock_post):
    mock_post.return_value = make_mock_response(200, {
        "answer": "this is the answer",
        "sources": [],
        "confidence": 0.9
    })
    client = MemosClient(api_key="key", agent_id="agent")
    result = client.query("what do I prefer?")
    assert isinstance(result, RAGResponse)
    assert result.answer == "this is the answer"

@patch("httpx.Client.post")
def test_trigger_dream_returns_dream_result(mock_post):
    mock_post.return_value = make_mock_response(200, {
        "memoriesAnalyzed": 10,
        "patternsFound": 2,
        "newMemoriesCreated": 1,
        "dreamSummary": "summary",
        "newMemories": [],
        "duration": 500
    })
    client = MemosClient(api_key="key", agent_id="agent")
    result = client.trigger_dream()
    assert isinstance(result, DreamResult)
    assert result.memories_analyzed == 10

def test_context_manager_closes_client():
    with patch.object(MemosClient, 'close') as mock_close:
        with MemosClient(api_key="key", agent_id="agent"):
            pass
        mock_close.assert_called_once()
