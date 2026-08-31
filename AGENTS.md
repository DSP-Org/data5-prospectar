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
- Isolamento hoje e por unidade financeira (territorio exclusivo, ja implementado). Caminho futuro definido pelo usuario em 31/08/2026: se precisar isolar por grupo (holding com varias unidades), criar tabela grupos e adicionar units.grupo_id como FK -- substitui a nota anterior mais vaga de 'tabela clientes/contas acima de units'

**Next session:**
- Se precisar isolar por grupo no futuro: criar tabela grupos + units.grupo_id, sem mexer no isolamento por unidade ja existente
- Fase 2.3 pendente - mover o loop de importacao do navegador para o servidor
- Fase 3 pendente - oportunidade com produto e valor, conversao por etapa
<!-- egc:end -->
