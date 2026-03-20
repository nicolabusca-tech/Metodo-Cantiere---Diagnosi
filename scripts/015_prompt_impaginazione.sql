-- Migration: Add prompt_impaginazione for Diagnosi Strategica (prompt_setup)
-- Run if you already executed 014 before prompt_impaginazione was added.

ALTER TABLE public.prompt_setup
  ADD COLUMN IF NOT EXISTS prompt_impaginazione TEXT NOT NULL DEFAULT '';

SELECT 'Migration 015 completed: prompt_impaginazione' AS status;
