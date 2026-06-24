-- ─────────────────────────────────────────────────────────────
-- Migration: per-day API key usage buckets (Phase 10 — analytics)
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/trxlagmabswrttazbwie/sql/new
-- Safe to re-run (idempotent).
--
-- One row per (key, UTC day). The auth hot path increments the matching
-- bucket fire-and-forget. Daily / weekly / monthly charts are all derived
-- from this single table by aggregating in the app layer.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_key_usage_daily (
  key_id   UUID         NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  day      DATE         NOT NULL,
  count    BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, day)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_agent_day ON api_key_usage_daily(agent_id, day);

-- Atomic upsert: bump today's bucket for a key, creating it on first hit.
CREATE OR REPLACE FUNCTION increment_api_key_usage_daily(
  p_key_id   UUID,
  p_agent_id VARCHAR,
  p_day      DATE
)
RETURNS VOID AS $$
  INSERT INTO api_key_usage_daily (key_id, agent_id, day, count)
  VALUES (p_key_id, p_agent_id, p_day, 1)
  ON CONFLICT (key_id, day)
  DO UPDATE SET count = api_key_usage_daily.count + 1;
$$ LANGUAGE sql;
