ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS simples_optante boolean,
  ADD COLUMN IF NOT EXISTS simples_desde date,
  ADD COLUMN IF NOT EXISTS mei_optante boolean,
  ADD COLUMN IF NOT EXISTS mei_desde date;

UPDATE public.companies
SET
  simples_optante = NULLIF(raw -> 'cnpja' -> 'extras' -> 'tributario' ->> 'simples_optante', '')::boolean,
  simples_desde   = NULLIF(raw -> 'cnpja' -> 'extras' -> 'tributario' ->> 'simples_desde', '')::date,
  mei_optante     = NULLIF(raw -> 'cnpja' -> 'extras' -> 'tributario' ->> 'mei_optante', '')::boolean,
  mei_desde       = NULLIF(raw -> 'cnpja' -> 'extras' -> 'tributario' ->> 'mei_desde', '')::date
WHERE raw -> 'cnpja' -> 'extras' -> 'tributario' IS NOT NULL;

CREATE INDEX IF NOT EXISTS companies_simples_optante_idx ON public.companies (simples_optante) WHERE simples_optante IS NOT NULL;
CREATE INDEX IF NOT EXISTS companies_mei_optante_idx ON public.companies (mei_optante) WHERE mei_optante IS NOT NULL;