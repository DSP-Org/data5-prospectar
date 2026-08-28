import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const unidadeInput = z.object({ unidade: z.string().uuid().optional() });

export const listarEquipesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => unidadeInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { obterEscopo, restringirUnidade } = await import("./escopo.server");
    const { listarEquipes } = await import("./equipes.server");
    const escopo = restringirUnidade(await obterEscopo(context.userId, data.unidade ?? null), data.unidade ?? null);
    return listarEquipes(escopo);
  });

export const criarEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        nome: z.string().min(1).max(120),
        descricao: z.string().max(600).optional(),
        cor: z.string().max(30).optional(),
        unidade: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { criarEquipe } = await import("./equipes.server");
    const escopo = await obterEscopo(context.userId, data.unidade ?? null);
    return criarEquipe(escopo, {
      nome: data.nome,
      descricao: data.descricao,
      cor: data.cor,
      unit_id: data.unidade ?? null,
    });
  });

export const atualizarEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(120).optional(),
        descricao: z.string().max(600).optional(),
        cor: z.string().max(30).optional(),
        ativa: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { atualizarEquipe } = await import("./equipes.server");
    return atualizarEquipe(await obterEscopo(context.userId), data);
  });

export const excluirEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { excluirEquipe } = await import("./equipes.server");
    return excluirEquipe(await obterEscopo(context.userId), data.id);
  });

export const definirMembrosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), usuarios: z.array(z.string().uuid()).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { definirMembros } = await import("./equipes.server");
    return definirMembros(await obterEscopo(context.userId), data.id, data.usuarios);
  });

export const definirProdutosEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), produtos: z.array(z.string().uuid()).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { definirProdutos } = await import("./equipes.server");
    return definirProdutos(await obterEscopo(context.userId), data.id, data.produtos);
  });
