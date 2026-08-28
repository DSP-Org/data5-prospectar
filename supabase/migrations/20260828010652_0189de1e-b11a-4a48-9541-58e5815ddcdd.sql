-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('master', 'gestor', 'usuario');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  nome text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ unidades ============
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cidade text,
  uf text,
  cor text NOT NULL DEFAULT 'slate',
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER units_set_updated_at BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_id)
);
GRANT SELECT ON public.user_units TO authenticated;
GRANT ALL ON public.user_units TO service_role;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'master')
      OR EXISTS (SELECT 1 FROM public.user_units WHERE user_id = _user_id AND unit_id = _unit_id);
$$;

-- ============ policies ============
CREATE POLICY "Usuario le o proprio perfil" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'master'));

CREATE POLICY "Usuario le os proprios papeis" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

CREATE POLICY "Usuario le as unidades vinculadas" ON public.units
FOR SELECT TO authenticated USING (public.has_unit(auth.uid(), id));

CREATE POLICY "Usuario le os proprios vinculos" ON public.user_units
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

-- ============ novo usuario ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  primeiro boolean;
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO primeiro;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN primeiro THEN 'master'::public.app_role ELSE 'usuario'::public.app_role END)
  ON CONFLICT DO NOTHING;

  IF primeiro THEN
    INSERT INTO public.user_units (user_id, unit_id)
    SELECT NEW.id, u.id FROM public.units u
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ unidade nos dados ============
INSERT INTO public.units (nome, cor) VALUES ('Unidade Padrão', 'blue');

ALTER TABLE public.companies ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
ALTER TABLE public.company_lists ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
ALTER TABLE public.prospection_activities ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;

UPDATE public.companies SET unit_id = (SELECT id FROM public.units ORDER BY created_at LIMIT 1);
UPDATE public.company_lists SET unit_id = (SELECT id FROM public.units ORDER BY created_at LIMIT 1);
UPDATE public.prospection_activities SET unit_id = (SELECT id FROM public.units ORDER BY created_at LIMIT 1);

CREATE INDEX idx_companies_unit ON public.companies(unit_id);
CREATE INDEX idx_company_lists_unit ON public.company_lists(unit_id);
CREATE INDEX idx_activities_unit ON public.prospection_activities(unit_id);