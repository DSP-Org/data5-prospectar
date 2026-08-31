CREATE TABLE public.carteira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL REFERENCES public.companies(cnpj) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'novo',
  prospectar boolean NOT NULL DEFAULT false,
  notas text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  list_id uuid REFERENCES public.company_lists(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  owner_id uuid,
  owner_desde timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cnpj, unit_id)
);

COMMENT ON TABLE public.carteira IS 'Vinculo comercial entre uma empresa (cadastro compartilhado em companies) e a unidade que a esta trabalhando. Sem linha aqui = empresa ainda nao vinculada por nenhuma unidade.';

CREATE INDEX carteira_unit_idx ON public.carteira (unit_id);
CREATE INDEX carteira_owner_idx ON public.carteira (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX carteira_status_idx ON public.carteira (status);
CREATE INDEX carteira_prospectar_idx ON public.carteira (prospectar) WHERE prospectar;
CREATE INDEX carteira_list_idx ON public.carteira (list_id);

CREATE TRIGGER carteira_set_updated_at BEFORE UPDATE ON public.carteira
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.carteira TO authenticated;
GRANT ALL ON public.carteira TO service_role;
ALTER TABLE public.carteira ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario le carteira das suas unidades" ON public.carteira
  FOR SELECT TO authenticated
  USING (public.has_unit(auth.uid(), unit_id));

INSERT INTO public.carteira (cnpj, unit_id, status, prospectar, notas, tags, list_id, product_id, owner_id, owner_desde, created_at, updated_at)
SELECT cnpj, unit_id, status, prospectar, notas, tags, list_id, product_id, owner_id, owner_desde, created_at, updated_at
FROM public.companies
WHERE unit_id IS NOT NULL;

ALTER TABLE public.companies
  DROP COLUMN status,
  DROP COLUMN prospectar,
  DROP COLUMN notas,
  DROP COLUMN tags,
  DROP COLUMN list_id,
  DROP COLUMN product_id,
  DROP COLUMN owner_id,
  DROP COLUMN owner_desde,
  DROP COLUMN unit_id;

CREATE VIEW public.v_carteira AS
SELECT
  co.cnpj, co.razao_social, co.nome_fantasia, co.tipo_unidade, co.situacao,
  co.natureza_juridica, co.logradouro, co.numero, co.complemento, co.bairro,
  co.cep, co.cidade, co.uf, co.cnae_codigo, co.cnae_descricao, co.setores,
  co.porte_estimado, co.enquadramento_porte, co.faturamento_presumido,
  co.qtd_funcionarios_estimada, co.capital_social, co.data_abertura,
  co.simples_optante, co.simples_desde, co.mei_optante, co.mei_desde,
  co.melhor_telefone, co.telefones, co.melhor_site, co.sites,
  co.email_receita, co.emails, co.contatos, co.decisores, co.link_detalhe,
  co.raw, co.fonte_principal, co.fontes, co.synced_at,
  ct.id AS carteira_id, ct.unit_id, ct.status, ct.prospectar, ct.notas,
  ct.tags, ct.list_id, ct.product_id, ct.owner_id, ct.owner_desde,
  ct.created_at, ct.updated_at
FROM public.companies co
JOIN public.carteira ct ON ct.cnpj = co.cnpj;

GRANT SELECT ON public.v_carteira TO authenticated, service_role;