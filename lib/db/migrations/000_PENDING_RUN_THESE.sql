-- ═══════════════════════════════════════════════════════════════════════════
-- PENDING MIGRATIONS (002–005)
--
-- Copy this entire file and paste it into:
--   https://supabase.com/dashboard/project/trxlagmabswrttazbwie/sql/new
--
-- All migrations are idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Phase 9: human-friendly agent display name (cosmetic only — never used for auth).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_name VARCHAR(120);

-- ─────────────────────────────────────────────────────────────
-- Phase 10: per-day usage buckets for analytics (daily/weekly/monthly).
-- One row per (key, UTC day). Charts aggregate from this single table.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_key_usage_daily (
  key_id   UUID         NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  day      DATE         NOT NULL,
  count    BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, day)
);
CREATE INDEX IF NOT EXISTS idx_usage_daily_agent_day ON api_key_usage_daily(agent_id, day);

CREATE OR REPLACE FUNCTION increment_api_key_usage_daily(p_key_id UUID, p_agent_id VARCHAR, p_day DATE)
RETURNS VOID AS $$
  INSERT INTO api_key_usage_daily (key_id, agent_id, day, count)
  VALUES (p_key_id, p_agent_id, p_day, 1)
  ON CONFLICT (key_id, day)
  DO UPDATE SET count = api_key_usage_daily.count + 1;
$$ LANGUAGE sql;

-- ─────────────────────────────────────────────────────────────
-- Phase 11: 0G manifest pointer. Privy agents aren't on-chain, so we index
-- their latest 0G "brain" manifest hash here to restore memories after restart.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS manifest_hash VARCHAR(255);

-- ─────────────────────────────────────────────────────────────
-- Phase 12: durable skill-payment replay protection (security).
-- One row per consumed payment txHash. The PK blocks reuse of a payment
-- across restarts/redeploys, which the in-memory guard can't survive.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consumed_payments (
  tx_hash     VARCHAR(80)  PRIMARY KEY,
  skill_id    VARCHAR(255) NOT NULL,
  consumed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
