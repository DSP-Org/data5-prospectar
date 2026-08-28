import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Papel = "master" | "gestor" | "usuario";

export type Escopo = {
  userId: string;
  master: boolean;
  papel: Papel;
  /** Unidades que o usuário pode enxergar. */
  unitIds: string[];
  /** Unidade usada para gravar novos registros. */
  unidadeAtiva: string | null;
};

/** Monta o escopo de acesso do usuário logado. */
export async function obterEscopo(userId: string, unidadeSolicitada?: string | null): Promise<Escopo> {
  const [{ data: roles }, { data: vinculos }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("user_units").select("unit_id").eq("user_id", userId),
  ]);

  const papeis = (roles ?? []).map((r) => r.role as Papel);
  const master = papeis.includes("master");
  const papel: Papel = master ? "master" : papeis.includes("gestor") ? "gestor" : "usuario";

  let unitIds: string[];
  if (master) {
    const { data } = await supabaseAdmin.from("units").select("id").order("created_at", { ascending: true });
    unitIds = (data ?? []).map((u) => u.id);
  } else {
    unitIds = (vinculos ?? []).map((v) => v.unit_id);
  }

  const unidadeAtiva =
    unidadeSolicitada && unitIds.includes(unidadeSolicitada) ? unidadeSolicitada : (unitIds[0] ?? null);

  return { userId, master, papel, unitIds, unidadeAtiva };
}

/** Lista de unidades para filtrar, ou null quando o usuário vê tudo (master). */
export function unidadesFiltro(escopo: Escopo): string[] | null {
  if (escopo.master) return null;
  return escopo.unitIds.length ? escopo.unitIds : ["00000000-0000-0000-0000-000000000000"];
}

/** Garante que o usuário pode gravar na unidade informada. */
export function unidadeDeGravacao(escopo: Escopo, unitId?: string | null): string | null {
  if (unitId && escopo.unitIds.includes(unitId)) return unitId;
  return escopo.unidadeAtiva;
}

export function exigirMaster(escopo: Escopo) {
  if (!escopo.master) throw new Error("Apenas o usuário master pode executar esta ação.");
}
