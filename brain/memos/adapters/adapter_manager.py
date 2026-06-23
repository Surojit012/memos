"""Thread-safe adapter manager for Memos 0G adapters."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
import logging
from threading import RLock

from brain.memos.adapters.chain_adapter import ChainAdapter, ChainClient, ChainMode
from brain.memos.adapters.compute_adapter import ComputeAdapter, ComputeClient, ComputeMode
from brain.memos.adapters.storage_adapter import AdapterMode, StorageAdapter, StorageClient


class AdapterManager:
    """Return one replaceable Storage, Compute, and Chain adapter per manager runtime."""

    def __init__(
        self,
        *,
        storage_mode: AdapterMode | str = AdapterMode.MOCK,
        compute_mode: ComputeMode | str = ComputeMode.MOCK,
        chain_mode: ChainMode | str = ChainMode.MOCK,
        storage_client: StorageClient | None = None,
        compute_client: ComputeClient | None = None,
        chain_client: ChainClient | None = None,
        clock: Callable[[], datetime] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._storage_mode = storage_mode
        self._compute_mode = compute_mode
        self._chain_mode = chain_mode
        self._storage_client = storage_client
        self._compute_client = compute_client
        self._chain_client = chain_client
        self._clock = clock
        self._logger = logger or logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self._lock = RLock()
        self._storage: StorageAdapter | None = None
        self._compute: ComputeAdapter | None = None
        self._chain: ChainAdapter | None = None

    def get_storage(self) -> StorageAdapter:
        """Return the runtime Storage Adapter singleton."""

        with self._lock:
            if self._storage is None:
                self._storage = StorageAdapter(
                    mode=self._storage_mode,
                    client=self._storage_client,
                    clock=self._clock,
                    logger=self._logger,
                )
            return self._storage

    def get_compute(self) -> ComputeAdapter:
        """Return the runtime Compute Adapter singleton."""

        with self._lock:
            if self._compute is None:
                self._compute = ComputeAdapter(
                    mode=self._compute_mode,
                    client=self._compute_client,
                    clock=self._clock,
                    logger=self._logger,
                )
            return self._compute

    def get_chain(self) -> ChainAdapter:
        """Return the runtime Chain Adapter singleton."""

        with self._lock:
            if self._chain is None:
                self._chain = ChainAdapter(
                    mode=self._chain_mode,
                    client=self._chain_client,
                    clock=self._clock,
                    logger=self._logger,
                )
            return self._chain
