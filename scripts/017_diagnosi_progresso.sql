-- Migration: progresso lavorazione per ogni riga diagnosi (in corso | completato).
-- Run in Supabase SQL Editor after prior diagnosi migrations.

ALTER TABLE public.diagnosi
  ADD COLUMN IF NOT EXISTS progresso TEXT NOT NULL DEFAULT 'in corso'
  CHECK (progresso IN ('in corso', 'completato'));

SELECT 'Migration 017 completed: diagnosi.progresso' AS status;
