# Changelog

## 0.2.0

### Fixed (breaking — but the old behavior never worked)

- **`executeSkill` now actually works.** It was sending `input` but the API
  expects `userInput`, so every call failed with `400 skillId and userInput
  required`. It also now reads `output` from the response (was reading a
  non-existent `result` field).
- **`runPipeline`** was sending `input`; the API expects `initialInput`. Fixed.
- **`triggerDream`** was reading `memoriesAnalyzed`/`patternsFound`/`dreamSummary`
  etc., none of which the API returns. Now mapped from the real response
  (`totalMemoriesProcessed`, `consolidatedCount`, `message`, `consolidated`,
  `durationMs`).

### Changed

- `SkillResult`: removed `duration` (never returned by the API); added `model`
  and `computeProvider`.
- `DreamResult.newMemories` is now `string[]` (the consolidated facts), matching
  what the API returns.
