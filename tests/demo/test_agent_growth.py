from __future__ import annotations

from pathlib import Path

from brain.memos.agent.agent import Agent
from brain.memos.agent.identity import Identity
from brain.memos.models.agent_profile import AgentProfile


def create_research_module(root: Path) -> Path:
    module_path = root / "research-module"
    module_path.mkdir()
    (module_path / "manifest.yaml").write_text(
        """
module_id: research-module
name: Research Module
description: Produces a deterministic research brief
version: 1.0.0
author: Memos
entrypoint: handler.py:handle
inputs:
  topic:
    type: string
    required: true
outputs:
  brief: string
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
    return {"brief": f"Research brief: {topic} is tracked as a recurring technical topic."}
""",
        encoding="utf-8",
    )
    (module_path / "README.md").write_text("# Research Module\n", encoding="utf-8")
    return module_path


def test_agent_growth_demo(tmp_path: Path) -> None:
    agent = Agent(
        profile=AgentProfile(agent_id="research-agent-1", name="Research Agent"),
        identity=Identity(wallet_address="0xresearch", agent_id="research-agent-1", signature="sig", verified=True),
    )
    module_path = create_research_module(tmp_path)

    agent.install_module(
        module_id="research-module",
        name="Research Module",
        description="Produces a deterministic research brief",
        tags=["research"],
        module_path=module_path,
    )
    result = agent.use_module(module_id="research-module", inputs={"topic": "AI infrastructure"})

    assert result.execution_id == "module_exec_000000000001"
    assert result.module_id == "research-module"
    assert result.outputs == {
        "brief": "Research brief: AI infrastructure is tracked as a recurring technical topic."
    }
    assert result.metadata["module_name"] == "Research Module"
