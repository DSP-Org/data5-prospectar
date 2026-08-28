import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tipoSchema = z.enum(["produto", "servico"]);

export const listarProdutosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { listarProdutos } = await import("./produtos.server");
    return listarProdutos(await obterEscopo(context.userId));
  });

export const criarProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { obterEscopo } = await import("./escopo.server");
    const { criarProduto } = await import("./produtos.server");
    return criarProduto(await obterEscopo(context.userId), data);
  });

export const atualizarProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { obterEscopo } = await import("./escopo.server");
    const { atualizarProduto } = await import("./produtos.server");
    return atualizarProduto(await obterEscopo(context.userId), data);
  });

export const excluirProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { excluirProduto } = await import("./produtos.server");
    return excluirProduto(await obterEscopo(context.userId), data.id);
  });
