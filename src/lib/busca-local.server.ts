// Busca por nome na base local de empresas (não consome crédito de API).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ItemBuscaLocal = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cidade: string | null;
  uf: string | null;
  situacao: string | null;
  cnae: string | null;
  telefone: string | null;
};

export async function buscarEmpresasLocal(input: {
  termo: string;
  limite?: number | null | undefined;
}): Promise<{ itens: ItemBuscaLocal[]; total: number }> {
  const termo = input.termo.trim();
  if (termo.length < 2) return { itens: [], total: 0 };

  const limite = Math.min(Math.max(input.limite ?? 20, 1), 50);
  const digitos = termo.replace(/\D/g, "");
  const alvo = digitos.length >= 3 ? digitos : termo;
  const seguro = alvo.replace(/[%,()]/g, " ").trim();
  if (!seguro) return { itens: [], total: 0 };

  const { data, error, count } = await supabaseAdmin
    .from("companies")
    .select(
      "cnpj, razao_social, nome_fantasia, cidade, uf, situacao, cnae_codigo, cnae_descricao, melhor_telefone",
      { count: "exact" },
    )
    .or(
      `razao_social.ilike.%${seguro}%,nome_fantasia.ilike.%${seguro}%,cnpj.ilike.%${seguro}%,cidade.ilike.%${seguro}%`,
    )
    .order("razao_social", { ascending: true })
    .limit(limite);

  if (error) throw new Error(error.message);

  const itens = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const txt = (k: string) => {
      const v = r[k];
      return typeof v === "string" && v.trim() ? v : null;
    };
    const codigo = txt("cnae_codigo");
    const descricao = txt("cnae_descricao");
    return {
      cnpj: String(r["cnpj"] ?? ""),
      razaoSocial: txt("razao_social") ?? "",
      nomeFantasia: txt("nome_fantasia"),
      cidade: txt("cidade"),
      uf: txt("uf"),
      situacao: txt("situacao"),
      cnae: [codigo, descricao].filter(Boolean).join(" - ") || null,
      telefone: txt("melhor_telefone"),
    } satisfies ItemBuscaLocal;
  });

  return { itens, total: count ?? itens.length };
}
