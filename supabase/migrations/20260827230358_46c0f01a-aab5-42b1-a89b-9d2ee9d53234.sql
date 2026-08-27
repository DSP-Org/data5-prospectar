CREATE TABLE public.prospection_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_cnpj text NOT NULL REFERENCES public.companies(cnpj) ON DELETE CASCADE,
  tipo text NOT NULL,
  observacao text NOT NULL DEFAULT '',
  responsavel text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.prospection_activities TO service_role;
ALTER TABLE public.prospection_activities ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER prospection_activities_set_updated_at
  BEFORE UPDATE ON public.prospection_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_prospection_activities_company_cnpj ON public.prospection_activities(company_cnpj);
CREATE INDEX idx_prospection_activities_created_at ON public.prospection_activities(created_at DESC);