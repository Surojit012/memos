from __future__ import annotations

from demo.persistent_brain_demo import run_demo


def test_final_demo_executes_without_exceptions() -> None:
    result = run_demo()

    assert result["answer"]
    assert result["citations"]
    assert result["sync"].status == "completed"
    assert result["memory_count"] >= 4
    assert result["dream_count"] == 1
    assert "Memos Demo" in result["output"]
    assert "0G sync complete" in result["output"]
