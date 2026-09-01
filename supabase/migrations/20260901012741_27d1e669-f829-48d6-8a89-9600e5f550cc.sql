CREATE TABLE public.consumo_consultas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fonte text NOT NULL,
  cnpj text NOT NULL DEFAULT '',
  origem text NOT NULL DEFAULT 'consulta',
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  creditos integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.consumo_consultas TO authenticated;
GRANT ALL ON public.consumo_consultas TO service_role;

ALTER TABLE public.consumo_consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado le consumo de consultas"
ON public.consumo_consultas FOR SELECT TO authenticated USING (true);

CREATE INDEX consumo_consultas_created_at_idx ON public.consumo_consultas (created_at DESC);