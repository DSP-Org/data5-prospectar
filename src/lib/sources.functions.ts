import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const idSchema = z.enum(["econodata", "brasilapi", "cnpja", "speedio"]);

export const listarFontesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listarFontes } = await import("./sources/registry.server");
  return listarFontes();
});

export const salvarFonteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: idSchema,
        key: z.string().max(500).nullable().optional(),
        enabled: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { salvarFonte } = await import("./sources/registry.server");
    return salvarFonte(data);
  });

export const testarFonteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: idSchema, key: z.string().max(500).nullable().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { testarFonte } = await import("./sources/registry.server");
    return testarFonte(data.id, data.key ?? null);
  });

export const salvarPrioridadeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ordem: z.array(idSchema).min(1).max(10) }).parse(d))
  .handler(async ({ data }) => {
    const { salvarPrioridade } = await import("./sources/registry.server");
    return salvarPrioridade(data.ordem);
  });

export const salvarEconomiaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        modo: z.enum(["economico", "completo"]).optional(),
        ttlDias: z.number().int().min(0).max(365).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { salvarEconomia } = await import("./sources/registry.server");
    return salvarEconomia(data);
  });
