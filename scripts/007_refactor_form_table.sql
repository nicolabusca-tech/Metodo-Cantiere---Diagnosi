-- Migration: Consolidate 16 form section tables into a single "form" table
-- Run this AFTER backing up your database
-- Prerequisites: form section tables and utenti table exist

-- Step 1: Create the new "form" table
CREATE TABLE IF NOT EXISTS public.form (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titolo TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  tipo TEXT NOT NULL CHECK (tipo IN ('analisi_lampo', 'diagnosi_strategica')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, titolo, tipo)
);

-- Step 2: Enable RLS
ALTER TABLE public.form ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_select_own" ON public.form;
CREATE POLICY "form_select_own" ON public.form FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "form_insert_own" ON public.form;
CREATE POLICY "form_insert_own" ON public.form FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "form_update_own" ON public.form;
CREATE POLICY "form_update_own" ON public.form FOR UPDATE USING (auth.uid() = user_id);

-- Step 3: Migrate existing data from analisi-lampo tables (base tables)

-- 0_dati_aziendali -> "Dati aziendali"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Dati aziendali',
  jsonb_build_object(
    'nomeReferente', COALESCE(q1, ''),
    'nomeAzienda', COALESCE(q2, ''),
    'descrizioneAzienda', COALESCE(q3, ''),
    'ruoloReferente', COALESCE(q4, ''),
    'emailAziendale', COALESCE(q5, ''),
    'telefono', COALESCE(q6, ''),
    'sitoWeb', COALESCE(q7, ''),
    'profiloSocial', COALESCE(q8, ''),
    'settorePrincipale', COALESCE(q9, ''),
    'zonaOperativa', COALESCE(q10, ''),
    'rangeFatturato', COALESCE(q11, '')
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."0_dati_aziendali"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 1_visibilita_web -> "Visibilità web"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Visibilità web',
  jsonb_build_object(
    'sitoWebFunzionante', COALESCE(q1::text, '3')::int,
    'googleMyBusiness', COALESCE(q2::text, '3')::int,
    'presenzaSocial', COALESCE(q3::text, '3')::int
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."1_visibilita_web"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 2_acquisizione_contatti -> "Acquisizione contatti"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Acquisizione contatti',
  jsonb_build_object(
    'diversificazioneCanali', COALESCE(q1::text, '3')::int,
    'nuoviContattiMese', COALESCE(q2::text, '3')::int,
    'tassoConversione', COALESCE(q3::text, '3')::int,
    'formCTA', COALESCE(q4::text, '3')::int
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."2_acquisizione_contatti"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 3_gestione_interna -> "Gestione interna"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Gestione interna',
  jsonb_build_object(
    'usoCRM', COALESCE(q1::text, '3')::int,
    'preventiviMese', COALESCE(q2::text, '3')::int,
    'followUpPreventivo', COALESCE(q3::text, '3')::int,
    'misurazioneTassoAccettazione', COALESCE(q4::text, '3')::int,
    'conoscenzaColliBottiglia', COALESCE(q5::text, '3')::int
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."3_gestione_interna"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 4_follow_up -> "Follow-up"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Follow-up',
  jsonb_build_object(
    'velocitaRisposta', COALESCE(q1::text, '3')::int,
    'chiRisponde', COALESCE(q2::text, '3')::int,
    'sistemaFollowUp', COALESCE(q3::text, '3')::int
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."4_follow_up"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 5_competitor -> "Competitor"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Competitor',
  jsonb_build_object(
    'individuazioneCompetitor', COALESCE(q1::text, '3')::int,
    'propostoValore', COALESCE(q2::text, '3')::int,
    'visibilitaOnline', COALESCE(q3::text, '3')::int,
    'competitors', COALESCE(competitor_data, '[]'::jsonb)
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."5_competitor"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 6_obiettivi -> "Obiettivi"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'Obiettivi',
  jsonb_build_object(
    'chiarezzaObiettivo', COALESCE(q1::text, '3')::int,
    'realismoObiettivo', COALESCE(q2::text, '3')::int
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."6_obiettivi"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- 7_kpi_sintetici -> "KPI Sintetici"
INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
SELECT
  user_id,
  'KPI Sintetici',
  jsonb_build_object(
    'tempoMedioRisposta', COALESCE(q1, ''),
    'percentualeFollowUp', COALESCE(q2, ''),
    'leadMensili', COALESCE(q3, ''),
    'tassoChiusura', COALESCE(q4, '')
  ),
  'analisi_lampo',
  COALESCE(created_at, NOW()),
  NOW()
FROM public."7_kpi_sintetici"
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, titolo, tipo) DO NOTHING;

-- Step 4: Migrate existing data from diagnosi-strategica tables (_strategica suffix)

-- 0_dati_aziendali_strategica -> "Dati aziendali"
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '0_dati_aziendali_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Dati aziendali',
    jsonb_build_object(
      'nomeReferente', COALESCE(q1, ''),
      'nomeAzienda', COALESCE(q2, ''),
      'descrizioneAzienda', COALESCE(q3, ''),
      'ruoloReferente', COALESCE(q4, ''),
      'emailAziendale', COALESCE(q5, ''),
      'telefono', COALESCE(q6, ''),
      'sitoWeb', COALESCE(q7, ''),
      'profiloSocial', COALESCE(q8, ''),
      'settorePrincipale', COALESCE(q9, ''),
      'zonaOperativa', COALESCE(q10, ''),
      'rangeFatturato', COALESCE(q11, '')
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."0_dati_aziendali_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '1_visibilita_web_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Visibilità web',
    jsonb_build_object(
      'sitoWebFunzionante', COALESCE(q1::text, '3')::int,
      'googleMyBusiness', COALESCE(q2::text, '3')::int,
      'presenzaSocial', COALESCE(q3::text, '3')::int
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."1_visibilita_web_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '2_acquisizione_contatti_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Acquisizione contatti',
    jsonb_build_object(
      'diversificazioneCanali', COALESCE(q1::text, '3')::int,
      'nuoviContattiMese', COALESCE(q2::text, '3')::int,
      'tassoConversione', COALESCE(q3::text, '3')::int,
      'formCTA', COALESCE(q4::text, '3')::int
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."2_acquisizione_contatti_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '3_gestione_interna_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Gestione interna',
    jsonb_build_object(
      'usoCRM', COALESCE(q1::text, '3')::int,
      'preventiviMese', COALESCE(q2::text, '3')::int,
      'followUpPreventivo', COALESCE(q3::text, '3')::int,
      'misurazioneTassoAccettazione', COALESCE(q4::text, '3')::int,
      'conoscenzaColliBottiglia', COALESCE(q5::text, '3')::int
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."3_gestione_interna_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '4_follow_up_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Follow-up',
    jsonb_build_object(
      'velocitaRisposta', COALESCE(q1::text, '3')::int,
      'chiRisponde', COALESCE(q2::text, '3')::int,
      'sistemaFollowUp', COALESCE(q3::text, '3')::int
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."4_follow_up_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '5_competitor_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Competitor',
    jsonb_build_object(
      'individuazioneCompetitor', COALESCE(q1::text, '3')::int,
      'propostoValore', COALESCE(q2::text, '3')::int,
      'visibilitaOnline', COALESCE(q3::text, '3')::int,
      'competitors', COALESCE(competitor_data, '[]'::jsonb)
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."5_competitor_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '6_obiettivi_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'Obiettivi',
    jsonb_build_object(
      'chiarezzaObiettivo', COALESCE(q1::text, '3')::int,
      'realismoObiettivo', COALESCE(q2::text, '3')::int
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."6_obiettivi_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '7_kpi_sintetici_strategica') THEN
  INSERT INTO public.form (user_id, titolo, data, tipo, created_at, updated_at)
  SELECT
    user_id,
    'KPI Sintetici',
    jsonb_build_object(
      'tempoMedioRisposta', COALESCE(q1, ''),
      'percentualeFollowUp', COALESCE(q2, ''),
      'leadMensili', COALESCE(q3, ''),
      'tassoChiusura', COALESCE(q4, '')
    ),
    'diagnosi_strategica',
    COALESCE(created_at, NOW()),
    NOW()
  FROM public."7_kpi_sintetici_strategica"
  WHERE user_id IS NOT NULL
  ON CONFLICT (user_id, titolo, tipo) DO NOTHING;
END IF;
END $$;

-- Step 5: Drop old tables
DROP TABLE IF EXISTS public."0_dati_aziendali" CASCADE;
DROP TABLE IF EXISTS public."1_visibilita_web" CASCADE;
DROP TABLE IF EXISTS public."2_acquisizione_contatti" CASCADE;
DROP TABLE IF EXISTS public."3_gestione_interna" CASCADE;
DROP TABLE IF EXISTS public."4_follow_up" CASCADE;
DROP TABLE IF EXISTS public."5_competitor" CASCADE;
DROP TABLE IF EXISTS public."6_obiettivi" CASCADE;
DROP TABLE IF EXISTS public."7_kpi_sintetici" CASCADE;
DROP TABLE IF EXISTS public."0_dati_aziendali_strategica" CASCADE;
DROP TABLE IF EXISTS public."1_visibilita_web_strategica" CASCADE;
DROP TABLE IF EXISTS public."2_acquisizione_contatti_strategica" CASCADE;
DROP TABLE IF EXISTS public."3_gestione_interna_strategica" CASCADE;
DROP TABLE IF EXISTS public."4_follow_up_strategica" CASCADE;
DROP TABLE IF EXISTS public."5_competitor_strategica" CASCADE;
DROP TABLE IF EXISTS public."6_obiettivi_strategica" CASCADE;
DROP TABLE IF EXISTS public."7_kpi_sintetici_strategica" CASCADE;

-- Step 5b: Drop any other tables ending with _strategica or _strategia (safety net)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename LIKE '%\_strategica' OR tablename LIKE '%\_strategia')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
    RAISE NOTICE 'Dropped table: %', r.tablename;
  END LOOP;
END $$;

-- Step 6: Create index for common queries
CREATE INDEX IF NOT EXISTS idx_form_user_tipo ON public.form (user_id, tipo);

-- Verify
SELECT 'Migration 007 completed: form table created, old tables dropped' AS status;
SELECT count(*) AS total_rows FROM public.form;
