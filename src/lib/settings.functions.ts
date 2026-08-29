import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { exigirMaster } from "./escopo";
import { exigirAcesso } from "./autorizacao";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const obterStatusChaveApiFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/configuracoes")])
  .handler(async ({ context }) => {
    exigirMaster(context.escopo);
    const { obterStatusChaveApi } = await import("./repo.server");
    return obterStatusChaveApi();
  });

export const salvarChaveApiFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/configuracoes")])
  .inputValidator((d: unknown) =>
    z
      .object({
        key: z
          .string()
          .min(36)
          .max(40)
          .refine((v) => UUID_V4_RE.test(v), { message: "A chave deve ser um UUID v4 válido." }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    exigirMaster(context.escopo);
    const { salvarChaveApi } = await import("./repo.server");
    return salvarChaveApi(data.key);
  });

export const testarChaveApiFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/configuracoes")])
  .inputValidator((d: unknown) =>
    z
      .object({
        key: z
          .string()
          .min(36)
          .max(40)
          .refine((v) => UUID_V4_RE.test(v), { message: "A chave deve ser um UUID v4 válido." }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    exigirMaster(context.escopo);
    const { testarChaveApi } = await import("./repo.server");
    return testarChaveApi(data.key);
  });

export const migrarChaveDoAmbienteFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/configuracoes")])
  .handler(async ({ context }) => {
    exigirMaster(context.escopo);
    const { migrarChaveDoAmbiente } = await import("./repo.server");
    return migrarChaveDoAmbiente();
  });
