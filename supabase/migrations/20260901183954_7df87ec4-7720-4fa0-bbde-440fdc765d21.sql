ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enriquecido_em timestamptz;

-- Empresas que já têm razão social vieram de uma consulta às fontes.
UPDATE public.companies SET enriquecido_em = COALESCE(synced_at, created_at)
WHERE enriquecido_em IS NULL AND COALESCE(razao_social, '') <> '';

CREATE INDEX IF NOT EXISTS companies_enriquecido_em_idx ON public.companies (enriquecido_em);