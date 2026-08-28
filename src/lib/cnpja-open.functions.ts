import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const fichaCnpjaAbertaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(11).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { fichaAbertaCnpja } = await import("./cnpja-open.server");
    return fichaAbertaCnpja(data.cnpj);
  });
