import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { restringirUnidade } from "./escopo";
import { exigirAcesso } from "./autorizacao";

const activityTypeSchema = z.enum(["ligacao", "email", "whatsapp", "reuniao", "tarefa", "nota"]);

export const listarAtividadesFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/atividades", "/empresas", "/funil")])
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
    return listarAtividades({ ...filtros, escopo: restringirUnidade(context.escopo, unidade) });
  });

export const criarAtividadeFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/atividades", "/empresas", "/funil")])
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
    return criarAtividade(data, context.escopo);
  });

export const atualizarAtividadeFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/atividades", "/empresas", "/funil")])
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
    return atualizarAtividade(data.id, data, context.escopo);
  });

export const excluirAtividadeFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/atividades", "/empresas", "/funil")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirAtividade } = await import("./repo.server");
    return excluirAtividade(data.id, context.escopo);
  });

export const funilDadosFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/funil")])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { funilDados } = await import("./repo.server");
    return funilDados(restringirUnidade(context.escopo, data.unidade));
  });

export const relatorioAtividadesFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/relatorios")])
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
    return relatorioAtividades({ ...filtros, escopo: restringirUnidade(context.escopo, unidade) });
  });
