// Busca avançada de empresas na API comercial do CNPJá (GET /office).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FiltroCnpjaBusca = {
  nome?: string | null | undefined;
  razaoSocial?: string | null | undefined;
  uf?: string | null | undefined;
  municipioIbge?: string | null | undefined;
  bairro?: string | null | undefined;
  cep?: string | null | undefined;
  cnaePrincipal?: string | null | undefined;
  cnaeQualquer?: string | null | undefined;
  porteIds?: string | null | undefined;
  situacaoIds?: string | null | undefined;
  naturezaIds?: string | null | undefined;
  capitalMin?: number | null | undefined;
  capitalMax?: number | null | undefined;
  aberturaDe?: string | null | undefined;
  aberturaAte?: string | null | undefined;
  nomeFantasia?: string | null | undefined;
  excluirNomes?: string | null | undefined;
  logradouro?: string | null | undefined;
  cepDe?: string | null | undefined;
  cepAte?: string | null | undefined;
  cnaeSecundario?: string | null | undefined;
  cnaeExcluir?: string | null | undefined;
  motivoIds?: string | null | undefined;
  situacaoDesde?: string | null | undefined;
  situacaoAte?: string | null | undefined;
  matrizFilial?: string | null | undefined;
  simples?: string | null | undefined;
  mei?: string | null | undefined;
  temTelefone?: string | null | undefined;
  telefoneTipo?: string | null | undefined;
  ddd?: string | null | undefined;
  temEmail?: string | null | undefined;
  emailDominio?: string | null | undefined;
  emailTipo?: string | null | undefined;
  somenteMatriz?: boolean | null | undefined;
  limite?: number | null | undefined;
  cursor?: string | null | undefined;
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
  alias?: string | null | undefined;
  founded?: string | null | undefined;
  head?: boolean;
  company?: {
    name?: string;
    equity?: number | null | undefined;
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
  if (f.nomeFantasia?.trim()) p.set("alias.in", f.nomeFantasia.trim());
  if (f.excluirNomes?.trim()) p.set("names.nin", f.excluirNomes.trim());
  if (f.logradouro?.trim()) p.set("address.street.in", f.logradouro.trim().toUpperCase());
  if (f.cepDe?.trim()) p.set("address.zip.gte", f.cepDe.replace(/\D/g, ""));
  if (f.cepAte?.trim()) p.set("address.zip.lte", f.cepAte.replace(/\D/g, ""));
  add("sideActivities.id.in", lista(f.cnaeSecundario).map((v) => v.replace(/\D/g, "")));
  add("activities.id.nin", lista(f.cnaeExcluir).map((v) => v.replace(/\D/g, "")));
  add("reason.id.in", lista(f.motivoIds));
  if (f.situacaoDesde) p.set("statusDate.gte", f.situacaoDesde);
  if (f.situacaoAte) p.set("statusDate.lte", f.situacaoAte);

  const bool = (v?: string | null) => (v === "sim" ? "true" : v === "nao" ? "false" : null);
  const matriz = f.matrizFilial ? bool(f.matrizFilial === "matriz" ? "sim" : f.matrizFilial === "filial" ? "nao" : null) : f.somenteMatriz ? "true" : null;
  if (matriz) p.set("head.eq", matriz);
  const simples = bool(f.simples);
  if (simples) p.set("company.simples.optant.eq", simples);
  const mei = bool(f.mei);
  if (mei) p.set("company.simei.optant.eq", mei);
  const tel = bool(f.temTelefone);
  if (tel) p.set("phones.ex", tel);
  add("phones.type.in", lista(f.telefoneTipo));
  add("phones.area.in", lista(f.ddd).map((v) => v.replace(/\D/g, "")));
  const mail = bool(f.temEmail);
  if (mail) p.set("emails.ex", mail);
  add("emails.domain.in", lista(f.emailDominio));
  add("emails.ownership.in", lista(f.emailTipo));

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
    next?: string | null | undefined;
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
