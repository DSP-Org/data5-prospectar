import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const activityTypeSchema = z.enum(["ligacao", "email", "whatsapp", "reuniao", "tarefa", "nota"]);

export const listarAtividadesFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpj: z.string().max(20).optional(),
        tipo: z.string().max(20).optional(),
        de: z.string().max(10).optional(),
        ate: z.string().max(10).optional(),
        responsavel: z.string().max(80).optional(),
        pendente: z.boolean().optional(),
        limit: z.number().int().min(1).max(10000).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { listarAtividades } = await import("./repo.server");
    return listarAtividades(data);
  });

export const criarAtividadeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        company_cnpj: z.string().min(14).max(20),
        tipo: activityTypeSchema,
        observacao: z.string().max(3000).optional(),
        responsavel: z.string().max(80).optional(),
        scheduled_at: z.string().max(25).nullable().optional(),
        completed_at: z.string().max(25).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { criarAtividade } = await import("./repo.server");
    return criarAtividade(data);
  });

export const atualizarAtividadeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        observacao: z.string().max(3000).optional(),
        responsavel: z.string().max(80).optional(),
        scheduled_at: z.string().max(25).nullable().optional(),
        completed_at: z.string().max(25).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { atualizarAtividade } = await import("./repo.server");
    return atualizarAtividade(data.id, data);
  });

export const excluirAtividadeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { excluirAtividade } = await import("./repo.server");
    return excluirAtividade(data.id);
  });

export const funilDadosFn = createServerFn({ method: "GET" }).handler(async () => {
  const { funilDados } = await import("./repo.server");
  return funilDados();
});

export const relatorioAtividadesFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ de: z.string().max(10).optional(), ate: z.string().max(10).optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { relatorioAtividades } = await import("./repo.server");
    return relatorioAtividades(data);
  });
