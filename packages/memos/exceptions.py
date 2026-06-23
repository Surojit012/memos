"""Memos SDK exceptions."""

from __future__ import annotations


class MemosError(Exception):
    """Base exception for Memos SDK failures."""


class ModuleError(MemosError):
    """Raised when Module installation or execution fails."""


class PersistenceError(MemosError):
    """Raised when persistence event handling fails."""


class SyncError(PersistenceError):
    """Raised when sync cannot complete."""
