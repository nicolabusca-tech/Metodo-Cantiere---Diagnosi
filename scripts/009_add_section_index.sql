-- Migration 009: Add section_index column for positional ordering
-- The section_index is purely positional (0 = first section, 1 = second, etc.)
-- Replaces exact title matching with index-based upsert conflict resolution

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE public.form ADD COLUMN section_index INT;

-- Step 2: Backfill existing rows using created_at order
-- Sections were saved progressively (section 0 first, then 1, etc.)
UPDATE public.form f
SET section_index = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, tipo ORDER BY created_at) - 1 AS rn
  FROM public.form
) sub
WHERE f.id = sub.id;

-- Step 3: Make NOT NULL after backfill
ALTER TABLE public.form ALTER COLUMN section_index SET NOT NULL;

-- Step 4: Swap UNIQUE constraint from (user_id, titolo, tipo) to (user_id, section_index, tipo)
ALTER TABLE public.form DROP CONSTRAINT form_user_id_titolo_tipo_key;
ALTER TABLE public.form ADD CONSTRAINT form_user_id_section_index_tipo_key UNIQUE (user_id, section_index, tipo);

-- Step 5: Update index for common queries
DROP INDEX IF EXISTS idx_form_user_tipo;
CREATE INDEX idx_form_user_tipo ON public.form (user_id, tipo, section_index);

-- Verify
SELECT 'Migration 009 completed: section_index column added, UNIQUE constraint swapped' AS status;
SELECT user_id, tipo, section_index, titolo FROM public.form ORDER BY user_id, tipo, section_index LIMIT 20;
