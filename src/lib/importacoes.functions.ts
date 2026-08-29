import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { comUnidadeAtiva } from "./escopo";
import { exigirAcesso } from "./autorizacao";

export const criarImportacaoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/importacoes", "/empresas")])
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
      escopo: comUnidadeAtiva(context.escopo, data.unitId),
      arquivo: data.arquivo ?? "",
      cnpjs: data.cnpjs,
      listId: data.listId ?? null,
      unitId: data.unitId ?? null,
    });
  });

export const processarLoteFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/importacoes", "/empresas")])
  .inputValidator((d: unknown) =>
    z.object({ jobId: z.string().uuid(), tamanho: z.number().int().min(1).max(30).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { processarLote } = await import("./importacoes.server");
    return processarLote({
      escopo: context.escopo,
      jobId: data.jobId,
      tamanho: data.tamanho,
    });
  });

export const statusImportacaoFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/importacoes", "/empresas")])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { statusImportacao } = await import("./importacoes.server");
    return statusImportacao(data.jobId, context.escopo);
  });

export const listarImportacoesFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/importacoes")])
  .handler(async ({ context }) => {
    const { listarImportacoes } = await import("./importacoes.server");
    return listarImportacoes(context.escopo);
  });

export const itensImportacaoFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/importacoes")])
  .inputValidator((d: unknown) =>
    z.object({ jobId: z.string().uuid(), status: z.string().max(20).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { itensImportacao } = await import("./importacoes.server");
    return itensImportacao(data.jobId, context.escopo, data.status);
  });

export const reprocessarFalhasFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/importacoes")])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { reprocessarFalhas } = await import("./importacoes.server");
    return reprocessarFalhas(data.jobId, context.escopo);
  });

export const excluirImportacaoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/importacoes")])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirImportacao } = await import("./importacoes.server");
    return excluirImportacao(data.jobId, context.escopo);
  });
