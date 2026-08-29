ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS owner_desde timestamptz;

COMMENT ON COLUMN public.companies.owner_id IS 'Vendedor que assumiu o lead; nulo quando ainda nao tem dono.';
COMMENT ON COLUMN public.companies.owner_desde IS 'Quando o lead foi assumido pelo dono atual.';

CREATE INDEX IF NOT EXISTS companies_owner_idx
  ON public.companies (owner_id)
  WHERE owner_id IS NOT NULL;