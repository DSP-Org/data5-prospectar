import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { exigirAcesso } from "./autorizacao";

export const listarPermissoesFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/permissoes")])
  .handler(async ({ context }) => {
    const { listarMatriz, listarPermissoesUsuarios } = await import("./permissoes.server");
    const escopo = context.escopo;
    if (!escopo.master) throw new Error("Apenas o master pode gerenciar permissões.");
    const [matriz, usuarios] = await Promise.all([listarMatriz(), listarPermissoesUsuarios()]);
    return { matriz, usuarios };
  });

export const definirPermissaoPapelFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/permissoes")])
  .inputValidator((d: unknown) =>
    z
      .object({
        role: z.enum(["admin_unidade", "gestor", "usuario"]),
        rota: z.string().max(60),
        permitido: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { definirPermissaoPapel } = await import("./permissoes.server");
    return definirPermissaoPapel(context.escopo, data);
  });

export const definirPermissaoUsuarioFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/permissoes")])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        rota: z.string().max(60),
        efeito: z.enum(["permitir", "negar"]).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { definirPermissaoUsuario } = await import("./permissoes.server");
    return definirPermissaoUsuario(context.escopo, data);
  });
