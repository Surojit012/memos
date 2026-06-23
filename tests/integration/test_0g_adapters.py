from __future__ import annotations

from datetime import datetime, timedelta, timezone

from brain.memos.adapters.adapter_manager import AdapterManager
from brain.memos.adapters.chain_adapter import ChainAdapter, ChainMode
from brain.memos.adapters.compute_adapter import ComputeAdapter, ComputeMode
from brain.memos.adapters.storage_adapter import AdapterMode, StorageAdapter
from brain.memos.agent.identity import Identity
from brain.memos.memory.memory_manager import MemoryManager
from brain.memos.runtime.langgraph_checkpointer import LangGraphCheckpointer


class DeterministicClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        value = self.current
        self.current = self.current + timedelta(seconds=1)
        return value


class BrokenStorageClient:
    def upload(self, payload, metadata):
        raise RuntimeError("0G unavailable")

    def download(self, storage_hash):
        raise RuntimeError("0G unavailable")

    def exists(self, storage_hash):
        raise RuntimeError("0G unavailable")


class BrokenComputeClient:
    def embed(self, text, metadata):
        raise RuntimeError("0G unavailable")

    def infer(self, prompt, context, metadata):
        raise RuntimeError("0G unavailable")

    def summarize(self, texts, metadata):
        raise RuntimeError("0G unavailable")


class BrokenChainClient:
    def register_identity(self, identity):
        raise RuntimeError("0G unavailable")

    def create_receipt(self, agent_id, receipt_type, payload):
        raise RuntimeError("0G unavailable")

    def verify_receipt(self, receipt):
        raise RuntimeError("0G unavailable")


def test_storage_lifecycle_mock_mode() -> None:
    clock = DeterministicClock()
    adapter = StorageAdapter(clock=clock)
    memory = MemoryManager(clock=clock).store(agent_id="agent-1", content="Persistent memory", tags=["ai"])
    checkpoint = LangGraphCheckpointer(clock=clock).save_checkpoint(
        agent_id="agent-1",
        thread_id="thread-1",
        payload={"step": "ready"},
    )

    memory_hash = adapter.persist_memory(memory)
    checkpoint_hash = adapter.persist_checkpoint(checkpoint)

    assert memory_hash.startswith("mock_storage_")
    assert checkpoint_hash.startswith("mock_storage_")
    assert adapter.exists(memory_hash) is True
    assert adapter.download(memory_hash)["id"] == memory.id
    assert adapter.download(checkpoint_hash)["checkpoint_id"] == checkpoint.checkpoint_id


def test_storage_falls_back_when_real_mode_unavailable() -> None:
    adapter = StorageAdapter(mode=AdapterMode.REAL, client=BrokenStorageClient(), clock=DeterministicClock())

    storage_hash = adapter.upload({"hello": "world"}, object_type="memory")

    assert adapter.active_mode == AdapterMode.MOCK
    assert storage_hash.startswith("mock_storage_")
    assert adapter.exists(storage_hash) is True


def test_compute_lifecycle_mock_mode() -> None:
    adapter = ComputeAdapter(clock=DeterministicClock())

    vector = adapter.embed("AI infrastructure")
    response = adapter.infer("What do I research?", context="User researches AI infrastructure.")
    summary = adapter.summarize(["Research Nvidia GPUs.", "Study AI infrastructure."])

    assert len(vector) == 8
    assert vector == adapter.embed("AI infrastructure")
    assert response == "Mock inference: User researches AI infrastructure."
    assert summary == "Summary: research, nvidia, gpus, study, infrastructure"
    assert [call["operation"] for call in adapter.list_calls()] == ["embed", "infer", "summarize", "embed"]


def test_compute_falls_back_when_real_mode_unavailable() -> None:
    adapter = ComputeAdapter(mode=ComputeMode.REAL, client=BrokenComputeClient(), clock=DeterministicClock())

    vector = adapter.embed("fallback compute")

    assert adapter.active_mode == ComputeMode.MOCK
    assert len(vector) == 8


def test_chain_lifecycle_mock_mode() -> None:
    adapter = ChainAdapter(clock=DeterministicClock())
    identity = Identity(wallet_address="0xabc", agent_id="agent-1", signature="sig", verified=True)

    identity_receipt = adapter.register_identity(identity)
    usage_receipt = adapter.create_receipt(agent_id="agent-1", receipt_type="usage", payload={"module_id": "mod-1"})

    assert identity_receipt.receipt_type == "identity"
    assert adapter.get_identity("agent-1").wallet_address == "0xabc"
    assert adapter.verify_receipt(identity_receipt) is True
    assert adapter.verify_receipt(usage_receipt.receipt_id) is True
    assert adapter.verify_receipt("missing") is False


def test_chain_falls_back_when_real_mode_unavailable() -> None:
    adapter = ChainAdapter(mode=ChainMode.REAL, client=BrokenChainClient(), clock=DeterministicClock())
    identity = Identity(wallet_address="0xabc", agent_id="agent-1")

    receipt = adapter.register_identity(identity)

    assert adapter.active_mode == ChainMode.MOCK
    assert receipt.receipt_id.startswith("mock_receipt_")
    assert adapter.verify_receipt(receipt) is True


def test_adapter_manager_returns_singletons_per_runtime() -> None:
    manager = AdapterManager(clock=DeterministicClock())

    assert manager.get_storage() is manager.get_storage()
    assert manager.get_compute() is manager.get_compute()
    assert manager.get_chain() is manager.get_chain()
