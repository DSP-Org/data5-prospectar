import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const activityTypeSchema = z.enum(["ligacao", "email", "whatsapp", "reuniao", "tarefa", "nota"]);

async function escopoDe(userId: string, unidade?: string | null) {
  const { obterEscopo, restringirUnidade } = await import("./escopo.server");
  return restringirUnidade(await obterEscopo(userId, unidade ?? null), unidade ?? null);
}

export const listarAtividadesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpj: z.string().max(20).optional(),
        tipo: z.string().max(20).optional(),
        de: z.string().max(10).optional(),
        ate: z.string().max(10).optional(),
        responsavel: z.string().max(80).optional(),
        pendente: z.boolean().optional(),
        productId: z.string().max(40).optional(),
        unidade: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(10000).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { listarAtividades } = await import("./repo.server");
    const { unidade, ...filtros } = data;
    return listarAtividades({ ...filtros, escopo: await escopoDe(context.userId, unidade) });
  });

export const criarAtividadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_cnpj: z.string().min(14).max(20),
        tipo: activityTypeSchema,
        observacao: z.string().max(3000).optional(),
        responsavel: z.string().max(80).optional(),
        scheduled_at: z.string().max(25).nullable().optional(),
        completed_at: z.string().max(25).nullable().optional(),
        product_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { criarAtividade } = await import("./repo.server");
    return criarAtividade(data, await escopoDe(context.userId));
  });

export const atualizarAtividadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        observacao: z.string().max(3000).optional(),
        responsavel: z.string().max(80).optional(),
        scheduled_at: z.string().max(25).nullable().optional(),
        completed_at: z.string().max(25).nullable().optional(),
        product_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { atualizarAtividade } = await import("./repo.server");
    return atualizarAtividade(data.id, data, await escopoDe(context.userId));
  });

export const excluirAtividadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirAtividade } = await import("./repo.server");
    return excluirAtividade(data.id, await escopoDe(context.userId));
  });

export const funilDadosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { funilDados } = await import("./repo.server");
    return funilDados(await escopoDe(context.userId, data.unidade));
  });

export const relatorioAtividadesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        de: z.string().max(10).optional(),
        ate: z.string().max(10).optional(),
        unidade: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { relatorioAtividades } = await import("./repo.server");
    const { unidade, ...filtros } = data;
    return relatorioAtividades({ ...filtros, escopo: await escopoDe(context.userId, unidade) });
  });
