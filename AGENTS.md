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

**Context:** data5-prospectar / "Econodata Connector" — plataforma de prospeccao B2B em TanStack Start + Supabase (Lovable Cloud). Repo github.com/DSP-Org/data5-prospectar (main); projeto Lovable e69e78d9-11d7-4ed1-bc33-26f641a8fc60. FASE 1 CONCLUIDA em 29/08/2026 (autorizacao no servidor, dono do lead/carteira, opt-out LGPD). Proxima etapa: Fase 2 (cadencia, proxima acao, registro de contato em 1 clique, importacao server-side).

**Active decisions:**
- Fase 1.3 concluida (commit c0c3a99 + migration 20260829190753): tabela supressoes com canal email/telefone/empresa
- A supressao morde em tres pontos: exportacao omite contatos suprimidos e empresas em opt-out, criarAtividade recusa contato (exceto tipo nota) e a ficha risca o contato com selo
- Remover uma supressao exige gerenciaCarteira (gestor, admin_unidade, master)
- contextoEmpresa (repo.server) devolve dono e bloqueios separado de obterEmpresa

**Next session:**
- Fase 2.1 - proxima acao obrigatoria ao registrar contato, com fila de vence hoje / atrasado
- Fase 2.2 - botao de WhatsApp e e-mail que ja registra a atividade
- Fase 2.3 - mover o loop de importacao do navegador para o servidor
- Config pendente do usuario: a matriz de permissoes da /unidades ao papel usuario, que agora e permissao real de criar e excluir unidades
- Fase 3 - oportunidade com produto e valor, conversao por etapa
<!-- egc:end -->
