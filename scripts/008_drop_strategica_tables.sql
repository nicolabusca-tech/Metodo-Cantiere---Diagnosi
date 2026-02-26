-- Migration: Drop all tables ending with _strategica or _strategia
-- Run this if you already executed 007 and need to clean up remaining _strategica/_strategia tables

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename LIKE '%\_strategica' ESCAPE '\' OR tablename LIKE '%\_strategia' ESCAPE '\')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
    RAISE NOTICE 'Dropped table: %', r.tablename;
  END LOOP;
END $$;

SELECT 'Migration 008 completed: _strategica/_strategia tables dropped' AS status;
