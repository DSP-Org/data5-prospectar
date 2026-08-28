import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Equipe agrupada por unidade, respeitando o escopo do usuário logado. */
export const listarEquipeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { listarEquipe } = await import("./admin.server");
    return listarEquipe(await obterEscopo(context.userId));
  });
