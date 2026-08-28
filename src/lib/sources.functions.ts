import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirMasterDe(userId: string) {
  const { obterEscopo, exigirMaster } = await import("./escopo.server");
  const escopo = await obterEscopo(userId);
  exigirMaster(escopo);
  return escopo;
}

const idSchema = z.enum(["econodata", "brasilapi", "cnpja", "speedio"]);

export const listarFontesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirMasterDe(context.userId);
  const { listarFontes } = await import("./sources/registry.server");
  return listarFontes();
});

export const salvarFonteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: idSchema,
        key: z.string().max(500).nullable().optional(),
        enabled: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirMasterDe(context.userId);
    const { salvarFonte } = await import("./sources/registry.server");
    return salvarFonte(data);
  });

export const testarFonteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: idSchema, key: z.string().max(500).nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirMasterDe(context.userId);
    const { testarFonte } = await import("./sources/registry.server");
    return testarFonte(data.id, data.key ?? null);
  });

export const salvarPrioridadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ordem: z.array(idSchema).min(1).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirMasterDe(context.userId);
    const { salvarPrioridade } = await import("./sources/registry.server");
    return salvarPrioridade(data.ordem);
  });

export const salvarEconomiaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        modo: z.enum(["economico", "completo"]).optional(),
        ttlDias: z.number().int().min(0).max(365).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirMasterDe(context.userId);
    const { salvarEconomia } = await import("./sources/registry.server");
    return salvarEconomia(data);
  });
