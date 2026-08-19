import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mapCompany } from "./company-mapper.server";
import {
  buscarPorChave,
  buscarPorCnpjs,
  EconodataError,
  formatCnpjApi,
  validarToken,
} from "./econodata.server";
import type { Company, CompanyList, LookupItem, QueryLogEntry, Status } from "./types";

const db = () => supabaseAdmin as unknown as ReturnType<typeof supabaseAdmin.schema>;

type Row = Record<string, unknown>;

function asCompany(row: Row): Company {
  return row as unknown as Company;
}

async function logQuery(entry: {
  tipo: string;
  entrada: string;
  resultado: string;
  mensagem?: string | null;
  quantidade?: number;
}) {
  await supabaseAdmin.from("query_log").insert({
    tipo: entry.tipo,
    entrada: entry.entrada,
    resultado: entry.resultado,
    mensagem: entry.mensagem ?? null,
    quantidade: entry.quantidade ?? 0,
  } as never);
}

export async function testarConexao() {
  try {
    const info = await validarToken();
    return { ok: true as const, cliente: info?.cd_cliente ?? null, integracao: info?.nm_integracao ?? null };
  } catch (e) {
    const err = e as EconodataError;
    return { ok: false as const, erro: err.message ?? "Falha desconhecida", status: err.status ?? 0 };
  }
}

async function persistir(mapped: ReturnType<typeof mapCompany>[], listId: string | null) {
  if (mapped.length === 0) return [] as Company[];
  const payload = mapped.map((m) => (listId ? { ...m, list_id: listId } : m));
  const { data, error } = await supabaseAdmin
    .from("companies")
    .upsert(payload as never, { onConflict: "cnpj" })
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => asCompany(r as Row));
}

export async function consultarCnpjs(input: {
  cnpjs: string[];
  listId?: string | null;
  salvar?: boolean;
}): Promise<{ itens: LookupItem[] }> {
  const invalidos: string[] = [];
  const validos: string[] = [];
  for (const raw of input.cnpjs) {
    const f = formatCnpjApi(raw);
    if (f) {
      if (!validos.includes(f)) validos.push(f);
    } else if (raw.trim()) invalidos.push(raw.trim());
  }

  const itens: LookupItem[] = invalidos.map((c) => ({
    cnpj: c,
    encontrada: false,
    erro: "CNPJ inválido (precisa ter 14 dígitos).",
    salva: false,
  }));

  if (validos.length === 0) {
    if (itens.length)
      await logQuery({ tipo: "cnpj", entrada: input.cnpjs.join(", "), resultado: "erro", mensagem: "CNPJ inválido" });
    return { itens };
  }

  const lotes: string[][] = [];
  for (let i = 0; i < validos.length; i += 100) lotes.push(validos.slice(i, i + 100));

  const encontradas: ReturnType<typeof mapCompany>[] = [];
  for (const lote of lotes) {
    try {
      const res = await buscarPorCnpjs(lote);
      const lista = Array.isArray(res) ? res : [];
      for (const c of lista) if (c?.cnpj) encontradas.push(mapCompany(c));
      const achados = new Set(lista.map((c) => c?.cnpj));
      for (const c of lote)
        if (!achados.has(c))
          itens.push({ cnpj: c, encontrada: false, erro: "Não encontrada na Econodata.", salva: false });
    } catch (e) {
      const err = e as EconodataError;
      for (const c of lote) itens.push({ cnpj: c, encontrada: false, erro: err.message, salva: false });
      await logQuery({
        tipo: "cnpj",
        entrada: lote.join(", "),
        resultado: "erro",
        mensagem: err.message,
        quantidade: 0,
      });
    }
  }

  const salvar = input.salvar !== false;
  let salvas: Company[] = [];
  if (salvar) salvas = await persistir(encontradas, input.listId ?? null);

  for (const m of encontradas) {
    const salva = salvas.find((s) => s.cnpj === m.cnpj);
    itens.push({
      cnpj: m.cnpj,
      encontrada: true,
      company: salva ?? (m as unknown as Company),
      salva: Boolean(salva),
    });
  }

  if (encontradas.length)
    await logQuery({
      tipo: "cnpj",
      entrada: validos.join(", "),
      resultado: "ok",
      quantidade: encontradas.length,
    });

  return { itens };
}

export async function consultarChave(input: {
  site?: string;
  email?: string;
  listId?: string | null;
  salvar?: boolean;
}): Promise<LookupItem> {
  const tipo = input.site ? "site" : "email";
  const entrada = (input.site ?? input.email ?? "").trim();
  try {
    const res = await buscarPorChave(input.site ? { site: entrada } : { email: entrada });
    if (!res?.cnpj) {
      await logQuery({ tipo, entrada, resultado: "nao_encontrado" });
      return { cnpj: entrada, encontrada: false, erro: "Nenhuma empresa encontrada.", salva: false };
    }
    const mapped = mapCompany(res);
    const salvar = input.salvar !== false;
    const salvas = salvar ? await persistir([mapped], input.listId ?? null) : [];
    await logQuery({ tipo, entrada, resultado: "ok", quantidade: 1 });
    return {
      cnpj: mapped.cnpj,
      encontrada: true,
      company: salvas[0] ?? (mapped as unknown as Company),
      salva: salvas.length > 0,
    };
  } catch (e) {
    const err = e as EconodataError;
    await logQuery({ tipo, entrada, resultado: "erro", mensagem: err.message });
    return { cnpj: entrada, encontrada: false, erro: err.message, salva: false };
  }
}

export async function listarEmpresas(input: {
  busca?: string;
  status?: string;
  uf?: string;
  listId?: string;
  page?: number;
  perPage?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(100, input.perPage ?? 25);
  let q = supabaseAdmin.from("companies").select("*", { count: "exact" });

  if (input.busca?.trim()) {
    const termo = input.busca.trim();
    const digitos = termo.replace(/\D/g, "");
    const alvo = digitos.length >= 3 ? digitos : termo;
    q = q.or(
      `razao_social.ilike.%${alvo}%,nome_fantasia.ilike.%${alvo}%,cnpj.ilike.%${alvo}%,cidade.ilike.%${alvo}%`,
    );
  }
  if (input.status && input.status !== "todos") q = q.eq("status", input.status);
  if (input.uf && input.uf !== "todos") q = q.eq("uf", input.uf);
  if (input.listId && input.listId !== "todas") q = q.eq("list_id", input.listId);

  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) throw new Error(error.message);

  return {
    empresas: (data ?? []).map((r) => asCompany(r as Row)),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function obterEmpresa(cnpj: string) {
  const { data, error } = await supabaseAdmin.from("companies").select("*").eq("cnpj", cnpj).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asCompany(data as Row) : null;
}

export async function atualizarEmpresa(input: {
  cnpj: string;
  status?: Status;
  notas?: string;
  listId?: string | null;
  tags?: string[];
}) {
  const patch: Row = {};
  if (input.status) patch["status"] = input.status;
  if (input.notas !== undefined) patch["notas"] = input.notas;
  if (input.listId !== undefined) patch["list_id"] = input.listId;
  if (input.tags) patch["tags"] = input.tags;
  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(patch as never)
    .eq("cnpj", input.cnpj)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asCompany(data as Row) : null;
}

export async function excluirEmpresa(cnpj: string) {
  const { error } = await supabaseAdmin.from("companies").delete().eq("cnpj", cnpj);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listarListas(): Promise<CompanyList[]> {
  const { data, error } = await supabaseAdmin
    .from("company_lists")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CompanyList[];
}

export async function criarLista(name: string, color: string) {
  const { data, error } = await supabaseAdmin
    .from("company_lists")
    .insert({ name, color } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CompanyList;
}

export async function excluirLista(id: string) {
  const { error } = await supabaseAdmin.from("company_lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function obterPainel() {
  const { count: total } = await supabaseAdmin.from("companies").select("cnpj", { count: "exact", head: true });

  const { data: statusRows } = await supabaseAdmin.from("companies").select("status, uf, created_at");
  const porStatus: Record<string, number> = {};
  const porUf: Record<string, number> = {};
  let ultimos30 = 0;
  const limite = Date.now() - 30 * 24 * 3600 * 1000;
  for (const r of (statusRows ?? []) as Array<{ status: string; uf: string | null; created_at: string }>) {
    porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;
    if (r.uf) porUf[r.uf] = (porUf[r.uf] ?? 0) + 1;
    if (new Date(r.created_at).getTime() >= limite) ultimos30 += 1;
  }

  const { data: log } = await supabaseAdmin
    .from("query_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: recentes } = await supabaseAdmin
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: consultas } = await supabaseAdmin
    .from("query_log")
    .select("id", { count: "exact", head: true });

  return {
    total: total ?? 0,
    ultimos30,
    consultas: consultas ?? 0,
    porStatus,
    topUf: Object.entries(porUf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([uf, qtd]) => ({ uf, qtd })),
    log: (log ?? []) as unknown as QueryLogEntry[],
    recentes: (recentes ?? []).map((r) => asCompany(r as Row)),
  };
}

export async function exportarCsv(input: { status?: string; uf?: string; listId?: string; busca?: string }) {
  const { empresas } = await listarEmpresas({ ...input, page: 1, perPage: 100 });
  return empresas;
}

export { db };
