# Múltiplas fontes de busca

Hoje o sistema consulta apenas a Econodata. O objetivo é permitir várias fontes de dados, consultá-las em conjunto e mesclar os resultados numa única ficha de empresa, registrando de qual fonte veio o dado principal.

## Fontes previstas

| Fonte | Tipo | Chave | Traz contatos? |
|---|---|---|---|
| Econodata | atual | já configurada | sim (telefone, e-mail, decisores) |
| BrasilAPI / ReceitaWS | cadastral gratuita | não precisa | não |
| CNPJá | paga | chave do usuário | parcial |
| Speedio | paga B2B | chave do usuário | sim |
| Outra | genérica | informada depois | conforme o caso |

BrasilAPI entra funcionando de imediato (sem chave). CNPJá e Speedio ficam prontos na estrutura e ativam quando você colar a chave em Configurações. "Outra" fica para uma etapa posterior, quando você passar a documentação.

## Como vai funcionar

1. Na consulta por CNPJ, o sistema chama **todas as fontes ativas em paralelo**.
2. Os retornos são **mesclados campo a campo**: vence o primeiro valor não vazio, seguindo uma ordem de prioridade por fonte (Econodata → Speedio → CNPJá → BrasilAPI), configurável em Configurações.
3. Listas de telefones, e-mails, sites, contatos e decisores são **unidas e desduplicadas** entre as fontes.
4. A empresa salva guarda:
   - a **fonte principal** (a que trouxe mais dados / maior prioridade);
   - a lista de **fontes consultadas com sucesso**;
   - o retorno bruto de cada fonte, para auditoria.
5. Na ficha da empresa aparece um selo com a fonte principal e as fontes usadas. Na Base, uma coluna/filtro "Fonte".

Fontes que falharem (sem crédito, 404, timeout) não derrubam a consulta: são ignoradas e o motivo fica no log de consultas.

## Configurações

A tela `/configuracoes` ganha uma seção **Fontes de dados**:
- lista cada fonte com liga/desliga;
- campo de chave (senha, com mostrar/ocultar) para as que exigem;
- botão Testar por fonte;
- ordem de prioridade da mesclagem (arrastar ou setas).

## Detalhes técnicos

- Novas colunas em `public.companies`: `fonte_principal text`, `fontes text[] default '{}'`, e o bruto por fonte dentro de `raw` (chave por fonte). Migração com backfill de `fonte_principal = 'econodata'` nas linhas existentes.
- Chaves e flags das fontes guardadas em `public.app_settings` (mesma tabela já usada), uma linha por fonte: `source_<slug>_key`, `source_<slug>_enabled`, mais `sources_priority`.
- Novo módulo `src/lib/sources/` com um contrato comum:
  ```ts
  type DataSource = {
    id: string; label: string; requiresKey: boolean;
    fetchByCnpj(cnpj: string, key?: string): Promise<Partial<MappedCompany> | null>;
    validateKey?(key: string): Promise<boolean>;
  };
  ```
  Adaptadores: `econodata.ts` (reaproveita `econodata.server.ts` + `company-mapper.server.ts`), `brasilapi.ts`, `cnpja.ts`, `speedio.ts`.
- `src/lib/merge.server.ts`: mescla os `Partial<MappedCompany>` por prioridade, unindo arrays.
- `src/lib/sources.functions.ts`: server functions para listar fontes, salvar chave/flag, testar fonte e reordenar prioridade.
- As consultas existentes (`consultarCnpjsFn`, `consultarChaveFn`, importação CSV, Reconsultar) passam pelo orquestrador multi-fonte, mantendo a mesma interface. Consulta por site/e-mail continua só na Econodata (as outras fontes só aceitam CNPJ).
- Chaves permanecem server-side; nunca vão ao navegador.

## Fora do escopo agora

- Integração da fonte "Outra" (aguarda a documentação/chave).
- Prospecção por filtros abertos (nenhuma dessas APIs oferece isso via integração oficial).
