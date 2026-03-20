-- Migration: Three TEXT columns for Diagnosi Strategica (Volume I–III).
-- Run in Supabase SQL Editor after prior diagnosi migrations.
--
-- External workflows (e.g. n8n writing to Supabase) should set volume_1, volume_2, volume_3
-- for tipo = 'diagnosi_strategica' instead of the legacy diagnosi column.

ALTER TABLE public.diagnosi
  ADD COLUMN IF NOT EXISTS volume_1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS volume_2 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS volume_3 TEXT NOT NULL DEFAULT '';

-- One-time legacy: if strategica still has only diagnosi, move it to volume_1 and clear diagnosi.
UPDATE public.diagnosi
SET
  volume_1 = diagnosi,
  diagnosi = ''
WHERE tipo = 'diagnosi_strategica'
  AND TRIM(COALESCE(volume_1, '')) = ''
  AND TRIM(COALESCE(diagnosi, '')) <> '';

SELECT 'Migration 016 completed: diagnosi volume_1/2/3 for Diagnosi Strategica' AS status;
