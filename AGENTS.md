<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- egc:start -->
## EGC Project Memory

**Context:** data5-prospectar / "Econodata Connector" — plataforma de prospecção B2B em TanStack Start + Supabase (Lovable Cloud). Consome Econodata, CNPJá (paga e aberta), BrasilAPI e CNPJ.ws, higieniza e guarda em `companies`, para prospecção e venda B2B. Repo github.com/DSP-Org/data5-prospectar (main); projeto Lovable e69e78d9-11d7-4ed1-bc33-26f641a8fc60. Em 29/08/2026: 1.156 empresas, 0 em prospecção, 1 atividade — aquisição madura, camada comercial ainda não exercitada. Fase atual: construção conjunta da Fase 1 (segurança + carteira + LGPD).

**Active decisions:**
- Avaliacao senior de maturidade em 29/08/2026: aquisicao 4/5, custo de API 4/5, execucao comercial 1,5/5, pipeline/receita 1/5, seguranca multi-tenant 2/5, LGPD 1/5, testes-CI 1,5/5
- Roadmap em 4 fases. Fase 1: autorizacao no servidor, dono do lead (owner_id) + carteira, lista de supressao/opt-out. Fase 2: cadencia com proxima acao e registro de contato em 1 clique, importacao server-side. Fase 3: oportunidade com produto e valor, conversao por etapa. Fase 4: testes, CI, indices, select de colunas
- Achado critico: as 67 server functions usam apenas requireSupabaseAuth. Permissoes por rota valem so no cliente. companies tem RLS ligado sem policy e tudo passa por supabaseAdmin (service role)
- Migrations sao aplicadas pelo agente do Lovable (tool supabase--migration), que registra em supabase_migrations.schema_migrations
- QSA: normalizarSocio em src/lib/types.ts, aplicada nos adapters, no company-mapper e na leitura (asCompany em repo.server.ts)

**Next session:**
- Fase 1.1 - middleware de autorizacao por rota/papel nas server functions, reaproveitando permissoes.ts
- Fase 1.2 - owner_id em companies, distribuicao de carteira e tela meus leads
- Fase 1.3 - lista de supressao/opt-out e registro de origem do dado (LGPD)
- Pendencias menores: exportacao sem socios/XLSX/limite de 4.000 linhas, marcador de lead revisado, CNPJ gravado com mascara, e-mail contabil que so sinaliza
<!-- egc:end -->
