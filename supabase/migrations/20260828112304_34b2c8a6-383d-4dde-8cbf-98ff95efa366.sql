-- 1) Novo papel
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_unidade';

-- 2) Produtos e serviços
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'produto',
  descricao text NOT NULL DEFAULT '',
  valor_referencia numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario le produtos das suas unidades"
ON public.products FOR SELECT TO authenticated
USING (unit_id IS NULL OR public.has_unit(auth.uid(), unit_id));

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX products_unit_id_idx ON public.products(unit_id);

-- 3) Vinculo com prospeccao
ALTER TABLE public.companies ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.prospection_activities ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- 4) Permissoes por papel (role em texto para permitir seed na mesma migracao)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  rota text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, rota)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado le a matriz de permissoes"
ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- 5) Permissoes por usuario
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rota text NOT NULL,
  efeito text NOT NULL DEFAULT 'permitir',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rota)
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario le as proprias permissoes"
ON public.user_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'::public.app_role));

-- 6) Seed da matriz padrao
INSERT INTO public.role_permissions (role, rota) VALUES
  ('admin_unidade', '/'),
  ('admin_unidade', '/consulta'),
  ('admin_unidade', '/empresas'),
  ('admin_unidade', '/listas'),
  ('admin_unidade', '/calculadora'),
  ('admin_unidade', '/funil'),
  ('admin_unidade', '/atividades'),
  ('admin_unidade', '/produtos'),
  ('admin_unidade', '/equipe'),
  ('admin_unidade', '/relatorios'),
  ('admin_unidade', '/unidades'),
  ('gestor', '/'),
  ('gestor', '/consulta'),
  ('gestor', '/empresas'),
  ('gestor', '/listas'),
  ('gestor', '/calculadora'),
  ('gestor', '/funil'),
  ('gestor', '/atividades'),
  ('gestor', '/produtos'),
  ('gestor', '/equipe'),
  ('gestor', '/relatorios'),
  ('usuario', '/'),
  ('usuario', '/consulta'),
  ('usuario', '/empresas'),
  ('usuario', '/listas'),
  ('usuario', '/calculadora'),
  ('usuario', '/funil'),
  ('usuario', '/atividades'),
  ('usuario', '/produtos')
ON CONFLICT DO NOTHING;

-- 7) Verificacao de acesso a pagina
CREATE OR REPLACE FUNCTION public.pode_acessar(_user_id uuid, _rota text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  override text;
  herdado boolean;
BEGIN
  IF public.has_role(_user_id, 'master'::public.app_role) THEN
    RETURN true;
  END IF;

  SELECT efeito INTO override
  FROM public.user_permissions
  WHERE user_id = _user_id AND rota = _rota
  LIMIT 1;

  IF override IS NOT NULL THEN
    RETURN override = 'permitir';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    WHERE ur.user_id = _user_id AND rp.rota = _rota
  ) INTO herdado;

  RETURN COALESCE(herdado, false);
END;
$$;