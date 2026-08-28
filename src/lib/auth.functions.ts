import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const papelSchema = z.enum(["master", "admin_unidade", "gestor", "usuario"]);

/** Perfil, papel e unidades do usuário logado. */
export const meFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { listarUnidades } = await import("./admin.server");
    const escopo = await obterEscopo(context.userId);
    const unidades = await listarUnidades(escopo);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId,
      email: perfil?.email ?? "",
      nome: perfil?.nome ?? "",
      papel: escopo.papel,
      master: escopo.master,
      rotas: escopo.rotas,
      unidades: unidades.map((u) => ({ id: u.id, nome: u.nome, cor: u.cor })),
    };
  });

export const listarUnidadesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { listarUnidades } = await import("./admin.server");
    return listarUnidades(await obterEscopo(context.userId));
  });

export const criarUnidadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        nome: z.string().min(1).max(80),
        cidade: z.string().max(80).optional(),
        uf: z.string().max(2).optional(),
        cor: z.string().max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { criarUnidade } = await import("./admin.server");
    return criarUnidade(await obterEscopo(context.userId), data);
  });

export const atualizarUnidadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(80).optional(),
        cidade: z.string().max(80).nullable().optional(),
        uf: z.string().max(2).nullable().optional(),
        cor: z.string().max(20).optional(),
        ativa: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { atualizarUnidade } = await import("./admin.server");
    return atualizarUnidade(await obterEscopo(context.userId), data);
  });

export const excluirUnidadeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { excluirUnidade } = await import("./admin.server");
    return excluirUnidade(await obterEscopo(context.userId), data.id);
  });

export const listarUsuariosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { listarUsuarios } = await import("./admin.server");
    return listarUsuarios(await obterEscopo(context.userId));
  });

export const criarUsuarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(160),
        senha: z.string().min(8).max(72),
        nome: z.string().max(80).optional(),
        papel: papelSchema,
        unidades: z.array(z.string().uuid()).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { criarUsuario } = await import("./admin.server");
    return criarUsuario(await obterEscopo(context.userId), data);
  });

export const atualizarUsuarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().max(80).optional(),
        papel: papelSchema.optional(),
        unidades: z.array(z.string().uuid()).max(50).optional(),
        ativo: z.boolean().optional(),
        senha: z.string().min(8).max(72).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { atualizarUsuario } = await import("./admin.server");
    return atualizarUsuario(await obterEscopo(context.userId), data);
  });

export const excluirUsuarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { excluirUsuario } = await import("./admin.server");
    return excluirUsuario(await obterEscopo(context.userId), data.id);
  });
