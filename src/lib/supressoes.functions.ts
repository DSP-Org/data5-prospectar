import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { exigirAcesso } from "./autorizacao";

const canalSchema = z.enum(["email", "telefone", "empresa"]);

/** Contexto da ficha: dono do lead e o que está sob opt-out. */
export const contextoEmpresaFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil")])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { contextoEmpresa } = await import("./repo.server");
    return contextoEmpresa(data.cnpj, context.escopo);
  });

export const registrarSupressaoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil", "/atividades")])
  .inputValidator((d: unknown) =>
    z
      .object({
        canal: canalSchema,
        valor: z.string().min(3).max(200),
        motivo: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { registrarSupressao } = await import("./supressoes.server");
    return registrarSupressao(data, context.escopo);
  });

export const listarSupressoesFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/empresas", "/configuracoes")])
  .handler(async () => {
    const { listarSupressoes } = await import("./supressoes.server");
    return listarSupressoes();
  });

export const removerSupressaoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/configuracoes")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { removerSupressao } = await import("./supressoes.server");
    return removerSupressao(data.id, context.escopo);
  });
