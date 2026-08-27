import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const obterStatusChaveApiFn = createServerFn({ method: "GET" }).handler(async () => {
  const { obterStatusChaveApi } = await import("./repo.server");
  return obterStatusChaveApi();
});

export const salvarChaveApiFn = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { salvarChaveApi } = await import("./repo.server");
    return salvarChaveApi(data.key);
  });

export const testarChaveApiFn = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    const { testarChaveApi } = await import("./repo.server");
    return testarChaveApi(data.key);
  });

export const migrarChaveDoAmbienteFn = createServerFn({ method: "POST" }).handler(async () => {
  const { migrarChaveDoAmbiente } = await import("./repo.server");
  return migrarChaveDoAmbiente();
});
