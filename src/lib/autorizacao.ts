// Autorização das server functions.
//
// O catálogo de páginas (permissoes.ts) já define quem acessa o quê, mas até
// aqui isso só escondia itens do menu: as server functions exigiam apenas
// autenticação, então qualquer usuário logado podia chamá-las direto.
// `exigirAcesso` monta o escopo uma única vez por chamada, verifica se o
// usuário tem pelo menos uma das páginas que legitimamente usam aquela função
// e entrega o escopo pronto no contexto, evitando uma segunda ida ao banco.

import { createMiddleware } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function exigirAcesso(...rotas: string[]) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const { obterEscopo } = await import("./escopo.server");
      const escopo = await obterEscopo(context.userId);

      const liberado = escopo.master || rotas.some((rota) => escopo.rotas.includes(rota));
      if (!liberado) {
        const { labelDaRota } = await import("./permissoes");
        const paginas = rotas.map(labelDaRota).join(", ");
        throw new Error(`Você não tem permissão para esta ação (páginas: ${paginas}).`);
      }

      return next({ context: { escopo } });
    });
}

/** Só autenticação: para funções que toda tela precisa, como saber quem está logado. */
export const apenasAutenticado = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    return next({ context: { escopo: await obterEscopo(context.userId) } });
  });
