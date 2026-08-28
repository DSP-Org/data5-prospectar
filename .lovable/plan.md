# Importação em duas etapas (fila de importação)

Sim — essa é a abordagem certa. Hoje o navegador precisa ficar aberto e cada lote de 20 CNPJs
é consultado ao vivo; se cair a conexão ou um lote der erro, você perde o rastro do que faltou.

## Como fica

**Etapa 1 — Recebimento (instantâneo)**
- O arquivo é lido e só os CNPJs são gravados numa fila, em um único envio (milhares de linhas em segundos).
- Cria-se uma "Importação" com nome do arquivo, lista de destino, unidade e total de CNPJs.
- Cada CNPJ entra com situação `pendente`.

**Etapa 2 — Processamento interno**
- Um processador pega os pendentes em blocos pequenos e faz o enriquecimento normal (multi-fonte, cache, modo econômico).
- Cada item termina como `concluído`, `não encontrado` ou `erro` (com a mensagem do erro guardada).
- Erros ficam com contador de tentativas; itens com erro podem ser reprocessados sem repetir os que já deram certo.

**Acompanhamento**
- Nova tela "Importações" (grupo Prospectar) com: arquivo, data, progresso (X de Y), quantos ok / não encontrados / com erro.
- Detalhe da importação lista os CNPJs que falharam com o motivo, botão "Tentar novamente os que falharam" e exportação em CSV dessa lista.
- Barra de progresso ao vivo enquanto processa; se você fechar a aba, a importação continua de onde parou ao reabrir.

## Detalhes técnicos

- Banco: tabelas `import_jobs` (arquivo, list_id, unit_id, criado_por, totais, status) e
  `import_items` (job_id, cnpj, status, erro, tentativas), com RLS por unidade e GRANTs.
- Server functions novas em `src/lib/importacoes.functions.ts`:
  `criarImportacaoFn` (grava a fila), `processarLoteFn` (pega N pendentes, chama `consultarCnpjs`, grava o resultado),
  `statusImportacaoFn`, `listarImportacoesFn`, `reprocessarFalhasFn`.
- O motor de enriquecimento (`repo.server.ts` / `sources/*`) não muda — só passa a ser chamado pelo processador.
- Avanço: o cliente chama `processarLoteFn` em laço enquanto a tela estiver aberta; o estado vive no banco,
  então qualquer sessão pode retomar. (Sem depender do navegador para não perder o trabalho já feito.)
- `ImportarEmpresas.tsx` passa a só enfileirar e redirecionar para a tela de acompanhamento.
