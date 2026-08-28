# Busca por nome na aba gratuita

## O que acontece hoje

Na página Consulta existem duas coisas diferentes:

- **Ficha por CNPJ (grátis)** — usa a base aberta do CNPJá, que só aceita o número do CNPJ. Ela não tem busca por nome: é um endpoint de consulta de um documento específico.
- **Busca avançada (paga)** — já pesquisa por nome fantasia e razão social, além de UF, município, CNAE, porte, capital e data de abertura. Essa sim aceita texto.

Ou seja, hoje pesquisar por nome já é possível, mas só na aba paga.

## O que será feito

Transformar a aba gratuita em uma busca por nome de verdade, sem consumir crédito, em duas camadas:

1. **Campo de busca por nome na aba gratuita**
   Ao digitar um texto (em vez de um CNPJ), o sistema pesquisa primeiro na **base local de empresas** do próprio sistema (razão social, nome fantasia, cidade), respeitando as unidades do usuário. Resultados aparecem em lista; clicar abre a ficha completa.

2. **Escalonamento consciente para a fonte paga**
   Quando a base local não tiver resultados suficientes, aparece um aviso com o botão "Procurar nas fontes pagas", que leva o mesmo termo para a Busca avançada do CNPJá já preenchido. Nada é cobrado sem esse clique explícito.

3. **Detecção automática de entrada**
   O mesmo campo aceita CNPJ ou nome: se o texto tiver 14 dígitos, faz a ficha gratuita direta como hoje; caso contrário, faz a busca por nome.

## Detalhes técnicos

- Nova server function de busca local por nome em `src/lib/` (consulta `companies` com `ilike` em `razao_social`/`nome_fantasia`, filtro por unidade, limite e paginação simples).
- `src/routes/_authenticated/consulta.tsx`: campo único com detecção CNPJ/nome, lista de resultados locais, ação de abrir ficha e ação de escalar para a aba de busca avançada com o termo preenchido.
- Nenhuma alteração no fluxo de créditos: a camada local é 100% banco de dados; a chamada paga continua exclusiva da Busca avançada.

## Isso consome crédito?

Filtrar enquanto digita **não** custa nada nesta proposta, porque a digitação consulta apenas o banco de dados local do sistema.

Regras que garantem isso:

- A busca ao digitar (com pequeno atraso de ~400ms) roda só contra a tabela local de empresas.
- A API paga do CNPJá nunca é chamada automaticamente — só ao clicar em "Procurar nas fontes pagas" ou ao usar a aba Busca avançada.
- Na Busca avançada, cada página de resultados custa crédito, então ela continua com botão "Buscar" manual, sem disparo por digitação.

## Limitação a registrar

Não existe API pública gratuita e confiável de busca de empresas por nome na Receita — as fontes abertas só respondem por CNPJ. Por isso a busca por nome fora da base local depende da API comercial do CNPJá que já está configurada.

