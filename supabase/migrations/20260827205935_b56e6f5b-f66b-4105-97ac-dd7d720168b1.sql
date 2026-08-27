ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS fonte_principal text,
  ADD COLUMN IF NOT EXISTS fontes text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.companies
SET fonte_principal = 'econodata',
    fontes = ARRAY['econodata']::text[]
WHERE fonte_principal IS NULL;

CREATE INDEX IF NOT EXISTS companies_fonte_principal_idx ON public.companies (fonte_principal);