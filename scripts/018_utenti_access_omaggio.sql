-- Accesso form come omaggio (indipendente da Stripe paid_*)
ALTER TABLE public.utenti
  ADD COLUMN IF NOT EXISTS access_omaggio_analisi boolean NOT NULL DEFAULT false;

ALTER TABLE public.utenti
  ADD COLUMN IF NOT EXISTS access_omaggio_diagnosi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.utenti.access_omaggio_analisi IS 'Accesso gratuito al form Analisi Lampo (es. omaggio da Setup)';
COMMENT ON COLUMN public.utenti.access_omaggio_diagnosi IS 'Accesso gratuito al form Diagnosi Strategica (es. omaggio da Setup)';
