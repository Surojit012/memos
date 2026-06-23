from __future__ import annotations

from pathlib import Path

import pytest

from brain.memos.agent.agent import Agent
from brain.memos.agent.identity import Identity
from brain.memos.models.agent_profile import AgentProfile


def create_agent() -> Agent:
    return Agent(
        profile=AgentProfile(agent_id="grow-agent-1", name="Grow Agent"),
        identity=Identity(wallet_address="0xgrow", agent_id="grow-agent-1", signature="sig", verified=True),
    )


def create_module_package(root: Path, *, module_id: str = "echo-module") -> Path:
    module_path = root / module_id
    module_path.mkdir()
    (module_path / "manifest.yaml").write_text(
        f"""
module_id: {module_id}
name: Echo Module
description: Echoes deterministic text
version: 1.0.0
author: Memos
entrypoint: handler.py:handle
inputs:
  text:
    type: string
    required: true
outputs:
  text: string
price: 0
permissions: []
tags:
  - echo
""",
        encoding="utf-8",
    )
    (module_path / "handler.py").write_text(
        """
def handle(inputs):
    return {"text": inputs["text"].strip().upper()}
""",
        encoding="utf-8",
    )
    (module_path / "README.md").write_text("# Echo Module\n", encoding="utf-8")
    return module_path


def test_grow_install_execute_return_result(tmp_path: Path) -> None:
    agent = create_agent()
    module_path = create_module_package(tmp_path)

    installed = agent.install_module(
        module_id="echo-module",
        name="Echo Module",
        description="Echoes deterministic text",
        tags=["echo"],
        module_path=module_path,
    )
    result = agent.use_module(module_id="echo-module", inputs={"text": "hello grow"})

    assert installed["module_id"] == "echo-module"
    assert agent.get_installed_module("echo-module")["module_id"] == "echo-module"
    assert result.execution_id == "module_exec_000000000001"
    assert result.agent_id == "grow-agent-1"
    assert result.module_id == "echo-module"
    assert result.outputs == {"text": "HELLO GROW"}
    assert result.metadata["input_keys"] == ["text"]
    assert result.metadata["module_name"] == "Echo Module"


def test_grow_duplicate_and_unknown_module_rejections(tmp_path: Path) -> None:
    agent = create_agent()
    module_path = create_module_package(tmp_path)

    agent.install_module(module_id="echo-module", module_path=module_path)

    with pytest.raises(ValueError, match="module id already installed"):
        agent.install_module(module_id="echo-module", module_path=module_path)
    with pytest.raises(ValueError, match="module is not installed"):
        agent.use_module(module_id="missing", inputs={})
    with pytest.raises(ValueError, match="module is not installed"):
        agent.uninstall_module("missing")


def test_grow_uninstall_module(tmp_path: Path) -> None:
    agent = create_agent()
    module_path = create_module_package(tmp_path)
    agent.install_module(module_id="echo-module", module_path=module_path)
    agent.use_module(module_id="echo-module", inputs={"text": "before uninstall"})

    assert agent.uninstall_module("echo-module") is True
    assert agent.get_installed_module("echo-module") is None
    assert agent.module_registry.get_module("echo-module") is None
    assert agent.module_loader.get_loaded_module("echo-module") is None
    assert agent.brain_state.installed_modules == []
