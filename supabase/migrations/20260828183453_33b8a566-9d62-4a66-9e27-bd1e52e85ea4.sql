CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo text NOT NULL DEFAULT '',
  list_id uuid REFERENCES public.company_lists(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  criado_por uuid,
  total integer NOT NULL DEFAULT 0,
  concluidos integer NOT NULL DEFAULT 0,
  nao_encontrados integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.import_jobs TO authenticated;
GRANT ALL ON public.import_jobs TO service_role;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario le importacoes das suas unidades" ON public.import_jobs
  FOR SELECT TO authenticated
  USING (unit_id IS NULL OR public.has_unit(auth.uid(), unit_id));

CREATE TRIGGER import_jobs_set_updated_at BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  cnpj text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  erro text,
  tentativas integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.import_items TO authenticated;
GRANT ALL ON public.import_items TO service_role;
ALTER TABLE public.import_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario le itens das importacoes visiveis" ON public.import_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.import_jobs j
    WHERE j.id = import_items.job_id
      AND (j.unit_id IS NULL OR public.has_unit(auth.uid(), j.unit_id))
  ));

CREATE TRIGGER import_items_set_updated_at BEFORE UPDATE ON public.import_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_import_items_job_status ON public.import_items (job_id, status);
CREATE INDEX idx_import_jobs_created ON public.import_jobs (created_at DESC);