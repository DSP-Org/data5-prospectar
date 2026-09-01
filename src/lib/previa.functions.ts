import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { exigirAcesso } from "./autorizacao";

export const previaLoteFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/consulta", "/empresas", "/calculadora", "/importacoes")])
  .inputValidator((d: unknown) =>
    z.object({ cnpjs: z.array(z.string().max(30)).min(1).max(5000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { previaLote } = await import("./previa.server");
    return previaLote(data.cnpjs);
  });

/** Validade do cache configurada, para exibir na UI. */
export const validadeCacheFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/consulta", "/empresas", "/calculadora", "/importacoes")])
  .handler(async () => {
    const { economiaAtual } = await import("./sources/registry.server");
    const { ttlDias } = await economiaAtual();
    return { ttlDias };
  });
