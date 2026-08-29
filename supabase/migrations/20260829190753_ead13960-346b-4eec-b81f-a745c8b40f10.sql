CREATE TABLE IF NOT EXISTS public.supressoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL CHECK (canal IN ('email','telefone','empresa')),
  valor text NOT NULL,
  motivo text NOT NULL DEFAULT '',
  origem text NOT NULL DEFAULT 'pedido_do_titular',
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.supressoes IS 'Lista de supressao (opt-out): contatos e empresas que nao devem receber prospeccao.';
COMMENT ON COLUMN public.supressoes.canal IS 'email, telefone ou empresa (neste caso valor e o CNPJ).';
COMMENT ON COLUMN public.supressoes.valor IS 'E-mail em minusculas, telefone so com digitos ou CNPJ formatado.';

CREATE UNIQUE INDEX IF NOT EXISTS supressoes_canal_valor_idx ON public.supressoes (canal, valor);
CREATE INDEX IF NOT EXISTS supressoes_created_idx ON public.supressoes (created_at DESC);

GRANT SELECT ON public.supressoes TO authenticated;
GRANT ALL ON public.supressoes TO service_role;

ALTER TABLE public.supressoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados leem supressoes" ON public.supressoes
  FOR SELECT TO authenticated USING (true);