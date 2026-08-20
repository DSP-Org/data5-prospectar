# Painel de filtros de prospecção (estilo plataforma Econodata)

## O que foi verificado

A documentação oficial da API (econodata.readme.io) lista apenas quatro recursos:

- `POST /companies` — lote de até 100 CNPJs
- `POST /companies/search` — uma empresa por site, e-mail ou CNPJ
- `POST /update-lead`
- webhooks

O endpoint de busca aceita somente três campos no corpo: `site`, `email`, `cnpj`. Não existe, na API contratada, nenhum endpoint que devolva listas por Setor, Porte, Telefone, Saúde financeira etc.

Ou seja: o painel de filtros da imagem é da **plataforma web logada**, que usa endpoints internos do site (sessão de usuário), não o token de integração. A API só **enriquece** empresas que você já identificou.

## Como resolver na prática

O painel de filtros vai existir no Prospectar360 — o que muda é de onde vem a lista de CNPJs.

### Etapa 1 — Sonda da plataforma logada

Testar se os endpoints internos de `plat.econodata.com.br` que alimentam esse painel podem ser chamados a partir do servidor do app com uma sessão sua (cookie/token da plataforma, guardado no cofre de segredos).

- Se funcionar: o painel de filtros busca direto, como no site, e cada empresa retornada entra na base já enriquecida pela API oficial.
- Se não funcionar (sessão expira rápido, proteção anti-bot ou bloqueio contratual): seguimos para a Etapa 2 sem retrabalho — o painel e a base já estarão prontos.

### Etapa 2 — Importação por planilha (caminho garantido)

Tela de importação onde você exporta a lista filtrada na plataforma Econodata (CSV/Excel) e sobe aqui:

- Detecção automática da coluna de CNPJ
- Pré-visualização com contagem de válidos, duplicados e já existentes na base
- Enriquecimento em lotes de 100 pela API oficial, com barra de progresso e relatório de erros
- Destino: lista/campanha escolhida na hora do upload

### Etapa 3 — Painel de filtros espelhando a plataforma

Painel lateral com as mesmas seções da imagem, em blocos expansíveis:

Setor · Porte · Decisores e colaboradores · Telefone · E-mails · Cadastrais (situação, natureza jurídica, data de abertura, UF/cidade/bairro) · Legais e tributários (Simples, MEI) · Saúde financeira (faturamento presumido, capital social) · Presença digital (site, e-mail) · Nível de atividade · Busca por CNPJs · Tags · Exibir apenas matrizes

O mesmo painel serve às duas fontes: aplica os filtros na busca remota quando a Etapa 1 funcionar, e sempre na base já salva. Resultado em tabela com seleção múltipla, ações em massa (mover para lista, mudar status, exportar CSV) e contador de empresas.

## Detalhes técnicos

- Novo `src/lib/plataforma.server.ts` para a sonda da Etapa 1, isolado do cliente oficial `econodata.server.ts`; credencial de sessão em segredo, nunca no navegador.
- Importação de planilha processada em server function, com deduplicação por CNPJ e reaproveitamento de `mapCompany` + `consultarCnpjs`.
- Filtros do painel expandem o `filtrosSchema` já existente em `econodata.functions.ts` e as queries de `repo.server.ts`; campos novos (matriz/filial, Simples, MEI, nível de atividade) saem do JSON `raw` ou viram colunas por migração.
- Novo `src/routes/prospeccao.tsx` para o painel, mantendo `/consulta` para consultas pontuais.

## Ordem de execução

1. Sonda da plataforma logada e decisão do caminho
2. Importação de planilha com enriquecimento em lote
3. Painel de filtros completo + resultados com ações em massa
