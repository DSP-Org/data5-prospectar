# Importação unificada de CNPJs

Hoje existem três caminhos diferentes para jogar CNPJ na base, cada um com comportamento próprio:

1. **Base de Empresas → botão "Importar"** — só aceita arquivo; envia para a fila (`import_jobs`) e o enriquecimento roda na tela Importações, com retomada e reprocesso.
2. **Atualização Novas → aba "Lista de CNPJs"** — aceita texto colado, mas processa na hora, na frente do usuário: se a aba fechar, o trabalho se perde e não há registro do que falhou.
3. **Busca avançada CNPJá → "Salvar selecionados"** — salva o lote direto, também sem registro nem retomada.

## Como fica

Uma única tela de importação, usada em todos os lugares:

- **Colar CNPJs** — caixa de texto, aceita até 100 CNPJs por vez (avisa quando passar disso e sugere o arquivo).
- **Enviar arquivo** — CSV ou TXT, sem limite prático, com o modelo para baixar.
- Escolha da lista de destino (respeitando a unidade ativa), igual hoje.
- Os dois modos fazem exatamente a mesma coisa: criam uma Importação, mostram "X CNPJ(s) na fila" e levam para a tela **Importações**, onde já existe progresso ao vivo, etapas com check, pausar/retomar, reprocessar falhas e excluir.
- CNPJ que já está na base continua sendo pulado (só é vinculado à lista), sem gastar consulta.

## Onde aparece

- **Base de Empresas** — mesmo botão "Importar" de hoje, abrindo a tela nova.
- **Importações** — botão "Nova importação" no topo.
- **Atualização Novas** — a aba "Lista de CNPJs" sai; ficam "CNPJ individual" (consulta imediata, um por vez, como hoje) e "Janela CNPJá". No lugar da aba removida, um atalho "Importar lista de CNPJs" abre a mesma tela.
- **Busca avançada CNPJá** — "Salvar selecionados" passa a criar uma Importação com os CNPJs marcados, em vez de consultar tudo na hora.

Assim só existe um jeito de importar, um só lugar para acompanhar e nada mais se perde quando a aba fecha.

## Detalhes técnicos

- `src/components/ImportarEmpresas.tsx` vira `ImportarCnpjs`: dialog com abas "Colar" e "Arquivo", reutilizando `extrairCnpjs`; no modo colar, corta/avisa acima de 100. Ambos chamam `criarImportacaoFn` e navegam para `/importacoes`.
- `src/routes/_authenticated/consulta.tsx`: remove o `TabsContent value="lista"` e o gatilho correspondente; a aba individual segue com `consultarCnpjsFn`.
- Busca avançada (mesmo arquivo, mutação `salvar` do bloco de seleção): troca `consultarCnpjsFn` por `criarImportacaoFn` com `arquivo: "Busca avançada CNPJá"`.
- `src/routes/_authenticated/importacoes.tsx`: adiciona o botão que abre o mesmo componente.
- Sem mudança de banco e sem mudança no motor de enriquecimento (`importacoes.server.ts`, `repo.server.ts`).
