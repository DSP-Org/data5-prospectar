# Consulta de novas empresas: é grátis mesmo?

## Verdade parcial — hoje o caminho comum é grátis, mas existem rotas pagas ativas

O que confirmei no código e nas configurações salvas:

**Grátis de fato (consulta por CNPJ):**
- BrasilAPI (Receita Federal) — ligada, sem chave, sem custo. Dados cadastrais, sem contatos.
- Speedio (API pública) — ligada, sem chave, sem custo. Cadastral + alguns contatos.
- Ficha aberta do CNPJá (`open.cnpja.com`) usada na consulta individual — sem chave, sem crédito.
- Busca por nome na base local — só lê o banco, custo zero.
- Cache local de 30 dias: empresa já sincronizada não é reconsultada em nenhuma fonte.

**Rotas que podem cobrar, e estão habilitadas hoje:**
- CNPJá comercial está **ligada com chave**. No modo econômico ela usa `strategy=CACHE_IF_FRESH`, que devolve cache grátis dentro da validade, mas **vai online e debita crédito quando o dado está velho**. Ela só é acionada para os CNPJs que as fontes grátis deixaram sem telefone/e-mail/decisor.
- Os módulos extras do CNPJá **Simples/MEI, Inscrições Estaduais e SUFRAMA estão ligados** — cada um soma custo na consulta que for online.
- "Buscar tudo" força `strategy=ONLINE` em todos os CNPJs: sempre pago.
- A **busca avançada por filtros** (UF, município, CNAE, situação) usa `GET api.cnpja.com/office`, que é paga. Não existe fonte gratuita que descubra empresas por filtro — as grátis só respondem a um CNPJ conhecido.
- Econodata está desligada, então hoje não gera custo.

Resumo: descobrir empresa **por CNPJ** é grátis na maioria dos casos; descobrir empresa **por filtro/recorte** é sempre pago; e o CNPJá pago pode ser acionado sem o usuário perceber.

## O que proponho construir

1. **Trava "somente fontes gratuitas"** em Configurações (master). Com ela ligada, nenhuma consulta chama fonte paga: o CNPJá comercial passa a usar apenas `strategy=CACHE` (nunca debita), "Buscar tudo" fica bloqueado e a busca avançada paga fica desabilitada com aviso.
2. **Etiqueta de custo em cada botão de consulta** ("sem custo" / "pode consumir crédito"), na consulta individual, na lista de CNPJs, na busca avançada e na importação — para nunca gastar por acidente.
3. **Confirmação antes de gastar**: ação que aciona fonte paga (Buscar tudo, busca avançada, salvar resultados externos) abre um diálogo dizendo quantos CNPJs serão consultados online.
4. **Painel de consumo** em Configurações: quantas consultas pagas ocorreram por dia/mês e quantas foram atendidas por cache ou fonte grátis, usando o dado de consultas pagas que a orquestração já calcula.
5. **Aviso sobre módulos extras**: sinalizar em Configurações que Simples/MEI, Inscrições e SUFRAMA aumentam o custo de cada consulta online, com atalho para desligá-los.

## Detalhes técnicos

- `src/lib/sources/registry.server.ts`: nova chave `sources_somente_gratis` em `app_settings`, respeitada em `buscarMultiFonte` (filtra fontes `custo === "pago"` e força `strategy=CACHE` no adaptador CNPJá).
- `src/lib/sources/adapters.server.ts`: aceitar `somenteCache` em `FetchOpts` e mapear para `strategy=CACHE`.
- `src/lib/cnpja-busca.server.ts`: recusar a busca paga quando a trava estiver ligada, com mensagem clara.
- Nova tabela `consumo_consultas` (data, fonte, cnpj, origem, unit_id) gravada quando a orquestração registra consulta paga, com RLS e GRANTs; painel lê agregados por período.
- UI: etiquetas e diálogo de confirmação em `consulta.tsx`, `empresas/index.tsx`, `importacoes.tsx` e `configuracoes.tsx`.
