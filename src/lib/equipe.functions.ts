import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Equipe agrupada por unidade, respeitando o escopo do usuário logado. */
export const listarEquipeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { obterEscopo, restringirUnidade } = await import("./escopo.server");
    const { listarEquipe } = await import("./admin.server");
    const escopo = restringirUnidade(await obterEscopo(context.userId, data.unidade ?? null), data.unidade ?? null);
    return listarEquipe(escopo);
  });
