import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { exigirMaster, type Escopo } from "./escopo.server";
import { PAGINAS, ROTAS } from "./permissoes";

export type Efeito = "permitir" | "negar";

export type MatrizPapel = { role: string; rota: string };
export type PermissaoUsuario = { user_id: string; rota: string; efeito: Efeito };

export async function listarMatriz(): Promise<MatrizPapel[]> {
  const { data, error } = await supabaseAdmin.from("role_permissions").select("role, rota");
  if (error) throw new Error(error.message);
  return (data ?? []) as MatrizPapel[];
}

export async function listarPermissoesUsuarios(): Promise<PermissaoUsuario[]> {
  const { data, error } = await supabaseAdmin.from("user_permissions").select("user_id, rota, efeito");
  if (error) throw new Error(error.message);
  return (data ?? []) as PermissaoUsuario[];
}

export async function definirPermissaoPapel(
  escopo: Escopo,
  input: { role: string; rota: string; permitido: boolean },
) {
  exigirMaster(escopo);
  if (!ROTAS.includes(input.rota)) throw new Error("Página desconhecida.");
  if (input.permitido) {
    const { error } = await supabaseAdmin
      .from("role_permissions")
      .upsert({ role: input.role, rota: input.rota } as never, { onConflict: "role,rota" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role", input.role)
      .eq("rota", input.rota);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function definirPermissaoUsuario(
  escopo: Escopo,
  input: { userId: string; rota: string; efeito: Efeito | null },
) {
  exigirMaster(escopo);
  if (!ROTAS.includes(input.rota)) throw new Error("Página desconhecida.");
  if (input.efeito === null) {
    const { error } = await supabaseAdmin
      .from("user_permissions")
      .delete()
      .eq("user_id", input.userId)
      .eq("rota", input.rota);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("user_permissions")
      .upsert(
        { user_id: input.userId, rota: input.rota, efeito: input.efeito } as never,
        { onConflict: "user_id,rota" },
      );
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

/** Páginas que o usuário pode acessar (papel + sobreposições individuais). */
export async function rotasEfetivas(userId: string, papeis: string[], master: boolean): Promise<string[]> {
  if (master) return ROTAS.slice();

  const [{ data: matriz }, { data: overrides }] = await Promise.all([
    supabaseAdmin.from("role_permissions").select("role, rota"),
    supabaseAdmin.from("user_permissions").select("rota, efeito").eq("user_id", userId),
  ]);

  const herdadas = new Set(
    ((matriz ?? []) as MatrizPapel[]).filter((m) => papeis.includes(m.role)).map((m) => m.rota),
  );
  for (const o of (overrides ?? []) as Array<{ rota: string; efeito: Efeito }>) {
    if (o.efeito === "permitir") herdadas.add(o.rota);
    else herdadas.delete(o.rota);
  }

  const permitidas = PAGINAS.filter((p) => !p.masterOnly).map((p) => p.rota);
  return Array.from(herdadas).filter((r) => permitidas.includes(r));
}

export function exigirRota(escopo: Escopo, rota: string) {
  if (escopo.master) return;
  if (!escopo.rotas.includes(rota)) throw new Error("Você não tem permissão para acessar esta página.");
}
