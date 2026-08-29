import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { comUnidadeAtiva, restringirUnidade } from "./escopo";
import { exigirAcesso } from "./autorizacao";

/** Equipe agrupada por unidade, respeitando o escopo do usuário logado. */
export const listarEquipeFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/equipe")])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { listarEquipe } = await import("./admin.server");
    const escopo = restringirUnidade(comUnidadeAtiva(context.escopo, data.unidade ?? null), data.unidade ?? null);
    return listarEquipe(escopo);
  });
