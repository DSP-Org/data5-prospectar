import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirMasterDe(userId: string) {
  const { obterEscopo, exigirMaster } = await import("./escopo.server");
  const escopo = await obterEscopo(userId);
  exigirMaster(escopo);
  return escopo;
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const obterStatusChaveApiFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirMasterDe(context.userId);
  const { obterStatusChaveApi } = await import("./repo.server");
  return obterStatusChaveApi();
});

export const salvarChaveApiFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    await exigirMasterDe(context.userId);
    const { salvarChaveApi } = await import("./repo.server");
    return salvarChaveApi(data.key);
  });

export const testarChaveApiFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    await exigirMasterDe(context.userId);
    const { testarChaveApi } = await import("./repo.server");
    return testarChaveApi(data.key);
  });

export const migrarChaveDoAmbienteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirMasterDe(context.userId);
  const { migrarChaveDoAmbiente } = await import("./repo.server");
  return migrarChaveDoAmbiente();
});
