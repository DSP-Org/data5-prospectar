import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { Escopo } from "./escopo.server";
import { unidadeDeGravacao, unidadesFiltro } from "./escopo.server";

export type Equipe = {
  id: string;
  unit_id: string | null;
  nome: string;
  descricao: string;
  cor: string;
  ativa: boolean;
  created_at: string;
  membros: Array<{ id: string; nome: string; email: string; papel: string }>;
  produtos: Array<{ id: string; nome: string; tipo: string }>;
};

function exigirGestao(escopo: Escopo) {
  if (!(escopo.master || escopo.papel === "admin_unidade")) {
    throw new Error("Apenas o master ou o administrador da unidade pode gerenciar equipes.");
  }
}

async function equipeNoEscopo(escopo: Escopo, teamId: string) {
  const { data, error } = await supabaseAdmin.from("teams").select("id, unit_id").eq("id", teamId).single();
  if (error) throw new Error(error.message);
  const unidades = unidadesFiltro(escopo);
  if (unidades && (!data.unit_id || !unidades.includes(data.unit_id))) {
    throw new Error("Equipe fora do seu escopo de acesso.");
  }
  return data as { id: string; unit_id: string | null };
}

export async function listarEquipes(escopo: Escopo): Promise<Equipe[]> {
  let q = supabaseAdmin.from("teams").select("*").order("nome", { ascending: true });
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const equipes = (data ?? []) as Array<Omit<Equipe, "membros" | "produtos">>;
  if (!equipes.length) return [];
  const ids = equipes.map((e) => e.id);

  const [{ data: membros }, { data: vinculos }, { data: perfis }, { data: papeis }, { data: produtos }] =
    await Promise.all([
      supabaseAdmin.from("team_members").select("team_id, user_id").in("team_id", ids),
      supabaseAdmin.from("team_products").select("team_id, product_id").in("team_id", ids),
      supabaseAdmin.from("profiles").select("id, nome, email"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("products").select("id, nome, tipo"),
    ]);

  const perfilDe = new Map((perfis ?? []).map((p) => [p.id, p]));
  const papelDe = new Map((papeis ?? []).map((r) => [r.user_id, r.role as string]));
  const produtoDe = new Map((produtos ?? []).map((p) => [p.id, p]));

  return equipes.map((e) => ({
    ...e,
    membros: ((membros ?? []) as Array<{ team_id: string; user_id: string }>)
      .filter((m) => m.team_id === e.id)
      .map((m) => {
        const p = perfilDe.get(m.user_id);
        return {
          id: m.user_id,
          nome: p?.nome ?? "",
          email: p?.email ?? "",
          papel: papelDe.get(m.user_id) ?? "usuario",
        };
      }),
    produtos: ((vinculos ?? []) as Array<{ team_id: string; product_id: string }>)
      .filter((v) => v.team_id === e.id)
      .map((v) => {
        const p = produtoDe.get(v.product_id);
        return { id: v.product_id, nome: p?.nome ?? "", tipo: p?.tipo ?? "produto" };
      }),
  }));
}

export async function criarEquipe(
  escopo: Escopo,
  input: { nome: string; descricao?: string | undefined; cor?: string | undefined; unit_id?: string | null | undefined },
) {
  exigirGestao(escopo);
  const unit = unidadeDeGravacao(escopo, input.unit_id ?? null);
  if (!unit) throw new Error("Selecione uma unidade de negócio antes de criar a equipe.");
  const { data, error } = await supabaseAdmin
    .from("teams")
    .insert({ nome: input.nome, descricao: input.descricao ?? "", cor: input.cor ?? "slate", unit_id: unit } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function atualizarEquipe(
  escopo: Escopo,
  input: { id: string; nome?: string | undefined; descricao?: string | undefined; cor?: string | undefined; ativa?: boolean | undefined },
) {
  exigirGestao(escopo);
  await equipeNoEscopo(escopo, input.id);
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined) patch["nome"] = input.nome;
  if (input.descricao !== undefined) patch["descricao"] = input.descricao;
  if (input.cor !== undefined) patch["cor"] = input.cor;
  if (input.ativa !== undefined) patch["ativa"] = input.ativa;
  const { error } = await supabaseAdmin.from("teams").update(patch as never).eq("id", input.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function excluirEquipe(escopo: Escopo, id: string) {
  exigirGestao(escopo);
  await equipeNoEscopo(escopo, id);
  const { error } = await supabaseAdmin.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Define a lista completa de membros da equipe. */
export async function definirMembros(escopo: Escopo, teamId: string, userIds: string[]) {
  exigirGestao(escopo);
  const equipe = await equipeNoEscopo(escopo, teamId);
  if (equipe.unit_id && userIds.length) {
    const { data } = await supabaseAdmin
      .from("user_units")
      .select("user_id")
      .eq("unit_id", equipe.unit_id)
      .in("user_id", userIds);
    const permitidos = new Set((data ?? []).map((v) => v.user_id));
    const fora = userIds.filter((u) => !permitidos.has(u));
    if (fora.length) throw new Error("Só é possível incluir usuários vinculados à unidade da equipe.");
  }
  await supabaseAdmin.from("team_members").delete().eq("team_id", teamId);
  if (userIds.length) {
    const { error } = await supabaseAdmin
      .from("team_members")
      .insert(userIds.map((user_id) => ({ team_id: teamId, user_id })) as never);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

/** Define a lista completa de produtos/serviços atribuídos à equipe. */
export async function definirProdutos(escopo: Escopo, teamId: string, productIds: string[]) {
  exigirGestao(escopo);
  const equipe = await equipeNoEscopo(escopo, teamId);
  if (equipe.unit_id && productIds.length) {
    const { data } = await supabaseAdmin.from("products").select("id").eq("unit_id", equipe.unit_id).in("id", productIds);
    const permitidos = new Set((data ?? []).map((p) => p.id));
    const fora = productIds.filter((p) => !permitidos.has(p));
    if (fora.length) throw new Error("Só é possível atribuir produtos da unidade da equipe.");
  }
  await supabaseAdmin.from("team_products").delete().eq("team_id", teamId);
  if (productIds.length) {
    const { error } = await supabaseAdmin
      .from("team_products")
      .insert(productIds.map((product_id) => ({ team_id: teamId, product_id })) as never);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}
