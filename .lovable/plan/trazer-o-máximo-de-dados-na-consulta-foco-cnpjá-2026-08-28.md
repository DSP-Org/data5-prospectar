# Trazer o máximo de dados na consulta (foco CNPJá)

Hoje a consulta na CNPJá pede só o básico: o endpoint é chamado sem nenhum módulo adicional, e boa parte do que ela devolve é descartada no caminho. O objetivo é extrair o máximo possível dessa fonte e mostrar tudo na ficha da empresa, mantendo o controle de custo nas suas mãos.

## O que muda

### 1. Pedir todos os módulos da CNPJá

A consulta passa a solicitar, conforme os interruptores em Configurações:

| Módulo | O que traz | Custo |
|---|---|---|
| Cadastro (já ativo) | razão social, endereço, CNAEs, sócios, telefones, e-mails | base |
| Simples Nacional / MEI | enquadramento tributário e histórico | crédito extra |
| Inscrições Estaduais (CCC/SINTEGRA) | IE por estado ou país inteiro | crédito extra |
| SUFRAMA | incentivos da Zona Franca | crédito extra |
| Geolocalização | latitude e longitude do endereço | crédito extra |
| Links / comprovantes | link do comprovante da Receita | crédito extra |

Todos vêm **desligados por padrão**, com aviso de consumo de crédito ao lado de cada um. Ligou, passa a vir em toda consulta da CNPJá.

### 2. Aproveitar tudo o que já vem hoje e está sendo jogado fora

Mesmo sem módulo pago, a resposta da CNPJá tem campos que hoje não são lidos: motivo da situação cadastral, data da situação, situação especial, porte e capital detalhados, quadro societário com qualificação e faixa etária, atividades secundárias completas, telefones e e-mails classificados por tipo, matriz/filiais relacionadas. Tudo isso passa a ser lido e guardado.

### 3. Mostrar na ficha da empresa

Novos blocos na ficha, exibidos quando houver dado:
- **Tributário** — Simples Nacional, MEI, data de opção, histórico.
- **Inscrições estaduais** — tabela com UF, número, situação e tipo.
- **SUFRAMA** — número, situação e incentivos.
- **Quadro societário** — nome, qualificação, entrada, faixa etária, representante legal.
- **Atividades secundárias** — lista completa de CNAEs.
- **Localização** — coordenadas e link para o mapa.

Cada bloco marca de qual fonte veio o dado.

### 4. Modo "consulta completa" por busca

Na tela de Consulta e no botão Reconsultar da ficha entra a opção **Buscar tudo**: ignora o cache, usa `strategy=ONLINE` na CNPJá e aciona todas as fontes ativas, mesmo as pagas, mesmo quando as gratuitas já trouxeram contato. Fica claro na tela que essa opção consome crédito.

### 5. Mesclagem sem perda

A mesclagem atual só guarda um conjunto fixo de campos e descarta o resto. Ela passa a preservar todos os campos extras por fonte dentro de `raw`, para que nada do que a API devolveu se perca — mesmo o que ainda não tem lugar na ficha.

## Detalhes técnicos

- `src/lib/sources/adapters.server.ts`
  - `cnpjaUrl` ganha os parâmetros `simples`, `simplesHistory`, `registrations` (`BR` ou UF), `suframa`, `geocoding`, `links=RFB`, além de `strategy` e `maxAge` já existentes; `strategy=ONLINE` quando a consulta pedir "buscar tudo".
  - `CnpjaResp` é ampliado (`company.members[]` completo, `statusDate`, `reason`, `specialStatus`, `registrations[]`, `suframa[]`, `address.latitude/longitude`, `phones[].type`, `emails[].ownership`, `sideActivities[]`, `links[]`).
  - `mapCnpja` mapeia os campos que têm coluna e coloca os demais em um bloco `extras` dentro do retorno.
  - `FetchOpts` recebe `modulos?: { simples, registrations, suframa, geocoding, links }` e `online?: boolean`.
- `src/lib/sources/catalog.ts`: novo tipo `ModulosCnpja` e valores padrão (todos `false`).
- `src/lib/sources/registry.server.ts`: lê/grava os módulos em `app_settings` (`cnpja_modulo_*`), monta `fetchOpts` com eles e propaga `online` quando `forcar`/"buscar tudo".
- `src/lib/sources/merge.server.ts`: além dos campos escalares/array atuais, acumula `extras` por fonte em `raw.<fonte>.extras`, sem sobrescrever.
- `src/lib/sources.functions.ts`: `salvarModulosCnpjaFn` (master) e retorno dos módulos em `listarFontesFn`.
- `src/components/FontesDados.tsx`: bloco de interruptores dos módulos dentro do card da CNPJá, com selo "consome crédito".
- `src/lib/econodata.functions.ts` / `repo.server.ts`: `consultarCnpjsFn` aceita `completo?: boolean`, repassado a `buscarMultiFonte`.
- `src/routes/_authenticated/empresas/$cnpj.tsx`: novos blocos lendo de `raw.cnpja.extras`.
- `src/routes/_authenticated/consulta.tsx`: caixa "Buscar tudo (consome crédito)".

Sem migração de banco: os dados extras ficam em `raw`, que já é `jsonb`.
