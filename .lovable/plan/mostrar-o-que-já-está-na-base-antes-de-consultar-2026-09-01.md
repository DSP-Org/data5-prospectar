# Mostrar o que já está na base antes de consultar

Hoje o sistema já checa a base local antes de chamar qualquer fonte externa, mas isso acontece de forma invisível. O objetivo é deixar essa checagem à vista, antes e depois da consulta.

## 1. Prévia da lista de CNPJs

Na aba "Lista de CNPJs" (e no diálogo Importar), depois de colar/subir os CNPJs e antes de disparar a busca:

- Um resumo com quatro números: total válido, já na base e dentro da validade, na base porém vencido, e novos.
- Aviso de custo: apenas os vencidos e os novos podem gerar consulta externa; os demais saem do banco sem custo.
- Opções antes de confirmar:
  - Consultar só os novos (pula tudo que já está na base)
  - Consultar novos + vencidos (comportamento atual)
  - Forçar tudo (ignora a validade — sinalizado como o mais caro)
- CNPJs inválidos e duplicados aparecem separados na prévia.

A prévia é uma leitura no banco (data de sincronização), não chama nenhuma fonte externa.

## 2. Selo na consulta individual

Na consulta de um CNPJ e na ficha da empresa:

- Selo indicando a origem do resultado: "da base local" ou "consultado agora".
- Quando vier da base: há quantos dias foi sincronizada e se está dentro ou fora da validade configurada.
- Fora da validade, um botão "Atualizar agora" deixando claro que essa ação chama as fontes.

## Detalhes técnicos

- Novo server fn (por exemplo `previewLote`) em um `.functions.ts`: recebe a lista de CNPJs, normaliza/deduplica, lê a validade configurada (`sources_cache_ttl_dias`) e consulta `companies` por `cnpj` + `synced_at`, devolvendo a classificação agregada e os buckets de CNPJs.
- Consulta em blocos para não esbarrar no limite de 1.000 linhas do PostgREST em listas grandes.
- O modo escolhido na prévia é repassado à consulta existente: "só novos" filtra a lista enviada; "forçar tudo" usa a flag `forcar` já suportada em `consultarMultiFonte`.
- A consulta individual passa a devolver a origem (cache/online) e o `synced_at`, para o selo na UI.
- Nenhuma mudança na regra de validade, no Modo Econômico ou na trava de fontes gratuitas — apenas visibilidade e o filtro opcional de escopo.
