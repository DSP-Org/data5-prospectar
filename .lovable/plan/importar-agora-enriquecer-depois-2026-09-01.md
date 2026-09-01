# Importar agora, enriquecer depois

Você está certo. Hoje a importação e o enriquecimento são a mesma coisa: cada CNPJ novo
só é considerado "importado" depois de passar pelas fontes externas, em blocos, com a aba
aberta. Numa lista grande isso vira uma espera longa para algo que é, na prática, só cadastro.

## O que muda

**1. Importar = cadastrar (instantâneo)**
- Ao enviar/colar a lista, todos os CNPJs válidos entram na base na hora, em massa,
  e já ficam vinculados à unidade e à lista escolhida.
- Quem já existia continua como hoje (só ganha o vínculo).
- Quem é novo entra como registro básico, marcado como **"sem dados ainda"** —
  aparece na base, pode ser filtrado, movido de lista, atribuído a um dono, trabalhado no funil.
- Nenhuma consulta externa, nenhum crédito, nenhuma espera. A importação já nasce concluída.

**2. Enriquecer vira uma ação separada e opcional**
- A tela de Importações passa a mostrar dois números: *cadastrados* e *ainda sem dados*.
- Botão "Enriquecer agora" roda o processo atual em blocos (com pausar/retomar/reprocessar,
  como já existe hoje) — só que agora é escolha sua, não pré-requisito.
- Também dá para enriquecer a partir da Base de Empresas: filtro "sem dados ainda" +
  seleção + "Buscar dados nas fontes". Assim você enriquece só o recorte que interessa.
- A ficha de uma empresa sem dados mostra o aviso e o botão de buscar dados.

**3. Reflexo na base**
- Registros sem dados aparecem com o CNPJ e um selo "sem dados"; ao enriquecer,
  os campos são preenchidos no mesmo registro (nada é duplicado).

## Detalhes técnicos

- Migration: coluna `companies.enriquecido_em timestamptz null`. Registro criado pela
  importação fica com `enriquecido_em = null`; o enriquecimento preenche a data.
  (Uso `enriquecido_em` em vez de `synced_at` para não confundir "nunca buscado" com "cache vencido".)
- `criarImportacao` (`src/lib/importacoes.server.ts`): após separar existentes × novos,
  faz `upsert` em massa em `companies` dos novos apenas com `cnpj` (+ `razao_social` vazio,
  `enriquecido_em = null`), chama `vincularCarteira` para todos e grava os `import_items`
  já como `concluido`. O job nasce `concluido`, com um contador novo `sem_dados`.
- `processarLote` deixa de ser o caminho obrigatório: passa a selecionar os itens marcados
  como "a enriquecer" (novo status `a_enriquecer`) em vez de `pendente`. A lógica de blocos,
  `consultarCnpjs`, agrupamento de escritas e recontagem continua a mesma.
- A tela `/importacoes` some com o auto-início do laço ao abrir; o laço passa a rodar
  só quando você clica em "Enriquecer agora".
- Base de Empresas: filtro por `enriquecido_em is null` no grupo Situação e ação em lote
  "Buscar dados nas fontes", reaproveitando `consultarCnpjs` com `salvar: true`.
- Consultas de leitura (`v_carteira`, exportação, calculadora) não mudam de forma;
  registros sem dados simplesmente têm os campos vazios.

## Ponto de atenção

Registros sem dados entram na contagem da calculadora e nos recortes com campos vazios
(sem UF, sem CNAE, sem porte). Se preferir, a calculadora pode passar a excluí-los por
padrão, com um alternador "incluir empresas sem dados".
