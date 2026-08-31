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
- Modelo de negocio confirmado: uma instalacao (projeto Lovable + Supabase) atende um cliente por vez. As chaves de API (Econodata, CNPJa) sao globais ao sistema/instalacao, nao por unidade nem por usuario -- confirmado explicitamente pelo usuario em 31/08/2026
- unit_id em companies e conceito de carteira/visibilidade (quem viu a empresa primeiro), NAO de propriedade financeira do dado -- quem 'paga' e sempre a instalacao inteira, independente da unidade que consultou
- Caso o negocio migre para Modelo B (cadastro central compartilhado, multiplos clientes na mesma instalacao, tabela clientes/contas acima de units), isso exige redesenho de escopo -- nao aplicado, so registrado como bifurcacao futura

**Next session:**
- Se um segundo cliente pagante aparecer, criar nova instalacao (novo projeto Lovable + banco), nao nova unidade dentro da atual
- Fase 2.3 pendente - mover o loop de importacao do navegador para o servidor
- Fase 3 pendente - oportunidade com produto e valor, conversao por etapa
<!-- egc:end -->
