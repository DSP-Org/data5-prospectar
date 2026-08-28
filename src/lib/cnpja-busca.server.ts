// Busca avançada de empresas na API comercial do CNPJá (GET /office).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FiltroCnpjaBusca = {
  nome?: string | null;
  razaoSocial?: string | null;
  uf?: string | null;
  municipioIbge?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cnaePrincipal?: string | null;
  cnaeQualquer?: string | null;
  porteIds?: string | null;
  situacaoIds?: string | null;
  naturezaIds?: string | null;
  capitalMin?: number | null;
  capitalMax?: number | null;
  aberturaDe?: string | null;
  aberturaAte?: string | null;
  somenteMatriz?: boolean | null;
  limite?: number | null;
  cursor?: string | null;
};

export type ItemBuscaCnpja = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  matriz: boolean;
  uf: string | null;
  cidade: string | null;
  bairro: string | null;
  situacao: string | null;
  porte: string | null;
  naturezaJuridica: string | null;
  cnaePrincipal: string | null;
  capitalSocial: number | null;
  dataAbertura: string | null;
};

export type ResultadoBuscaCnpja = {
  total: number;
  proximoCursor: string | null;
  itens: ItemBuscaCnpja[];
};

type Registro = {
  taxId?: string;
  alias?: string | null;
  founded?: string | null;
  head?: boolean;
  company?: {
    name?: string;
    equity?: number | null;
    size?: { text?: string } | null;
    nature?: { text?: string } | null;
  } | null;
  status?: { text?: string } | null;
  address?: { state?: string; city?: string; district?: string } | null;
  mainActivity?: { id?: number; text?: string } | null;
};

async function chaveCnpja(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "source_cnpja_key")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const key = (data as { value?: string } | null)?.value?.trim();
  if (!key)
    throw new Error("Configure a chave da API comercial do CNPJá em Configurações para usar a busca avançada.");
  return key;
}

const lista = (v?: string | null) =>
  (v ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function buscarEmpresasCnpja(f: FiltroCnpjaBusca): Promise<ResultadoBuscaCnpja> {
  const key = await chaveCnpja();
  const p = new URLSearchParams();
  p.set("limit", String(Math.min(Math.max(f.limite ?? 20, 1), 100)));
  if (f.cursor) p.set("token", f.cursor);

  const add = (campo: string, valores: string[]) => {
    if (valores.length) p.set(campo, valores.join(","));
  };

  if (f.nome?.trim()) p.set("names.in", f.nome.trim());
  if (f.razaoSocial?.trim()) p.set("company.name.in", f.razaoSocial.trim());
  add("address.state.in", lista(f.uf).map((v) => v.toUpperCase()));
  add("address.municipality.in", lista(f.municipioIbge).map((v) => v.replace(/\D/g, "")));
  if (f.bairro?.trim()) p.set("address.district.in", f.bairro.trim().toUpperCase());
  add("address.zip.in", lista(f.cep).map((v) => v.replace(/\D/g, "")));
  add("mainActivity.id.in", lista(f.cnaePrincipal).map((v) => v.replace(/\D/g, "")));
  add("activities.id.in", lista(f.cnaeQualquer).map((v) => v.replace(/\D/g, "")));
  add("company.size.id.in", lista(f.porteIds));
  add("status.id.in", lista(f.situacaoIds));
  add("company.nature.id.in", lista(f.naturezaIds));
  if (typeof f.capitalMin === "number") p.set("company.equity.gte", String(f.capitalMin));
  if (typeof f.capitalMax === "number") p.set("company.equity.lte", String(f.capitalMax));
  if (f.aberturaDe) p.set("founded.gte", f.aberturaDe);
  if (f.aberturaAte) p.set("founded.lte", f.aberturaAte);
  if (f.somenteMatriz) p.set("head.eq", "true");

  const resp = await fetch(`https://api.cnpja.com/office?${p.toString()}`, {
    headers: { Authorization: key, Accept: "application/json" },
  });

  if (resp.status === 401) throw new Error("Chave do CNPJá inválida ou sem permissão para busca.");
  if (resp.status === 403)
    throw new Error("Seu plano do CNPJá não permite a busca de empresas por filtros.");
  if (resp.status === 429) throw new Error("Limite de requisições do CNPJá atingido. Tente em instantes.");
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Falha na busca do CNPJá (HTTP ${resp.status}): ${txt.slice(0, 200)}`);
  }

  const json = (await resp.json()) as {
    count?: number;
    next?: string | null;
    records?: Registro[];
  };

  return {
    total: json.count ?? 0,
    proximoCursor: json.next ?? null,
    itens: (json.records ?? []).map((r) => ({
      cnpj: r.taxId ?? "",
      razaoSocial: r.company?.name ?? "",
      nomeFantasia: r.alias || null,
      matriz: r.head !== false,
      uf: r.address?.state ?? null,
      cidade: r.address?.city ?? null,
      bairro: r.address?.district ?? null,
      situacao: r.status?.text ?? null,
      porte: r.company?.size?.text ?? null,
      naturezaJuridica: r.company?.nature?.text ?? null,
      cnaePrincipal: r.mainActivity
        ? [r.mainActivity.id, r.mainActivity.text].filter(Boolean).join(" - ")
        : null,
      capitalSocial: typeof r.company?.equity === "number" ? r.company.equity : null,
      dataAbertura: r.founded ?? null,
    })),
  };
}
