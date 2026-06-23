"""Final Memos persistent brain demo."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGES_ROOT = REPO_ROOT / "packages"
if str(PACKAGES_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGES_ROOT))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from memos import Agent

from demo.demo_data import DEMO_AGENT_NAME, DEMO_MEMORIES, DEMO_QUESTION


def run_demo() -> dict[str, Any]:
    """Run the deterministic Memos demo and return structured results."""

    lines: list[str] = ["Memos Demo"]
    agent = Agent(name=DEMO_AGENT_NAME)
    lines.append("Agent created")

    for memory in DEMO_MEMORIES:
        agent.remember(memory["content"], tags=memory["tags"])
    lines.append("3 memories stored")

    dream = agent.dream()
    lines.append("Dream completed")

    reason = agent.reason(DEMO_QUESTION)
    lines.append("Reason completed")

    sync = agent.sync()
    lines.append("Answer")
    lines.append(reason.answer)
    lines.append("Citations")
    lines.extend(reason.citations)
    lines.append("0G sync complete")

    output = "\n".join(lines)
    print(output)

    return {
        "agent": agent,
        "answer": reason.answer,
        "citations": reason.citations,
        "memory_count": len(agent.list_memories()),
        "dream_count": agent.core.brain_state.dream_count,
        "dream_id": dream.dream_id,
        "sync": sync,
        "output": output,
    }


if __name__ == "__main__":
    run_demo()
