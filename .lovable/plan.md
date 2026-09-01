# Importar só o que falta (fila enxuta e mais rápida)

Você está certo. Hoje a fila recebe **todos** os CNPJs do arquivo. Os que já estão no cadastro
só são descobertos lá na frente, um bloco de 15 por vez, dentro do laço de processamento —
mesmo quando 90% da lista já está na base. Isso faz uma importação de 3.000 CNPJs dar
200 voltas no servidor para, no fim, quase só criar vínculos.

## O que muda

**1. Separação na hora de receber o arquivo**
- Ao enviar a lista, o sistema já classifica: quem está no cadastro e quem é novo.
- Quem já está: vínculo com a unidade/lista criado em massa, na hora, e o item entra como
  concluído com o motivo "já estava na base".
- Só os novos entram como pendentes. A barra de progresso passa a medir o trabalho real.
- O resumo da importação passa a mostrar quatro números: já na base, novos, não encontrados, erros.

**2. Processamento em blocos maiores e sem ida e volta desnecessária**
- Como o bloco agora só tem CNPJs novos, cada volta rende de verdade; o tamanho do bloco sobe
  (com ajuste automático se um bloco demorar demais).
- A gravação de resultado de cada item deixa de ser uma escrita por CNPJ e passa a ser
  uma escrita por grupo (concluídos / não encontrados / erros).

**3. Contagem correta em importações grandes**
- A recontagem hoje lê as linhas do job e é cortada em 1.000 registros, então listas maiores
  mostram progresso e totais errados. Passa a usar contagem agregada no banco.

**4. Reprocessar continua igual**, só que "tentar de novo os que falharam" volta a considerar
que os "já na base" nunca precisam ser refeitos.

## Ganho esperado

Numa lista de 3.000 CNPJs com 2.500 já na base: de ~200 chamadas de processamento e
~3.000 escritas individuais para ~2 operações em massa no recebimento + ~25 blocos de novos.
Sem qualquer mudança no custo de crédito — o comportamento de cache e fontes continua o mesmo.

## Detalhes técnicos

- `criarImportacao` (`src/lib/importacoes.server.ts`): após normalizar/deduplicar, consulta
  `companies` em blocos de 400 (limite do PostgREST) para separar existentes × novos;
  `vincularCarteira` em massa para os existentes; insere `import_items` com status
  `concluido` (erro = "já estava na base") para eles e `pendente` só para os novos.
  Sem unidade ativa, mantém o comportamento atual de reportar erro.
- `processarLote`: remove a checagem de `companies` por bloco (feita no recebimento),
  eleva o tamanho padrão do bloco (30 → validador de `processarLoteFn` ajustado),
  e troca os `update` por item por três `update ... .in("id", ids)` agrupados por status.
- `recontar` e `statusImportacao`: passam a usar `select("id", { count: "exact", head: true })`
  por status em vez de baixar as linhas.
- Front (`ImportarEmpresas.tsx` / `importacoes.tsx`): a prévia já existente passa a informar
  quantos irão direto para "já na base"; a tela de importações ganha a coluna correspondente.
