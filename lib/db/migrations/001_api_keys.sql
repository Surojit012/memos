-- ─────────────────────────────────────────────────────────────
-- Migration: multi-key API key management (Phase 8)
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/trxlagmabswrttazbwie/sql/new
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────

-- gen_random_uuid() lives in pgcrypto (enabled by default on Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id        VARCHAR(255) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  prefix          VARCHAR(16)  NOT NULL,
  hashed_key      VARCHAR(64)  UNIQUE NOT NULL,
  request_count   BIGINT       NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id    ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id   ON api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_key ON api_keys(hashed_key);

-- Atomic per-key usage counter, called fire-and-forget from auth.
CREATE OR REPLACE FUNCTION increment_api_key_usage(p_key_id UUID, p_now TIMESTAMPTZ)
RETURNS VOID AS $$
  UPDATE api_keys
  SET    request_count = request_count + 1,
         last_used_at  = p_now
  WHERE  id = p_key_id;
$$ LANGUAGE sql;
