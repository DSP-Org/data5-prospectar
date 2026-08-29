import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { comUnidadeAtiva, restringirUnidade } from "./escopo";
import { exigirAcesso } from "./autorizacao";

const tipoSchema = z.enum(["produto", "servico"]);

export const listarProdutosFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/produtos", "/equipe")])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { listarProdutos } = await import("./produtos.server");
    const escopo = restringirUnidade(comUnidadeAtiva(context.escopo, data.unidade ?? null), data.unidade ?? null);
    return listarProdutos(escopo);
  });

export const criarProdutoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/produtos")])
  .inputValidator((d: unknown) =>
    z
      .object({
        nome: z.string().min(1).max(120),
        tipo: tipoSchema,
        descricao: z.string().max(1000).optional(),
        valor_referencia: z.number().nonnegative().nullable().optional(),
        unit_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { criarProduto } = await import("./produtos.server");
    return criarProduto(context.escopo, data);
  });

export const atualizarProdutoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/produtos")])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(120).optional(),
        tipo: tipoSchema.optional(),
        descricao: z.string().max(1000).optional(),
        valor_referencia: z.number().nonnegative().nullable().optional(),
        ativo: z.boolean().optional(),
        unit_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { atualizarProduto } = await import("./produtos.server");
    return atualizarProduto(context.escopo, data);
  });

export const excluirProdutoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/produtos")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirProduto } = await import("./produtos.server");
    return excluirProduto(context.escopo, data.id);
  });
