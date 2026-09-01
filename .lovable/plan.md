# Calculadora de mercado (substitui Painel + Calculadora)

Inspirado na Calculadora de Mercado da Econodata: você monta um recorte de mercado
com filtros, o sistema diz **quantas empresas existem nesse recorte** e transforma
isso em potencial de faturamento, meta e esforço de prospecção.

A diferença: em vez de consultar a base da Econodata, o cálculo roda sobre a
**nossa base de empresas**, sempre respeitando a unidade selecionada no seletor do
topo (master vê todas; usuário vê só as unidades vinculadas).

## O que muda nas páginas

- A home (`/`) passa a ser a **Calculadora de mercado**.
- A página `/calculadora` deixa de existir; o menu passa a ter um item só,
  "Calculadora de mercado", apontando para a home.
- Os indicadores do painel atual (empresas na base, adicionadas em 30 dias,
  funil por status, últimas consultas, principais estados) não se perdem: viram a
  faixa de contexto no topo da nova página, já filtrada pelo recorte escolhido.

## Como a página funciona

**1. Recorte de mercado (filtros)**
Painel de filtros recolhível, no mesmo espírito da busca de empresas da Econodata:

- Estado (UF) e município
- Atividade econômica (CNAE / setor)
- Porte estimado e faixa de faturamento presumido
- Situação cadastral (ativa / demais)
- Lista, status comercial e "somente marcadas para prospectar"
- Somente empresas com telefone / e-mail (mercado realmente acionável)

**2. Tamanho do mercado**
Cards com: empresas no recorte, % da base da unidade, empresas com contato
válido, e a quebra do recorte por UF, porte e atividade (barras com top 6 de cada).

**3. Potencial e metas**
Campos editáveis: ticket médio, meta de faturamento, taxa de conversão de
contato → cliente, taxa de resposta e % de comissão. Resultado:

- Mercado potencial (empresas × ticket médio)
- Clientes necessários e contatos necessários para bater a meta
- Cobertura: se o recorte tem empresas suficientes para o esforço planejado
- Comissão estimada e receita por vendedor da unidade

**4. Ações**
Botões para abrir o recorte na Base de Empresas com os mesmos filtros,
e exportar o resumo do cálculo.

## Fora deste plano

Busca de pessoas/decisores (a página `busca-pessoa` da Econodata) não entra agora —
depende de dados de contato individuais que hoje só existem parcialmente em
`decisores`. Pode virar uma fase seguinte.

## Detalhes técnicos

- Nova server fn `calculadoraMercadoFn` (em `src/lib/econodata.functions.ts`)
  chamando `mercadoAgregado(filtros, escopo)` em `src/lib/repo.server.ts`.
  A agregação lê `v_carteira` com `restringirPorUnidade`, reaproveitando a mesma
  montagem de filtros de `listarEmpresas` e o padrão de contagem já usado em
  `opcoesFiltro` (linha ~874): contagem `head: true` para o total e uma leitura
  de colunas enxutas (`uf, cidade, porte_estimado, setores, cnae_descricao,
  melhor_telefone, melhor_site, email_receita, status`) para as quebras.
- `src/routes/_authenticated/index.tsx` é reescrita como a calculadora; o cálculo
  financeiro é puro no cliente (reaproveita a lógica atual de `calculadora.tsx`).
- `src/routes/_authenticated/calculadora.tsx` é removida e o item correspondente
  em `src/components/AppShell.tsx` some; a rota `/calculadora` passa a redirecionar
  para `/`.
- Remover `/calculadora` de `role_permissions` exige migração; em vez disso a rota
  redirecionada mantém as permissões atuais válidas.
- Unidade ativa via `useUnidadeAtiva` + `restringirUnidade`, igual às demais telas.
- `head()` da home atualizado com título e descrição da calculadora de mercado.
