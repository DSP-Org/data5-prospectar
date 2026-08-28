ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS prospectar boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS companies_prospectar_idx ON public.companies (prospectar) WHERE prospectar;