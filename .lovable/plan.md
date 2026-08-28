# Base global de empresas + ganho de desempenho

Hoje a tabela de empresas tem `unit_id`, ou seja, a mesma empresa é "propriedade" de uma unidade. Isso quebra o modelo desejado (base pertence ao sistema) e ainda duplica consultas pagas às APIs: se duas unidades prospectam o mesmo CNPJ, o sistema consulta duas vezes.

## 1. Nova separação: base do sistema × trabalho da unidade

- **Empresas (base)** passam a ser globais: dados cadastrais, contatos, decisores, fontes e data de sincronização são compartilhados por todo o sistema. Toda unidade enxerga a base inteira na Consulta e na Base.
- **Trabalho de prospecção** passa a ser por unidade, em um novo registro "empresa na unidade": status do funil, notas, tags, lista e produto/serviço.
- **Listas** continuam pertencendo à unidade. Uma empresa entra na lista da unidade sem sair da base global; outra unidade pode ter a mesma empresa em outra lista, com outro status, sem interferência.
- **Atividades** continuam por unidade, agora ligadas ao par empresa+unidade.

Efeito prático nas telas:
- Base: mostra a base global; as colunas Status, Lista, Produto e Notas refletem a unidade ativa. Um selo indica "já na sua carteira" ou "disponível na base".
- Listas, Funil, Atividades e Relatórios: continuam restritos à unidade ativa (nada muda para o usuário comum).
- Consulta: antes de gastar fonte paga, reaproveita o que já existe na base global — economia direta de créditos.

Migração dos dados atuais: cada empresa com `unit_id` gera automaticamente o registro de trabalho daquela unidade, preservando status, notas, tags, lista e produto. Nada é perdido.

## 2. Desempenho

Problemas medidos no código e no banco:

- Painel e Listas carregam **todas as linhas** e contam em JavaScript. Com 50 mil empresas isso significa dezenas de MB por acesso. Passam a usar contagens agregadas no banco.
- A Base faz `select *`, trazendo os campos `raw`/`decisores` (JSON grande) mesmo na listagem. Passa a selecionar só as colunas exibidas; o JSON completo só na ficha.
- Buscas por nome/cidade/CNAE usam `ilike %termo%`, que não usa índice. Entra índice de busca textual (trigram) nas colunas pesquisadas.
- Faltam índices para os filtros e a ordenação mais usados (status por unidade, lista, criação, UF, situação, porte).
- As configurações de fontes são lidas do banco a cada consulta; passam a ser lidas uma vez por requisição.
- A consulta em lote dispara todos os CNPJs em paralelo sem limite; entra um teto de concorrência para não estourar rate limit das fontes.
- Escopo do usuário (papéis, unidades, rotas) é recarregado várias vezes por navegação; passa a ser resolvido uma vez por requisição.

## Detalhes técnicos

Migração única, com GRANTs e RLS:
- `company_units` (unit_id, cnpj, status, notas, tags, list_id, product_id, timestamps; único por unidade+cnpj) + backfill a partir de `companies`.
- `companies` perde `unit_id`, `status`, `notas`, `tags`, `list_id`, `product_id` (após o backfill).
- `prospection_activities` mantém `unit_id`; índice composto (unit_id, company_cnpj, created_at desc).
- Índices: `company_units(unit_id, status)`, `company_units(list_id)`, `company_units(product_id)`, `companies(created_at desc)`, `companies(uf)`, `companies(situacao)`, `pg_trgm` em `razao_social`, `nome_fantasia`, `cidade`, `cnae_descricao`.
- Função `contar_base(unit_id)` retornando as agregações do painel em uma chamada.

Código:
- `repo.server.ts`: listagem passa a fazer join da base global com `company_units` da unidade ativa; `atualizarEmpresa`, `vincularEmpresasLista` e status do funil gravam em `company_units` (upsert).
- `escopo.server.ts`: memoização por requisição.
- `sources/registry.server.ts`: cache das settings por requisição e limite de concorrência no lote.
- Telas de Base, Funil, Listas, Atividades e Relatórios ajustadas para o novo formato de dados; sem mudança de layout.
