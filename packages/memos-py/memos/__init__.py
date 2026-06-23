"""memos-py — Python SDK for memos."""
from __future__ import annotations

from .client import MemosClient
from .exceptions import AuthError, MemosError, NotFoundError, RateLimitError, ServerError
from .models import DreamResult, Memory, RAGResponse, SearchResult, Skill, SkillResult

__version__ = "0.1.0"
__all__ = [
    "MemosClient",
    "Memory",
    "SearchResult",
    "RAGResponse",
    "Skill",
    "SkillResult",
    "DreamResult",
    "MemosError",
    "AuthError",
    "RateLimitError",
    "NotFoundError",
    "ServerError",
]
