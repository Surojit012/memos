# Changelog

## 0.2.0

### Fixed (breaking — but the old behavior never worked)

- **`execute_skill` now actually works.** It was sending `input` but the API
  expects `userInput`, so every call failed with `400 skillId and userInput
  required`. It also now reads `output` from the response (was reading a
  non-existent `result` field).
- **`run_pipeline`** was sending `input`; the API expects `initialInput`. Fixed.
- **`dream`** was reading `memoriesAnalyzed`/`patternsFound`/`dreamSummary` etc.,
  none of which the API returns. Now mapped from the real response
  (`totalMemoriesProcessed`, `consolidatedCount`, `message`, `consolidated`,
  `durationMs`).

### Changed

- `SkillResult`: removed `duration` (never returned by the API); added `model`
  and `compute_provider`.
- `DreamResult.new_memories` now holds the consolidated fact strings, matching
  what the API returns.
