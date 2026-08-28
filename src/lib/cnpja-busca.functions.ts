import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const texto = z.string().trim().max(200).optional().nullable();

const schema = z.object({
  nome: texto,
  razaoSocial: texto,
  uf: texto,
  municipioIbge: z.string().trim().max(4000).optional().nullable(),
  bairro: texto,
  cep: texto,
  cnaePrincipal: z.string().trim().max(4000).optional().nullable(),
  cnaeQualquer: texto,
  porteIds: texto,
  situacaoIds: texto,
  naturezaIds: texto,
  capitalMin: z.number().nonnegative().optional().nullable(),
  capitalMax: z.number().nonnegative().optional().nullable(),
  aberturaDe: texto,
  aberturaAte: texto,
  somenteMatriz: z.boolean().optional().nullable(),
  limite: z.number().int().min(1).max(100).optional().nullable(),
  cursor: z.string().min(32).max(200).optional().nullable(),
});

export const buscarCnpjaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { buscarEmpresasCnpja } = await import("./cnpja-busca.server");
    return buscarEmpresasCnpja(data);
  });
