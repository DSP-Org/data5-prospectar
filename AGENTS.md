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
- Migracao cadastro/carteira CONCLUIDA em codigo e banco (commit local c312950, branch main, AINDA NAO PUSHED). companies virou so cadastral (41 colunas). Nova tabela carteira (1171 linhas, backfill): status, owner_id, owner_desde, prospectar, list_id, product_id, notas, tags, unit_id, UNIQUE(cnpj,unit_id). View v_carteira junta as duas com os MESMOS nomes de campo da UI -- Company e quase toda UI nao mudaram, so repo.server.ts/admin.server.ts/importacoes.server.ts
- Duas mudancas de comportamento na migracao: (1) excluirEmpresa agora DESVINCULA da carteira da unidade, nao apaga mais o cadastro compartilhado inteiro; (2) obterPainel (tela /) passa a respeitar a unidade ativa, antes sempre mostrava o sistema inteiro
- CRITICO: commit c312950 nao foi enviado ao origin/main. Sessao encerrou com servidor local (localhost:8080, .claude/launch.json) rodando, aguardando login do usuario no navegador pra teste ao vivo que nao aconteceu

**Next session:**
- URGENTE: decidir com o usuario -- push do commit c312950 agora, ou terminar teste ao vivo primeiro (servidor local ja rodando em localhost:8080 via .claude/launch.json, so falta o usuario logar no navegador que ja esta aberto)
- Depois do push: navegar Base de Empresas + ficha de empresa + funil pra confirmar visualmente -- nunca testado clicando, so por SQL read-only e revisao de diff
- Fase 2.3 pendente - mover o loop de importacao do navegador para o servidor
- Fase 3 pendente - oportunidade com produto e valor, conversao por etapa
- Migracao de 1156/1171 empresas para carteira: CONCLUIDA, nao repetir essa tarefa
<!-- egc:end -->
