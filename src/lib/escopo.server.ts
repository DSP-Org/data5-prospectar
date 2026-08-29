import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { Escopo, Papel } from "./escopo";

// A parte pura do escopo vive em ./escopo (client-safe); reexportamos aqui para
// os módulos server que já a consumiam por este caminho.
export {
  comUnidadeAtiva,
  exigirMaster,
  gerenciaCarteira,
  restringirUnidade,
  unidadeDeGravacao,
  unidadesFiltro,
} from "./escopo";
export type { Escopo, Papel } from "./escopo";

/** Monta o escopo de acesso do usuário logado. */
export async function obterEscopo(userId: string, unidadeSolicitada?: string | null): Promise<Escopo> {
  const [{ data: roles }, { data: vinculos }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("user_units").select("unit_id").eq("user_id", userId),
  ]);

  const papeis = (roles ?? []).map((r) => r.role as Papel);
  const master = papeis.includes("master");
  const papel: Papel = master
    ? "master"
    : papeis.includes("admin_unidade")
      ? "admin_unidade"
      : papeis.includes("gestor")
        ? "gestor"
        : "usuario";

  let unitIds: string[];
  if (master) {
    const { data } = await supabaseAdmin.from("units").select("id").order("created_at", { ascending: true });
    unitIds = (data ?? []).map((u) => u.id);
  } else {
    unitIds = (vinculos ?? []).map((v) => v.unit_id);
  }

  const unidadeAtiva =
    unidadeSolicitada && unitIds.includes(unidadeSolicitada) ? unidadeSolicitada : (unitIds[0] ?? null);

  const { rotasEfetivas } = await import("./permissoes.server");
  const rotas = await rotasEfetivas(userId, papeis.length ? papeis : ["usuario"], master);

  return { userId, master, papel, papeis: papeis.length ? papeis : ["usuario"], unitIds, unidadeAtiva, rotas };
}
