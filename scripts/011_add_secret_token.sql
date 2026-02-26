-- Migration 011: Add secret_token column to diagnosi table
-- Allows unauthenticated review/edit via a secret shareable link

ALTER TABLE public.diagnosi
  ADD COLUMN IF NOT EXISTS secret_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Backfill existing rows (each gets a unique token from the DEFAULT)
-- No explicit backfill needed: DEFAULT handles it on ALTER ADD COLUMN

-- Unique index for fast lookups by token
CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnosi_secret_token ON public.diagnosi (secret_token);

-- Verify
SELECT 'Migration 011 completed: secret_token column added to diagnosi' AS status;
