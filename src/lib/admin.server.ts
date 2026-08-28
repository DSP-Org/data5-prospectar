import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { exigirMaster, type Escopo, type Papel } from "./escopo.server";

export type Unidade = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  cor: string;
  ativa: boolean;
  created_at: string;
  total_empresas?: number;
  total_usuarios?: number;
};

export type UsuarioAdmin = {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  papel: Papel;
  unidades: string[];
  created_at: string;
};

/** Unidades visíveis para o usuário (todas, se master). */
export async function listarUnidades(escopo: Escopo): Promise<Unidade[]> {
  const { data, error } = await supabaseAdmin.from("units").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const todas = (data ?? []) as unknown as Unidade[];
  const visiveis = escopo.master ? todas : todas.filter((u) => escopo.unitIds.includes(u.id));

  const [{ data: empresas }, { data: vinculos }] = await Promise.all([
    supabaseAdmin.from("companies").select("unit_id"),
    supabaseAdmin.from("user_units").select("unit_id"),
  ]);
  const contarEmpresas: Record<string, number> = {};
  for (const r of (empresas ?? []) as Array<{ unit_id: string | null }>) {
    if (r.unit_id) contarEmpresas[r.unit_id] = (contarEmpresas[r.unit_id] ?? 0) + 1;
  }
  const contarUsuarios: Record<string, number> = {};
  for (const r of (vinculos ?? []) as Array<{ unit_id: string }>) {
    contarUsuarios[r.unit_id] = (contarUsuarios[r.unit_id] ?? 0) + 1;
  }

  return visiveis.map((u) => ({
    ...u,
    total_empresas: contarEmpresas[u.id] ?? 0,
    total_usuarios: contarUsuarios[u.id] ?? 0,
  }));
}

export async function criarUnidade(
  escopo: Escopo,
  input: { nome: string; cidade?: string | undefined; uf?: string | undefined; cor?: string | undefined },
) {
  exigirMaster(escopo);
  const { data, error } = await supabaseAdmin
    .from("units")
    .insert({
      nome: input.nome,
      cidade: input.cidade ?? null,
      uf: input.uf ?? null,
      cor: input.cor ?? "slate",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  // O master enxerga tudo, mas manter o vínculo explícito facilita relatórios.
  await supabaseAdmin.from("user_units").insert({ user_id: escopo.userId, unit_id: data.id });
  return data as unknown as Unidade;
}

export async function atualizarUnidade(
  escopo: Escopo,
  input: { id: string; nome?: string | undefined; cidade?: string | null | undefined; uf?: string | null | undefined; cor?: string | undefined; ativa?: boolean | undefined },
) {
  exigirMaster(escopo);
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined) patch["nome"] = input.nome;
  if (input.cidade !== undefined) patch["cidade"] = input.cidade;
  if (input.uf !== undefined) patch["uf"] = input.uf;
  if (input.cor !== undefined) patch["cor"] = input.cor;
  if (input.ativa !== undefined) patch["ativa"] = input.ativa;
  const { data, error } = await supabaseAdmin
    .from("units")
    .update(patch as never)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Unidade;
}

export async function excluirUnidade(escopo: Escopo, id: string) {
  exigirMaster(escopo);
  const { count } = await supabaseAdmin
    .from("companies")
    .select("cnpj", { count: "exact", head: true })
    .eq("unit_id", id);
  if ((count ?? 0) > 0) throw new Error("Existem empresas vinculadas a esta unidade. Mova-as antes de excluir.");
  const { error } = await supabaseAdmin.from("units").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Equipe agrupada por unidade. Master vê todas; demais usuários veem só as próprias unidades. */
export async function listarEquipe(escopo: Escopo) {
  const [{ data: perfis, error }, { data: roles }, { data: vinculos }, { data: unidades }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").order("nome", { ascending: true }),
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("user_units").select("user_id, unit_id"),
    supabaseAdmin.from("units").select("id, nome, cor, cidade, uf").order("nome", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);

  const papelDe: Record<string, Papel> = {};
  for (const r of (roles ?? []) as Array<{ user_id: string; role: Papel }>) {
    if (r.role === "master" || !papelDe[r.user_id]) papelDe[r.user_id] = r.role;
  }
  const unidadesDe: Record<string, string[]> = {};
  for (const v of (vinculos ?? []) as Array<{ user_id: string; unit_id: string }>) {
    (unidadesDe[v.user_id] ??= []).push(v.unit_id);
  }

  const usuarios = ((perfis ?? []) as Array<{ id: string; email: string; nome: string; ativo: boolean }>)
    .filter((p) => p.ativo !== false)
    .map((p) => ({
      id: p.id,
      email: p.email,
      nome: p.nome,
      papel: papelDe[p.id] ?? ("usuario" as Papel),
      unidades: unidadesDe[p.id] ?? [],
    }));

  const visiveis = (unidades ?? []) as Array<{ id: string; nome: string; cor: string; cidade: string | null; uf: string | null }>;
  const escopoIds = escopo.master ? visiveis.map((u) => u.id) : escopo.unitIds;

  return visiveis
    .filter((u) => escopoIds.includes(u.id))
    .map((u) => ({
      ...u,
      membros: usuarios.filter((p) => p.unidades.includes(u.id)),
    }))
    .concat(
      escopo.master
        ? [{ id: "", nome: "Sem unidade", cor: "slate", cidade: null, uf: null, membros: usuarios.filter((p) => p.unidades.length === 0) }]
        : [],
    );
}

export async function listarUsuarios(escopo: Escopo): Promise<UsuarioAdmin[]> {
  exigirMaster(escopo);
  const [{ data: perfis, error }, { data: roles }, { data: vinculos }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: true }),
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("user_units").select("user_id, unit_id"),
  ]);
  if (error) throw new Error(error.message);

  const papelDe: Record<string, Papel> = {};
  for (const r of (roles ?? []) as Array<{ user_id: string; role: Papel }>) {
    if (r.role === "master" || !papelDe[r.user_id]) papelDe[r.user_id] = r.role;
  }
  const unidadesDe: Record<string, string[]> = {};
  for (const v of (vinculos ?? []) as Array<{ user_id: string; unit_id: string }>) {
    (unidadesDe[v.user_id] ??= []).push(v.unit_id);
  }

  return ((perfis ?? []) as Array<{ id: string; email: string; nome: string; ativo: boolean; created_at: string }>).map(
    (p) => ({
      id: p.id,
      email: p.email,
      nome: p.nome,
      ativo: p.ativo,
      papel: papelDe[p.id] ?? "usuario",
      unidades: unidadesDe[p.id] ?? [],
      created_at: p.created_at,
    }),
  );
}

export async function criarUsuario(
  escopo: Escopo,
  input: { email: string; senha: string; nome?: string | undefined; papel: Papel; unidades: string[] },
) {
  exigirMaster(escopo);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
    user_metadata: { nome: input.nome ?? "" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível criar o usuário.");
  const id = data.user.id;

  await supabaseAdmin.from("profiles").upsert(
    { id, email: input.email, nome: input.nome ?? "" },
    { onConflict: "id" },
  );
  await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
  await supabaseAdmin.from("user_roles").insert({ user_id: id, role: input.papel });
  if (input.unidades.length) {
    await supabaseAdmin.from("user_units").insert(input.unidades.map((unit_id) => ({ user_id: id, unit_id })));
  }
  return { ok: true, id };
}

export async function atualizarUsuario(
  escopo: Escopo,
  input: { id: string; nome?: string | undefined; papel?: Papel | undefined; unidades?: string[] | undefined; ativo?: boolean | undefined; senha?: string | undefined },
) {
  exigirMaster(escopo);
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined) patch["nome"] = input.nome;
  if (input.ativo !== undefined) patch["ativo"] = input.ativo;
  if (Object.keys(patch).length) {
    await supabaseAdmin.from("profiles").update(patch as never).eq("id", input.id);
  }
  if (input.papel) {
    if (input.id === escopo.userId && input.papel !== "master") {
      throw new Error("Você não pode remover o próprio acesso master.");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", input.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: input.id, role: input.papel });
  }
  if (input.unidades) {
    await supabaseAdmin.from("user_units").delete().eq("user_id", input.id);
    if (input.unidades.length) {
      await supabaseAdmin
        .from("user_units")
        .insert(input.unidades.map((unit_id) => ({ user_id: input.id, unit_id })));
    }
  }
  if (input.senha) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(input.id, { password: input.senha });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function excluirUsuario(escopo: Escopo, id: string) {
  exigirMaster(escopo);
  if (id === escopo.userId) throw new Error("Você não pode excluir o próprio usuário.");
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
