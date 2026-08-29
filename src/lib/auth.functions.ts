import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apenasAutenticado, exigirAcesso } from "./autorizacao";

const papelSchema = z.enum(["master", "admin_unidade", "gestor", "usuario"]);

/** Perfil, papel e unidades do usuário logado. */
export const meFn = createServerFn({ method: "GET" })
  .middleware([apenasAutenticado])
  .handler(async ({ context }) => {
    const { listarUnidades } = await import("./admin.server");
    const escopo = context.escopo;
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
  .middleware([exigirAcesso("/unidades", "/produtos", "/permissoes", "/equipe")])
  .handler(async ({ context }) => {
    const { listarUnidades } = await import("./admin.server");
    return listarUnidades(context.escopo);
  });

export const criarUnidadeFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/unidades")])
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
    const { criarUnidade } = await import("./admin.server");
    return criarUnidade(context.escopo, data);
  });

export const atualizarUnidadeFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/unidades")])
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
    const { atualizarUnidade } = await import("./admin.server");
    return atualizarUnidade(context.escopo, data);
  });

export const excluirUnidadeFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/unidades")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirUnidade } = await import("./admin.server");
    return excluirUnidade(context.escopo, data.id);
  });

export const listarUsuariosFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/permissoes")])
  .handler(async ({ context }) => {
    const { listarUsuarios } = await import("./admin.server");
    return listarUsuarios(context.escopo);
  });

export const criarUsuarioFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/permissoes")])
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
    const { criarUsuario } = await import("./admin.server");
    return criarUsuario(context.escopo, data);
  });

export const atualizarUsuarioFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/permissoes")])
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
    const { atualizarUsuario } = await import("./admin.server");
    return atualizarUsuario(context.escopo, data);
  });

export const excluirUsuarioFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/permissoes")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirUsuario } = await import("./admin.server");
    return excluirUsuario(context.escopo, data.id);
  });
