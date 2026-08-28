import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarPermissoesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { obterEscopo } = await import("./escopo.server");
    const { listarMatriz, listarPermissoesUsuarios } = await import("./permissoes.server");
    const escopo = await obterEscopo(context.userId);
    if (!escopo.master) throw new Error("Apenas o master pode gerenciar permissões.");
    const [matriz, usuarios] = await Promise.all([listarMatriz(), listarPermissoesUsuarios()]);
    return { matriz, usuarios };
  });

export const definirPermissaoPapelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { obterEscopo } = await import("./escopo.server");
    const { definirPermissaoPapel } = await import("./permissoes.server");
    return definirPermissaoPapel(await obterEscopo(context.userId), data);
  });

export const definirPermissaoUsuarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { obterEscopo } = await import("./escopo.server");
    const { definirPermissaoUsuario } = await import("./permissoes.server");
    return definirPermissaoUsuario(await obterEscopo(context.userId), data);
  });
