-- Migration 010: Create diagnosi table for storing diagnosis results (Markdown)
-- One row per user per product type (analisi_lampo / diagnosi_strategica)
-- The "enabled" flag controls visibility to the end user

CREATE TABLE IF NOT EXISTS public.diagnosi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('analisi_lampo', 'diagnosi_strategica')),
  diagnosi TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, tipo)
);

-- RLS: users can only read their own enabled diagnosi
ALTER TABLE public.diagnosi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diagnosi_select_own_enabled" ON public.diagnosi;
CREATE POLICY "diagnosi_select_own_enabled" ON public.diagnosi
  FOR SELECT USING (auth.uid() = user_id AND enabled = true);

-- Index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_diagnosi_user_tipo ON public.diagnosi (user_id, tipo);

-- Verify
SELECT 'Migration 010 completed: diagnosi table created' AS status;
