-- ─────────────────────────────────────────────────────────────
-- Migration: 0G manifest pointer for Privy agents (Phase 11 — durability)
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/trxlagmabswrttazbwie/sql/new
-- Safe to re-run (idempotent).
--
-- Privy-provisioned agents are never registered on-chain, so the on-chain
-- registry can't be used to find their 0G "brain" manifest after a restart.
-- We store the latest 0G manifest hash here instead. On startup we read this
-- pointer and re-download the agent's memories + skills from 0G Storage.
-- Memories still LIVE on 0G — this is just a decentralization-friendly index.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS manifest_hash VARCHAR(255);
