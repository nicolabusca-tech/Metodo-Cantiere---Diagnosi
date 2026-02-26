-- Migration: Remove utenti_analisi_lampo and utenti_diagnosi_strategica, use only utenti
-- Run this AFTER backing up your database
-- Prerequisites: utenti table exists with paid_analisi, paid_diagnosi (text or boolean)

-- Step 1: Add submission_id columns to utenti (if not exist)
ALTER TABLE public.utenti
  ADD COLUMN IF NOT EXISTS submission_id_analisi uuid,
  ADD COLUMN IF NOT EXISTS submission_id_diagnosi uuid;

-- Step 2: Migrate submission_id from legacy tables to utenti (before dropping)
-- Only run if the source table AND submission_id column exist (some schemas may not have it)
DO $$
BEGIN
  -- Analisi: find table and check for submission_id column
  IF EXISTS (SELECT 1 FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_name = 'utenti_analisi_lampo' AND c.column_name = 'submission_id') THEN
    UPDATE public.utenti u SET submission_id_analisi = ual.submission_id
    FROM public.utenti_analisi_lampo ual
    WHERE u.id = ual.id AND ual.submission_id IS NOT NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_name = 'utenti_analisi_lampo_backup' AND c.column_name = 'submission_id') THEN
    UPDATE public.utenti u SET submission_id_analisi = ual.submission_id
    FROM public.utenti_analisi_lampo_backup ual
    WHERE u.id = ual.id AND ual.submission_id IS NOT NULL;
  END IF;

  -- Diagnosi: same check - only migrate if submission_id column exists
  IF EXISTS (SELECT 1 FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_name = 'utenti_diagnosi_strategica' AND c.column_name = 'submission_id') THEN
    UPDATE public.utenti u SET submission_id_diagnosi = uds.submission_id
    FROM public.utenti_diagnosi_strategica uds
    WHERE u.id = uds.id AND uds.submission_id IS NOT NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_name = 'utenti_diagnosi_strategica_backup' AND c.column_name = 'submission_id') THEN
    UPDATE public.utenti u SET submission_id_diagnosi = uds.submission_id
    FROM public.utenti_diagnosi_strategica_backup uds
    WHERE u.id = uds.id AND uds.submission_id IS NOT NULL;
  END IF;
END $$;

-- Step 3: Convert paid_analisi and paid_diagnosi to boolean
-- Handle both text and boolean column types
DO $$
BEGIN
  -- paid_analisi: add temp column, migrate, drop old, rename
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'utenti' AND column_name = 'paid_analisi') THEN
    ALTER TABLE public.utenti ADD COLUMN IF NOT EXISTS paid_analisi_bool boolean DEFAULT false;
    UPDATE public.utenti SET paid_analisi_bool = COALESCE(paid_analisi::text, '') IN ('paid', 'true', 't');
    ALTER TABLE public.utenti DROP COLUMN IF EXISTS paid_analisi;
    ALTER TABLE public.utenti RENAME COLUMN paid_analisi_bool TO paid_analisi;
  END IF;

  -- paid_diagnosi: same
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'utenti' AND column_name = 'paid_diagnosi') THEN
    ALTER TABLE public.utenti ADD COLUMN IF NOT EXISTS paid_diagnosi_bool boolean DEFAULT false;
    UPDATE public.utenti SET paid_diagnosi_bool = COALESCE(paid_diagnosi::text, '') IN ('paid', 'true', 't');
    ALTER TABLE public.utenti DROP COLUMN IF EXISTS paid_diagnosi;
    ALTER TABLE public.utenti RENAME COLUMN paid_diagnosi_bool TO paid_diagnosi;
  END IF;
END $$;

-- If columns don't exist yet, create them
ALTER TABLE public.utenti
  ADD COLUMN IF NOT EXISTS paid_analisi boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_diagnosi boolean DEFAULT false;

-- Step 4: Drop legacy tables
DROP TABLE IF EXISTS public.utenti_analisi_lampo CASCADE;
DROP TABLE IF EXISTS public.utenti_diagnosi_strategica CASCADE;

-- Optional: drop backups if they exist from previous migration
DROP TABLE IF EXISTS public.utenti_analisi_lampo_backup CASCADE;
DROP TABLE IF EXISTS public.utenti_diagnosi_strategica_backup CASCADE;

-- Step 5: Update auth trigger to insert into utenti (if it was using utenti_analisi_lampo)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.utenti (id, email, nome, cognome, azienda, paid_analisi, paid_diagnosi)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
    COALESCE(NEW.raw_user_meta_data->>'azienda', ''),
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    cognome = EXCLUDED.cognome,
    azienda = EXCLUDED.azienda,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify
SELECT 'Migration completed successfully' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'utenti' AND column_name IN ('paid_analisi', 'paid_diagnosi', 'submission_id_analisi', 'submission_id_diagnosi');
