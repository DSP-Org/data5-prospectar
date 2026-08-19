CREATE TABLE public.company_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'slate',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  cnpj text PRIMARY KEY,
  razao_social text NOT NULL DEFAULT '',
  nome_fantasia text,
  tipo_unidade text,
  situacao text,
  natureza_juridica text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cep text,
  cidade text,
  uf text,
  cnae_codigo text,
  cnae_descricao text,
  setores text[] NOT NULL DEFAULT '{}',
  porte_estimado text,
  enquadramento_porte text[] NOT NULL DEFAULT '{}',
  faturamento_presumido text,
  qtd_funcionarios_estimada text,
  capital_social numeric,
  data_abertura date,
  melhor_telefone text,
  telefones text[] NOT NULL DEFAULT '{}',
  melhor_site text,
  sites text[] NOT NULL DEFAULT '{}',
  email_receita text,
  emails text[] NOT NULL DEFAULT '{}',
  contatos jsonb NOT NULL DEFAULT '[]'::jsonb,
  decisores jsonb NOT NULL DEFAULT '[]'::jsonb,
  link_detalhe text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo',
  notas text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  list_id uuid REFERENCES public.company_lists(id) ON DELETE SET NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX companies_status_idx ON public.companies (status);
CREATE INDEX companies_list_idx ON public.companies (list_id);
CREATE INDEX companies_uf_idx ON public.companies (uf);
CREATE INDEX companies_created_idx ON public.companies (created_at DESC);

CREATE TABLE public.query_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  entrada text NOT NULL,
  resultado text NOT NULL,
  mensagem text,
  quantidade integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX query_log_created_idx ON public.query_log (created_at DESC);

GRANT ALL ON public.company_lists TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.query_log TO service_role;

ALTER TABLE public.company_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();