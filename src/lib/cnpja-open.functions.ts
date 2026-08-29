import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { exigirAcesso } from "./autorizacao";

export const fichaCnpjaAbertaFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/consulta")])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(11).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { fichaAbertaCnpja } = await import("./cnpja-open.server");
    return fichaAbertaCnpja(data.cnpj);
  });
