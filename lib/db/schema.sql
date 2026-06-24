CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  privy_user_id VARCHAR(255) UNIQUE NOT NULL,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  api_key_created_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);

-- Phase 7: Onboarding tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Phase 9: human-friendly agent display name (cosmetic only — never used for auth).
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_name VARCHAR(120);

-- Phase 11: 0G manifest pointer. Privy agents aren't on-chain, so we index
-- their latest 0G "brain" manifest hash here to restore memories after restart.
ALTER TABLE users ADD COLUMN IF NOT EXISTS manifest_hash VARCHAR(255);

-- ─────────────────────────────────────────────────────────────
-- Phase 8: Multi-key API key management.
-- Each user can mint N named keys; we store only a SHA-256 hash of the
-- full secret. The plaintext is shown to the user exactly once at create
-- time. The public `prefix` is what we render in dashboards.
-- ─────────────────────────────────────────────────────────────
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

-- Atomic per-key usage counter. Increments request_count and stamps
-- last_used_at in a single round-trip; called fire-and-forget from auth.
CREATE OR REPLACE FUNCTION increment_api_key_usage(p_key_id UUID, p_now TIMESTAMPTZ)
RETURNS VOID AS $$
  UPDATE api_keys
  SET    request_count = request_count + 1,
         last_used_at  = p_now
  WHERE  id = p_key_id;
$$ LANGUAGE sql;

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
-- Phase 12: durable skill-payment replay protection (security).
-- One row per consumed payment txHash. The PK blocks reuse of a payment
-- across restarts/redeploys, which the in-memory guard can't survive.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consumed_payments (
  tx_hash     VARCHAR(80)  PRIMARY KEY,
  skill_id    VARCHAR(255) NOT NULL,
  consumed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
