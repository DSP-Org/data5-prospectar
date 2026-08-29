// Lista de supressão (opt-out).
//
// Prospecção ativa B2B se apoia em legítimo interesse, mas o titular pode pedir
// para não ser mais contatado. Sem um lugar para registrar esse pedido, ele se
// perde e a empresa volta a ser abordada na próxima importação. Aqui o registro
// é por canal: um e-mail, um telefone ou a empresa inteira (pelo CNPJ).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { formatCnpjApi } from "./econodata.server";
import { gerenciaCarteira, type Escopo } from "./escopo";
import { normalizarTelefone } from "./types";

export const CANAIS = ["email", "telefone", "empresa"] as const;
export type Canal = (typeof CANAIS)[number];

export type Supressao = {
  id: string;
  canal: Canal;
  valor: string;
  motivo: string;
  origem: string;
  created_at: string;
};

/** O mesmo contato chega escrito de várias formas; guardamos sempre normalizado. */
export function normalizarValor(canal: Canal, valor: string): string {
  const v = valor.trim();
  if (canal === "email") return v.toLowerCase();
  if (canal === "telefone") return normalizarTelefone(v);
  return formatCnpjApi(v) ?? v;
}

export async function listarSupressoes(limite = 500): Promise<Supressao[]> {
  const { data, error } = await supabaseAdmin
    .from("supressoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Supressao[];
}

export async function registrarSupressao(
  input: { canal: Canal; valor: string; motivo?: string | undefined },
  escopo: Escopo,
) {
  const valor = normalizarValor(input.canal, input.valor);
  if (!valor) throw new Error("Informe o e-mail, telefone ou CNPJ a suprimir.");
  const { error } = await supabaseAdmin.from("supressoes").upsert(
    {
      canal: input.canal,
      valor,
      motivo: input.motivo?.trim() ?? "",
      criado_por: escopo.userId,
    } as never,
    { onConflict: "canal,valor" },
  );
  if (error) throw new Error(error.message);
  return { ok: true, valor };
}

/** Desfazer um opt-out é decisão de gestão, não do vendedor que quer ligar. */
export async function removerSupressao(id: string, escopo: Escopo) {
  if (!gerenciaCarteira(escopo))
    throw new Error("Apenas gestor, administrador de unidade ou master pode remover uma supressão.");
  const { error } = await supabaseAdmin.from("supressoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type Bloqueios = {
  empresas: Set<string>;
  emails: Set<string>;
  telefones: Set<string>;
};

/** Carrega a lista uma vez para decidir em lote (exportação, ficha, atividades). */
export async function carregarBloqueios(): Promise<Bloqueios> {
  const { data } = await supabaseAdmin.from("supressoes").select("canal, valor");
  const b: Bloqueios = { empresas: new Set(), emails: new Set(), telefones: new Set() };
  for (const r of (data ?? []) as Array<{ canal: Canal; valor: string }>) {
    if (r.canal === "empresa") b.empresas.add(r.valor);
    else if (r.canal === "email") b.emails.add(r.valor);
    else b.telefones.add(r.valor);
  }
  return b;
}

export function emailBloqueado(b: Bloqueios, email: string) {
  return b.emails.has(email.trim().toLowerCase());
}

export function telefoneBloqueado(b: Bloqueios, telefone: string) {
  return b.telefones.has(normalizarTelefone(telefone));
}

export function empresaBloqueada(b: Bloqueios, cnpj: string) {
  return b.empresas.has(formatCnpjApi(cnpj) ?? cnpj);
}
