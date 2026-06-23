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
