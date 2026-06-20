# MemoryOS Validation Checklist

## Scope

- Remember Engine unit behavior is covered.
- Runtime layer unit behavior is covered.
- Reason Engine integration behavior is covered.
- Agent Core integration behavior is covered.
- Dream Engine integration behavior is covered.
- Brain pipeline behavior is covered end-to-end.
- Complete cognitive loop behavior is covered end-to-end.
- Demo Brain journey is covered.
- Persistent Brain demo behavior is covered.
- Agent journey integration behavior is covered.
- Tests use local in-memory objects only.
- Tests make no 0G calls.
- Tests make no LLM calls.
- Tests make no network calls.

## Commands

```bash
pytest
```

```bash
coverage run -m pytest
coverage report -m
```

```bash
python3 -m compileall brain tests
```

## Freeze Criteria

- `pytest` passes.
- `coverage run -m pytest` passes.
- `python3 -m compileall brain tests` passes.
- No external service credentials are required.
- No runtime test depends on wall-clock sleeps.
- No test implements Dream, Marketplace, Economy, dashboard behavior, 0G calls, LLM calls, payments, Module execution, or agent orchestration.
- Reason tests use the deterministic local provider only.
- Brain pipeline tests return answers with citations and memory references.
- Cognitive loop tests validate Remember, Dream, and Reason together.
- Dream tests validate grouping, semantic creation, decay, history, empty state handling, and duplicate protection.
- Persistent Brain demo validates recurring research topics without external services.
