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
- Estado em 31/08/2026 fim de sessao: tudo commitado e pushed ate 0aa91e5 (migracao cadastro/carteira + memoria + .claude/launch.json). main local e remoto sincronizados, working tree limpo

**Next session:**
- PRIORIDADE 1 -- Teste ao vivo da migracao carteira: nunca foi clicado na tela, so validado por tsc/build/SQL read-only. Abrir o preview do Lovable (ou rodar .claude/launch.json 'data5-prospectar-dev', porta 8080) e navegar Base de Empresas, ficha de empresa ($cnpj) e funil pra confirmar visualmente que v_carteira funciona -- checar tambem assumir/liberar lead, marcar prospectar, excluir empresa (agora desvincula, nao apaga) e o filtro de carteira (meus/sem dono/outros)
- Fase 2.3 pendente - mover o loop de importacao do navegador (import_jobs/import_items) para rodar no servidor, hoje depende da aba ficar aberta
- Fase 3 pendente - oportunidade com produto e valor vinculados ao lead, conversao por etapa do funil
- Pendencias menores do checklist antigo ainda nao feitas: exportacao sem colunas de socios/QSA e sem XLSX/limite de linhas maior, marcador de 'lead revisado/pronto', CNPJ gravado com mascara no banco, e-mail contabil so sinaliza (nao filtra)
<!-- egc:end -->
