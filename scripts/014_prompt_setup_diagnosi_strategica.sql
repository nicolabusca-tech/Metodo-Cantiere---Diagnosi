-- Migration: Dedicated prompt fields for Diagnosi Strategica (prompt_setup)
-- Run in Supabase SQL Editor after 013_create_setup_tables.sql

ALTER TABLE public.prompt_setup
  ADD COLUMN IF NOT EXISTS prompt_ricerca_azienda_cliente TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_ricerca_competitor TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_mercato_locale TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_volume_1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_volume_2 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_volume_3 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_impaginazione TEXT NOT NULL DEFAULT '';

-- Clear legacy three prompts for strategica row only (Analisi Lampo row unchanged)
UPDATE public.prompt_setup
SET
  prompt_generale = '',
  prompt_competitor = '',
  prompt_riscrittura = ''
WHERE tipo = 'diagnosi_strategica';

SELECT 'Migration 014 completed: prompt_setup Diagnosi Strategica columns (incl. impaginazione)' AS status;
