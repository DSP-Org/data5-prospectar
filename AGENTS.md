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
- Hierarquia de propriedade confirmada em 31/08/2026: Cliente (pagante) e dono de um Grupo financeiro, que contem Unidades (vinculadas ao grupo via futuro units.grupo_id). Usuario e um conceito INDEPENDENTE de Cliente/Grupo -- vincula-se a uma ou varias Unidades (user_units, ja implementado), nunca diretamente a Cliente ou Grupo

**Next session:**
- Se precisar isolar por grupo/cliente no futuro: criar tabelas grupos e clientes (clientes dono de grupos, grupos contem units via grupo_id) -- escopo de autorizacao do usuario continua vindo so de user_units, sem mudanca
- Fase 2.3 pendente - mover o loop de importacao do navegador para o servidor
- Fase 3 pendente - oportunidade com produto e valor, conversao por etapa
<!-- egc:end -->
