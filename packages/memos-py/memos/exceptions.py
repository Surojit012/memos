"""memos-py exception hierarchy."""
from __future__ import annotations


class MemosError(Exception):
    """Base exception for all memos SDK errors."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AuthError(MemosError):
    """Raised when authentication fails (HTTP 401)."""


class RateLimitError(MemosError):
    """Raised when rate limit is exceeded (HTTP 429)."""


class NotFoundError(MemosError):
    """Raised when a resource is not found (HTTP 404)."""


class ServerError(MemosError):
    """Raised when the server returns a 5xx error."""
