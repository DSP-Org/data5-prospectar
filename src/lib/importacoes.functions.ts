import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function escopoDe(userId: string, unitId?: string | null) {
  const { obterEscopo } = await import("./escopo.server");
  return obterEscopo(userId, unitId ?? null);
}

export const criarImportacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        arquivo: z.string().max(200).optional(),
        cnpjs: z.array(z.string()).min(1).max(20000),
        listId: z.string().uuid().nullable().optional(),
        unitId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { criarImportacao } = await import("./importacoes.server");
    return criarImportacao({
      escopo: await escopoDe(context.userId, data.unitId),
      arquivo: data.arquivo ?? "",
      cnpjs: data.cnpjs,
      listId: data.listId ?? null,
      unitId: data.unitId ?? null,
    });
  });

export const processarLoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ jobId: z.string().uuid(), tamanho: z.number().int().min(1).max(30).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { processarLote } = await import("./importacoes.server");
    return processarLote({
      escopo: await escopoDe(context.userId),
      jobId: data.jobId,
      tamanho: data.tamanho,
    });
  });

export const statusImportacaoFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { statusImportacao } = await import("./importacoes.server");
    return statusImportacao(data.jobId, await escopoDe(context.userId));
  });

export const listarImportacoesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listarImportacoes } = await import("./importacoes.server");
    return listarImportacoes(await escopoDe(context.userId));
  });

export const itensImportacaoFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ jobId: z.string().uuid(), status: z.string().max(20).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { itensImportacao } = await import("./importacoes.server");
    return itensImportacao(data.jobId, await escopoDe(context.userId), data.status);
  });

export const reprocessarFalhasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { reprocessarFalhas } = await import("./importacoes.server");
    return reprocessarFalhas(data.jobId, await escopoDe(context.userId));
  });

export const excluirImportacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirImportacao } = await import("./importacoes.server");
    return excluirImportacao(data.jobId, await escopoDe(context.userId));
  });
