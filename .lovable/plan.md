# Filtros da Base de Empresas em grupos temáticos

Hoje a tela mistura tudo: uma linha com busca, status, UF, lista, natureza jurídica,
clientes potenciais e carteira, e um bloco único "Filtros avançados" com catorze
campos soltos em grade. Difícil achar o campo certo e difícil enxergar o que está ativo.

A proposta é reorganizar os mesmos filtros em grupos de características semelhantes,
sem mudar nenhuma regra de busca.

## Nova organização

Barra fixa no topo do painel (sempre visível):
- Campo de busca por nome ou CNPJ
- Chips com os filtros ativos de todos os grupos, cada um removível
- Botão "Limpar tudo"

Abaixo, cinco grupos recolhíveis (accordion), cada um com um contador de filtros
ativos e um "limpar" próprio:

1. **Localização** — UF, cidade, bairro
2. **Atividade e porte** — atividade principal (CNAE), setor, porte, capital social
   mínimo e máximo, aberta a partir de / até
3. **Situação e regime** — situação cadastral, natureza jurídica, Simples Nacional, MEI
4. **Contato disponível** — somente com telefone, e-mail, site, decisor
5. **Gestão comercial** — lista, status do funil, clientes potenciais (prospectar),
   carteira (meus leads / sem dono / de outros)

Por padrão abrem os grupos que já têm filtro aplicado (inclusive os que vieram do
recorte da calculadora pela URL); os demais ficam fechados. Se nada estiver aplicado,
abre só "Localização".

## O que não muda

- Nenhum filtro é removido, renomeado no comportamento ou adicionado.
- As opções continuam vindo do recorte atual (UF, cidade, atividade, porte, setor,
  situação já se limitam ao que existe na base filtrada).
- Consultas, exportação, paginação e ações em lote seguem iguais.

## Detalhes técnicos

- Mudança restrita a `src/routes/_authenticated/empresas/index.tsx` (apresentação).
- Substituir o `Collapsible` único de avançados por `Accordion` (`type="multiple"`,
  já disponível em `@/components/ui/accordion`), um `AccordionItem` por grupo.
- O estado dos filtros continua o mesmo: `busca`, `status`, `uf`, `lista`, `grupo`,
  `potencial`, `carteira` e o objeto `av` (`Avancados`). Nada de novo campo no
  payload enviado ao backend.
- Um pequeno mapa de metadados por grupo (rótulo, campos que pertencem a ele e como
  descrever cada valor ativo) alimenta o contador do grupo, o "limpar" do grupo e os
  chips da barra superior — evita listas duplicadas espalhadas pelo JSX.
- `filtrosAvancadosAtivos` e `AVANCADOS_VAZIOS` são reaproveitados para o "limpar";
  o "limpar tudo" também zera busca, status, UF, lista, natureza, potencial e carteira.
- Abertura inicial dos grupos calculada uma vez na montagem, a partir dos filtros
  vindos da URL.
