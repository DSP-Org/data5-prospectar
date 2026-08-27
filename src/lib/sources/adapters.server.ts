// Adaptadores server-only de cada fonte de dados.
// Todos retornam um Partial<MappedCompany> indexado pelo CNPJ formatado.

import { mapCompany, type MappedCompany } from "../company-mapper.server";
import { buscarPorCnpjs, formatCnpjApi, validarToken, EconodataError } from "../econodata.server";
import type { SourceId } from "./catalog";

export type Partial2 = Partial<MappedCompany>;
export type LoteResultado = Map<string, Partial2>;

export type TesteResultado = { ok: boolean; mensagem: string };

export type DataSource = {
  id: SourceId;
  fetchLote(cnpjs: string[], key?: string | null): Promise<LoteResultado>;
  testar(key?: string | null): Promise<TesteResultado>;
};

const digitos = (v: string) => v.replace(/\D/g, "");

function limparLista(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function comLimite<T>(itens: string[], limite: number, fn: (v: string) => Promise<T>) {
  const out: T[] = [];
  for (let i = 0; i < itens.length; i += limite) {
    const fatia = itens.slice(i, i + limite);
    out.push(...(await Promise.all(fatia.map(fn))));
  }
  return out;
}

async function getJson(url: string, headers?: Record<string, string>, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: headers ?? {}, signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------------ Econodata */

const econodata: DataSource = {
  id: "econodata",
  async fetchLote(cnpjs, key) {
    const out: LoteResultado = new Map();
    for (let i = 0; i < cnpjs.length; i += 100) {
      const lote = cnpjs.slice(i, i + 100);
      const res = await buscarPorCnpjs(lote, key ?? undefined);
      for (const c of Array.isArray(res) ? res : []) {
        if (!c?.cnpj) continue;
        const formatado = formatCnpjApi(c.cnpj) ?? c.cnpj;
        out.set(formatado, mapCompany({ ...c, cnpj: formatado }));
      }
    }
    return out;
  },
  async testar(key) {
    try {
      const info = await validarToken(key ?? undefined);
      return { ok: true, mensagem: info?.nm_integracao ? `Conectado (${info.nm_integracao})` : "Conectado." };
    } catch (e) {
      const err = e as EconodataError;
      return { ok: false, mensagem: err.message ?? "Falha ao validar a chave." };
    }
  },
};

/* ------------------------------------------------------------------ BrasilAPI */

type BrasilApiResp = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  descricao_identificador_matriz_filial?: string;
  natureza_juridica?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  porte?: string;
  capital_social?: number | string;
  data_inicio_atividade?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  email?: string;
  qsa?: Array<Record<string, unknown>>;
  cnaes_secundarios?: Array<{ codigo?: number; descricao?: string }>;
};

function mapBrasilApi(r: BrasilApiResp, cnpjFormatado: string): Partial2 {
  const telefones = [r.ddd_telefone_1, r.ddd_telefone_2].filter(
    (t): t is string => typeof t === "string" && t.trim() !== "",
  );
  const emails = r.email?.trim() ? [r.email.trim()] : [];
  return {
    cnpj: cnpjFormatado,
    razao_social: r.razao_social ?? "",
    nome_fantasia: r.nome_fantasia?.trim() || null,
    tipo_unidade: r.descricao_identificador_matriz_filial ?? null,
    situacao: r.descricao_situacao_cadastral ?? null,
    natureza_juridica: r.natureza_juridica ?? null,
    logradouro: r.logradouro ?? null,
    numero: r.numero ?? null,
    complemento: r.complemento?.trim() || null,
    bairro: r.bairro ?? null,
    cep: r.cep ?? null,
    cidade: r.municipio ?? null,
    uf: r.uf ?? null,
    cnae_codigo: r.cnae_fiscal != null ? String(r.cnae_fiscal) : null,
    cnae_descricao: r.cnae_fiscal_descricao ?? null,
    setores: (r.cnaes_secundarios ?? [])
      .map((c) => c?.descricao)
      .filter((d): d is string => typeof d === "string" && d.trim() !== "")
      .slice(0, 10),
    porte_estimado: r.porte ?? null,
    capital_social: num(r.capital_social),
    data_abertura: r.data_inicio_atividade ? r.data_inicio_atividade.slice(0, 10) : null,
    melhor_telefone: telefones[0] ?? null,
    telefones,
    email_receita: emails[0] ?? null,
    emails,
    contatos: (r.qsa ?? []).map((s) => ({
      nome: (s["nome_socio"] as string) ?? null,
      qualificacao: (s["qualificacao_socio"] as string) ?? null,
      dataEntradaSociedade: (s["data_entrada_sociedade"] as string) ?? null,
    })) as unknown as Record<string, unknown>[],
  };
}

const brasilapi: DataSource = {
  id: "brasilapi",
  async fetchLote(cnpjs) {
    const out: LoteResultado = new Map();
    await comLimite(cnpjs, 4, async (cnpj) => {
      const d = digitos(cnpj);
      const json = (await getJson(`https://brasilapi.com.br/api/cnpj/v1/${d}`)) as BrasilApiResp | null;
      if (json?.razao_social) out.set(cnpj, mapBrasilApi(json, cnpj));
    });
    return out;
  },
  async testar() {
    const json = await getJson("https://brasilapi.com.br/api/cnpj/v1/00000000000191");
    return json
      ? { ok: true, mensagem: "BrasilAPI respondendo normalmente." }
      : { ok: false, mensagem: "BrasilAPI indisponível no momento." };
  },
};

/* ------------------------------------------------------------------ CNPJá */

type CnpjaResp = {
  taxId?: string;
  company?: { name?: string; equity?: number; nature?: { text?: string }; size?: { text?: string }; members?: Array<Record<string, unknown>> };
  alias?: string;
  founded?: string;
  head?: boolean;
  status?: { text?: string };
  address?: {
    street?: string;
    number?: string;
    details?: string;
    district?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  mainActivity?: { id?: number; text?: string };
  sideActivities?: Array<{ id?: number; text?: string }>;
  phones?: Array<{ area?: string; number?: string }>;
  emails?: Array<{ address?: string }>;
};

function mapCnpja(r: CnpjaResp, cnpjFormatado: string): Partial2 {
  const telefones = (r.phones ?? [])
    .map((p) => `${p.area ?? ""}${p.number ?? ""}`.trim())
    .filter((t) => t !== "");
  const emails = (r.emails ?? [])
    .map((e) => e.address?.trim() ?? "")
    .filter((e) => e !== "");
  return {
    cnpj: cnpjFormatado,
    razao_social: r.company?.name ?? "",
    nome_fantasia: r.alias?.trim() || null,
    tipo_unidade: r.head === undefined ? null : r.head ? "MATRIZ" : "FILIAL",
    situacao: r.status?.text ?? null,
    natureza_juridica: r.company?.nature?.text ?? null,
    logradouro: r.address?.street ?? null,
    numero: r.address?.number ?? null,
    complemento: r.address?.details?.trim() || null,
    bairro: r.address?.district ?? null,
    cep: r.address?.zip ?? null,
    cidade: r.address?.city ?? null,
    uf: r.address?.state ?? null,
    cnae_codigo: r.mainActivity?.id != null ? String(r.mainActivity.id) : null,
    cnae_descricao: r.mainActivity?.text ?? null,
    setores: (r.sideActivities ?? [])
      .map((a) => a?.text)
      .filter((t): t is string => typeof t === "string" && t.trim() !== "")
      .slice(0, 10),
    porte_estimado: r.company?.size?.text ?? null,
    capital_social: num(r.company?.equity),
    data_abertura: r.founded ? r.founded.slice(0, 10) : null,
    melhor_telefone: telefones[0] ?? null,
    telefones,
    email_receita: emails[0] ?? null,
    emails,
    contatos: (r.company?.members ?? []) as unknown as Record<string, unknown>[],
  };
}

const cnpja: DataSource = {
  id: "cnpja",
  async fetchLote(cnpjs, key) {
    const out: LoteResultado = new Map();
    if (!key) return out;
    await comLimite(cnpjs, 3, async (cnpj) => {
      const json = (await getJson(`https://api.cnpja.com/office/${digitos(cnpj)}`, {
        Authorization: key,
      })) as CnpjaResp | null;
      if (json?.company?.name) out.set(cnpj, mapCnpja(json, cnpj));
    });
    return out;
  },
  async testar(key) {
    if (!key) return { ok: false, mensagem: "Informe a chave da CNPJá." };
    const json = (await getJson("https://api.cnpja.com/office/00000000000191", {
      Authorization: key,
    })) as CnpjaResp | null;
    return json?.company?.name
      ? { ok: true, mensagem: "Chave CNPJá válida." }
      : { ok: false, mensagem: "Chave inválida ou sem crédito na CNPJá." };
  },
};

/* ------------------------------------------------------------------ Speedio */

type SpeedioResp = Record<string, unknown>;

function txt(o: SpeedioResp, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function mapSpeedio(r: SpeedioResp, cnpjFormatado: string): Partial2 {
  const telefones = [
    ...limparLista(r["TELEFONES"]),
    ...limparLista(r["telefones"]),
    ...[txt(r, "TELEFONE", "telefone")].filter((v): v is string => Boolean(v)),
  ];
  const emails = [
    ...limparLista(r["EMAILS"]),
    ...limparLista(r["emails"]),
    ...[txt(r, "EMAIL", "email")].filter((v): v is string => Boolean(v)),
  ];
  return {
    cnpj: cnpjFormatado,
    razao_social: txt(r, "RAZAO SOCIAL", "RAZAO_SOCIAL", "razao_social") ?? "",
    nome_fantasia: txt(r, "NOME FANTASIA", "NOME_FANTASIA", "nome_fantasia"),
    situacao: txt(r, "SITUACAO CADASTRAL", "SITUACAO", "situacao"),
    natureza_juridica: txt(r, "NATUREZA JURIDICA", "NATUREZA_JURIDICA", "natureza_juridica"),
    logradouro: txt(r, "LOGRADOURO", "logradouro"),
    numero: txt(r, "NUMERO", "numero"),
    complemento: txt(r, "COMPLEMENTO", "complemento"),
    bairro: txt(r, "BAIRRO", "bairro"),
    cep: txt(r, "CEP", "cep"),
    cidade: txt(r, "MUNICIPIO", "CIDADE", "municipio", "cidade"),
    uf: txt(r, "UF", "uf"),
    cnae_codigo: txt(r, "CNAE PRINCIPAL", "CNAE", "cnae"),
    cnae_descricao: txt(r, "CNAE DESCRICAO", "DESCRICAO CNAE", "cnae_descricao"),
    porte_estimado: txt(r, "PORTE", "porte"),
    capital_social: num(r["CAPITAL SOCIAL"] ?? r["CAPITAL_SOCIAL"] ?? r["capital_social"]),
    data_abertura: (txt(r, "DATA ABERTURA", "DATA_ABERTURA", "data_abertura") ?? "").slice(0, 10) || null,
    melhor_telefone: telefones[0] ?? null,
    telefones,
    email_receita: emails[0] ?? null,
    emails,
    melhor_site: txt(r, "SITE", "site"),
    sites: [txt(r, "SITE", "site")].filter((v): v is string => Boolean(v)),
  };
}

const SPEEDIO_URL = "https://api-publica.speedio.com.br/buscarcnpj?cnpj=";

const speedio: DataSource = {
  id: "speedio",
  async fetchLote(cnpjs, key) {
    const out: LoteResultado = new Map();
    const headers = key ? { Authorization: key } : undefined;
    await comLimite(cnpjs, 3, async (cnpj) => {
      const json = (await getJson(`${SPEEDIO_URL}${digitos(cnpj)}`, headers)) as SpeedioResp | null;
      if (!json || typeof json !== "object") return;
      const mapped = mapSpeedio(json, cnpj);
      if (mapped.razao_social) out.set(cnpj, mapped);
    });
    return out;
  },
  async testar(key) {
    const json = (await getJson(
      `${SPEEDIO_URL}00000000000191`,
      key ? { Authorization: key } : undefined,
    )) as SpeedioResp | null;
    return json
      ? { ok: true, mensagem: "Speedio respondendo normalmente." }
      : { ok: false, mensagem: "Speedio indisponível ou chave inválida." };
  },
};

export const ADAPTERS: Record<SourceId, DataSource> = { econodata, brasilapi, cnpja, speedio };
