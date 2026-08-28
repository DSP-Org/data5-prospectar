import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { Escopo } from "./escopo.server";
import { unidadeDeGravacao, unidadesFiltro } from "./escopo.server";

export type Produto = {
  id: string;
  unit_id: string | null;
  nome: string;
  tipo: "produto" | "servico";
  descricao: string;
  valor_referencia: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

function podeGerenciar(escopo: Escopo) {
  return escopo.master || escopo.papel === "admin_unidade";
}

function exigirGestao(escopo: Escopo) {
  if (!podeGerenciar(escopo)) {
    throw new Error("Apenas o master ou o administrador da unidade pode gerenciar produtos e serviços.");
  }
}

export async function listarProdutos(escopo: Escopo): Promise<Produto[]> {
  let q = supabaseAdmin.from("products").select("*").order("nome", { ascending: true });
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Produto[];
}

export async function criarProduto(
  escopo: Escopo,
  input: {
    nome: string;
    tipo: "produto" | "servico";
    descricao?: string | undefined;
    valor_referencia?: number | null | undefined;
    unit_id?: string | null | undefined;
  },
) {
  exigirGestao(escopo);
  const unit = unidadeDeGravacao(escopo, input.unit_id ?? null);
  if (!unit) throw new Error("Cadastre uma unidade antes de criar produtos e serviços.");
  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      nome: input.nome,
      tipo: input.tipo,
      descricao: input.descricao ?? "",
      valor_referencia: input.valor_referencia ?? null,
      unit_id: unit,
    } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Produto;
}

export async function atualizarProduto(
  escopo: Escopo,
  input: {
    id: string;
    nome?: string | undefined;
    tipo?: "produto" | "servico" | undefined;
    descricao?: string | undefined;
    valor_referencia?: number | null | undefined;
    ativo?: boolean | undefined;
    unit_id?: string | null | undefined;
  },
) {
  exigirGestao(escopo);
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined) patch["nome"] = input.nome;
  if (input.tipo !== undefined) patch["tipo"] = input.tipo;
  if (input.descricao !== undefined) patch["descricao"] = input.descricao;
  if (input.valor_referencia !== undefined) patch["valor_referencia"] = input.valor_referencia;
  if (input.ativo !== undefined) patch["ativo"] = input.ativo;
  if (input.unit_id !== undefined) patch["unit_id"] = unidadeDeGravacao(escopo, input.unit_id);
  let q = supabaseAdmin.from("products").update(patch as never).eq("id", input.id);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { data, error } = await q.select("*").single();
  if (error) throw new Error(error.message);
  return data as unknown as Produto;
}

export async function excluirProduto(escopo: Escopo, id: string) {
  exigirGestao(escopo);
  let q = supabaseAdmin.from("products").delete().eq("id", id);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}
