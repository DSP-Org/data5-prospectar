import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  termo: z.string().trim().max(120),
  limite: z.number().int().min(1).max(50).optional().nullable(),
});

export const buscarLocalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { buscarEmpresasLocal } = await import("./busca-local.server");
    return buscarEmpresasLocal(data);
  });
