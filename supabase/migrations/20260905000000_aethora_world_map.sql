-- AETHORA P1.3 — world map progression.
-- Adds the discovered_regions column to game_states so region discovery
-- persists in the authoritative cloud save alongside XP/streak/achievements.
-- Idempotent: safe to re-apply.

alter table public.game_states
  add column if not exists discovered_regions jsonb not null default '[]'::jsonb;
