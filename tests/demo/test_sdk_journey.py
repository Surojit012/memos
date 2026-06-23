from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PACKAGES_ROOT = REPO_ROOT / "packages"
if str(PACKAGES_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGES_ROOT))

from memos import Agent


def create_research_module(root: Path) -> Path:
    module_path = root / "research-module"
    module_path.mkdir()
    (module_path / "manifest.yaml").write_text(
        """
module_id: research-module
name: Research Module
description: Produces a deterministic research note
version: 1.0.0
author: Memos
entrypoint: handler.py:handle
inputs:
  topic:
    type: string
    required: true
outputs:
  note: string
price: 0
permissions: []
tags:
  - research
""",
        encoding="utf-8",
    )
    (module_path / "handler.py").write_text(
        """
def handle(inputs):
    topic = inputs["topic"].strip()
    return {"note": f"Research note: {topic}"}
""",
        encoding="utf-8",
    )
    (module_path / "README.md").write_text("# Research Module\n", encoding="utf-8")
    return module_path


def test_sdk_journey(tmp_path: Path) -> None:
    agent = Agent(name="ResearchAgent")
    module_path = create_research_module(tmp_path)

    memory = agent.remember("User researches AI infrastructure and GPUs.", tags=["ai", "infrastructure"])
    dream = agent.dream()
    reason = agent.reason("What does the user research?")
    installed = agent.install_module("research-module", module_path=module_path, tags=["research"])
    module_result = agent.use_module("research-module", inputs={"topic": "AI infrastructure"})
    sync = agent.sync()

    assert memory.agent_id == agent.agent_id
    assert dream.agent_id == agent.agent_id
    assert reason.answer
    assert reason.citations
    assert installed["module_id"] == "research-module"
    assert module_result.outputs == {"note": "Research note: AI infrastructure"}
    assert sync.status == "completed"
    assert sync.saved_memories
    assert sync.saved_dreams == [dream.dream_id]
    assert sync.saved_modules == ["research-module"]
