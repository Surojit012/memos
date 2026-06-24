-- ─────────────────────────────────────────────────────────────
-- Migration: durable skill-payment replay protection (security)
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/trxlagmabswrttazbwie/sql/new
-- Safe to re-run (idempotent).
--
-- Each row records a payment transaction hash that has already been consumed
-- by a skill execution. The PRIMARY KEY on tx_hash makes a second insert of the
-- same hash fail (unique violation) — that's how we block payment replay even
-- across server restarts/redeploys, which the in-memory guard can't survive.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consumed_payments (
  tx_hash     VARCHAR(80)  PRIMARY KEY,
  skill_id    VARCHAR(255) NOT NULL,
  consumed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
