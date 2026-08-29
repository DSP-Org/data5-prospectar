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
- Fase 1.2 concluida (commit 78ee5f9 + migration 20260829181737): companies ganhou owner_id e owner_desde
- Modelo de carteira escolhido pelo usuario: o VENDEDOR PEGA o lead (self-service), e a base fica visivel a todos mas so o dono edita
- A trava de concorrencia do assumir e a propria condicao do update (owner_id is null), nao uma leitura previa
- gerenciaCarteira(escopo) em src/lib/escopo.ts define quem passa por cima: master, admin_unidade e gestor

**Next session:**
- Fase 1.3 - lista de supressao/opt-out e registro de origem do dado (LGPD)
- Mostrar dono e botao assumir/liberar tambem na ficha da empresa (/empresas/$cnpj) e no funil
- Revisar se papel usuario deveria poder criar/excluir unidades (matriz atual da /unidades ao papel usuario)
- Fase 2 - cadencia com proxima acao, registro de contato em 1 clique, importacao server-side
<!-- egc:end -->
