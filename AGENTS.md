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
- Fase 2.1 concluida (commit 0ab8084): registrarContato exige agendar a proxima acao OU encerrar com motivo (ganhou/perdeu/sem_fit); encerrar atualiza o status da empresa
- A proxima acao e gravada como atividade pendente (scheduled_at preenchido, completed_at nulo), nao como coluna na empresa
- Atrasado e medido pelo FIM do dia agendado, nao pela hora
- A fila (listarPendencias) usa embedding do PostgREST via FK prospection_activities.company_cnpj -> companies.cnpj para trazer nome e dono da empresa

**Next session:**
- Fase 2.2 - botao de WhatsApp e e-mail que ja registra a atividade
- Fase 2.3 - mover o loop de importacao do navegador para o servidor
- Mostrar contador de pendencias atrasadas no painel e no menu
- Fase 3 - oportunidade com produto e valor, conversao por etapa
<!-- egc:end -->
