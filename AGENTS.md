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

**Active decisions:**
- Fase 1.1 concluida (commit 6bf8ee2): middleware exigirAcesso em src/lib/autorizacao.ts protege as 67 server functions por pagina, monta o escopo uma vez e entrega em context.escopo
- Parte pura do escopo movida para src/lib/escopo.ts (client-safe); escopo.server.ts reexporta e mantem apenas obterEscopo
- Cada funcao aceita o conjunto de paginas que legitimamente a usa (ex.: listarEmpresasFn vale para /empresas, /clientes-potenciais e /funil)
- AppShell passou a exibir 'sem acesso' quando a URL nao esta nas rotas do usuario; sub-rotas herdam a pagina mais especifica

**Next session:**
- Fase 1.2 - owner_id em companies, distribuicao de carteira e tela meus leads (decisao pendente: manual x automatica, e se lead sem dono fica visivel a todos)
- Fase 1.3 - lista de supressao/opt-out e registro de origem do dado (LGPD)
- Revisar se papel usuario deveria mesmo poder criar/excluir unidades (matriz atual permite /unidades para o papel usuario)
<!-- egc:end -->
