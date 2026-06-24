-- ─────────────────────────────────────────────────────────────
-- Migration: human-friendly agent display name (Phase 9)
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/trxlagmabswrttazbwie/sql/new
-- Safe to re-run (idempotent).
--
-- The agent_id stays the stable, opaque, globally-unique key used on-chain
-- and in every API call. agent_name is a purely cosmetic label the user
-- controls — shown in the playground and dashboard, never used for auth.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_name VARCHAR(120);
