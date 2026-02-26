-- Migration: Form tables linked to user_id, remove submissions table
-- Run this AFTER backing up your database
-- Prerequisites: utenti, submissions, and form tables exist

-- Step 1: Add form_status columns to utenti
ALTER TABLE public.utenti
  ADD COLUMN IF NOT EXISTS form_status_analisi text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_status_diagnosi text DEFAULT NULL;

-- Step 2: Migrate form_status from submissions to utenti
UPDATE public.utenti u
SET form_status_analisi = s.form_status
FROM public.submissions s
WHERE u.submission_id_analisi = s.id AND s.form_status IS NOT NULL;

UPDATE public.utenti u
SET form_status_diagnosi = s.form_status
FROM public.submissions s
WHERE u.submission_id_diagnosi = s.id AND s.form_status IS NOT NULL;

-- Step 3: Modify form tables (analisi - base tables)
-- Tables: 0_dati_aziendali, 1_visibilita_web, 2_acquisizione_contatti, 3_gestione_interna, 4_follow_up, 5_competitor, 6_obiettivi, 7_kpi_sintetici
DO $$
DECLARE
  tbl text;
  analisi_tables text[] := ARRAY[
    '0_dati_aziendali', '1_visibilita_web', '2_acquisizione_contatti', '3_gestione_interna',
    '4_follow_up', '5_competitor', '6_obiettivi', '7_kpi_sintetici'
  ];
BEGIN
  FOREACH tbl IN ARRAY analisi_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Add user_id column
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE', tbl);
      -- Migrate: set user_id from utenti where submission_id_analisi = submission_id
      EXECUTE format('
        UPDATE public.%I ft
        SET user_id = u.id
        FROM public.utenti u
        WHERE u.submission_id_analisi = ft.submission_id AND ft.user_id IS NULL
      ', tbl);
      -- Drop submission_id
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'submission_id') THEN
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN submission_id', tbl);
      END IF;
      -- Add unique constraint on user_id
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (user_id)', tbl, tbl || '_user_id_key');
      EXCEPTION WHEN duplicate_object THEN
        NULL; -- constraint already exists
      END;
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      -- Drop existing policies if any, then create
      EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid() = user_id)', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- Step 3b: Modify form tables (diagnosi - _strategica tables)

DO $$
DECLARE
  tbl text;
  base_tables text[] := ARRAY[
    '0_dati_aziendali', '1_visibilita_web', '2_acquisizione_contatti', '3_gestione_interna',
    '4_follow_up', '5_competitor', '6_obiettivi', '7_kpi_sintetici'
  ];
  full_tbl text;
BEGIN
  FOREACH tbl IN ARRAY base_tables
  LOOP
    full_tbl := tbl || '_strategica';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = full_tbl) THEN
      -- Add user_id column
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE', full_tbl);
      -- Migrate: set user_id from utenti where submission_id_diagnosi = submission_id
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = full_tbl AND column_name = 'submission_id') THEN
        EXECUTE format('
          UPDATE public.%I ft
          SET user_id = u.id
          FROM public.utenti u
          WHERE u.submission_id_diagnosi = ft.submission_id AND ft.user_id IS NULL
        ', full_tbl);
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN submission_id', full_tbl);
      END IF;
      -- Add unique constraint on user_id
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (user_id)', full_tbl, full_tbl || '_user_id_key');
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', full_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON public.%I', full_tbl, full_tbl);
      EXECUTE format('CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid() = user_id)', full_tbl, full_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON public.%I', full_tbl, full_tbl);
      EXECUTE format('CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', full_tbl, full_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON public.%I', full_tbl, full_tbl);
      EXECUTE format('CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', full_tbl, full_tbl);
    END IF;
  END LOOP;
END $$;

-- Step 4: Remove submission_id columns from utenti and drop submissions
ALTER TABLE public.utenti
  DROP COLUMN IF EXISTS submission_id_analisi,
  DROP COLUMN IF EXISTS submission_id_diagnosi;

DROP TABLE IF EXISTS public.submissions CASCADE;

-- Verify
SELECT 'Migration completed successfully' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'utenti' AND column_name IN ('form_status_analisi', 'form_status_diagnosi');
