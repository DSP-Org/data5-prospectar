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

type Row = Record<string, unknown>;

function asCompany(row: Row): Company {
  return row as unknown as Company;
}

async function logQuery(entry: {
  tipo: string;
  entrada: string;
  resultado: string;
  mensagem?: string | null | undefined;
  quantidade?: number | undefined;
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
  listId?: string | null | undefined;
  salvar?: boolean | undefined;
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
  site?: string | undefined;
  email?: string | undefined;
  listId?: string | null | undefined;
  salvar?: boolean | undefined;
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
  busca?: string | undefined;
  status?: string | undefined;
  uf?: string | undefined;
  listId?: string | undefined;
  // filtros avançados abaixo
  cidade?: string | undefined;
  bairro?: string | undefined;
  cnae?: string | undefined;
  porte?: string | undefined;
  situacao?: string | undefined;
  naturezaJuridica?: string | undefined;
  setor?: string | undefined;
  comTelefone?: boolean | undefined;
  comEmail?: boolean | undefined;
  comSite?: boolean | undefined;
  comDecisor?: boolean | undefined;
  capitalMin?: number | undefined;
  capitalMax?: number | undefined;
  aberturaDe?: string | undefined;
  aberturaAte?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
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
  if (input.listId === "sem_lista") q = q.is("list_id", null);
  else if (input.listId && input.listId !== "todas") q = q.eq("list_id", input.listId);
  if (input.cidade?.trim()) q = q.ilike("cidade", `%${input.cidade.trim()}%`);
  if (input.bairro?.trim()) q = q.ilike("bairro", `%${input.bairro.trim()}%`);
  if (input.cnae?.trim()) {
    const t = input.cnae.trim();
    q = q.or(`cnae_codigo.ilike.%${t}%,cnae_descricao.ilike.%${t}%`);
  }
  if (input.porte && input.porte !== "todos") q = q.eq("porte_estimado", input.porte);
  if (input.situacao && input.situacao !== "todas") q = q.ilike("situacao", input.situacao);
  if (input.naturezaJuridica?.trim())
    q = q.ilike("natureza_juridica", `%${input.naturezaJuridica.trim()}%`);
  if (input.setor?.trim()) q = q.contains("setores", [input.setor.trim()]);
  if (input.comTelefone) q = q.not("melhor_telefone", "is", null);
  if (input.comSite) q = q.not("melhor_site", "is", null);
  if (input.comEmail) q = q.not("email_receita", "is", null);
  if (input.comDecisor) q = q.neq("decisores", "[]");
  if (typeof input.capitalMin === "number") q = q.gte("capital_social", input.capitalMin);
  if (typeof input.capitalMax === "number") q = q.lte("capital_social", input.capitalMax);
  if (input.aberturaDe) q = q.gte("data_abertura", input.aberturaDe);
  if (input.aberturaAte) q = q.lte("data_abertura", input.aberturaAte);

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

function chave(cnpj: string) {
  return formatCnpjApi(cnpj) ?? cnpj;
}

export async function obterEmpresa(cnpj: string) {
  const { data, error } = await supabaseAdmin.from("companies").select("*").eq("cnpj", chave(cnpj)).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asCompany(data as Row) : null;
}

export async function atualizarEmpresa(input: {
  cnpj: string;
  status?: Status | undefined;
  notas?: string | undefined;
  listId?: string | null | undefined;
  tags?: string[] | undefined;
}) {
  const patch: Row = {};
  if (input.status) patch["status"] = input.status;
  if (input.notas !== undefined) patch["notas"] = input.notas;
  if (input.listId !== undefined) patch["list_id"] = input.listId;
  if (input.tags) patch["tags"] = input.tags;
  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(patch as never)
    .eq("cnpj", chave(input.cnpj))
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asCompany(data as Row) : null;
}

export async function vincularEmpresasLista(cnpjs: string[], listId: string | null) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { ok: true, total: 0 };
  const { error } = await supabaseAdmin
    .from("companies")
    .update({ list_id: listId } as never)
    .in("cnpj", chaves);
  if (error) throw new Error(error.message);
  return { ok: true, total: chaves.length };
}

export async function excluirEmpresa(cnpj: string) {
  const { error } = await supabaseAdmin.from("companies").delete().eq("cnpj", chave(cnpj));
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listarListas(): Promise<CompanyList[]> {
  const { data, error } = await supabaseAdmin
    .from("company_lists")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: rows } = await supabaseAdmin.from("companies").select("list_id");
  const contagem: Record<string, number> = {};
  for (const r of (rows ?? []) as Array<{ list_id: string | null }>) {
    const k = r.list_id ?? "sem_lista";
    contagem[k] = (contagem[k] ?? 0) + 1;
  }

  return ((data ?? []) as unknown as CompanyList[]).map((l) => ({
    ...l,
    total: contagem[l.id] ?? 0,
  }));
}

/** Quantidade de empresas ainda sem lista. */
export async function contarSemLista() {
  const { count } = await supabaseAdmin
    .from("companies")
    .select("cnpj", { count: "exact", head: true })
    .is("list_id", null);
  return count ?? 0;
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

export async function exportarEmpresas(input: {
  status?: string | undefined;
  uf?: string | undefined;
  listId?: string | undefined;
  busca?: string | undefined;
}) {
  const out: Company[] = [];
  for (let page = 1; page <= 40; page += 1) {
    const { empresas } = await listarEmpresas({ ...input, page, perPage: 100 });
    out.push(...empresas);
    if (empresas.length < 100) break;
  }
  return out;
}

/** Consulta em lote por chaves misturadas (site, e-mail ou CNPJ). */
export async function consultarChaves(input: {
  chaves: string[];
  listId?: string | null | undefined;
}): Promise<{ itens: LookupItem[] }> {
  const vistos = new Set<string>();
  const chaves = input.chaves
    .map((c) => c.trim())
    .filter((c) => c && !vistos.has(c.toLowerCase()) && vistos.add(c.toLowerCase()));

  const cnpjs = chaves.filter((c) => formatCnpjApi(c));
  const outros = chaves.filter((c) => !formatCnpjApi(c));

  const itens: LookupItem[] = [];
  if (cnpjs.length) {
    const r = await consultarCnpjs({ cnpjs, listId: input.listId ?? null });
    itens.push(...r.itens);
  }
  for (const chaveTxt of outros.slice(0, 50)) {
    const ehEmail = chaveTxt.includes("@");
    const item = await consultarChave(
      ehEmail
        ? { email: chaveTxt, listId: input.listId ?? null }
        : { site: chaveTxt.replace(/^https?:\/\//i, "").replace(/\/.*$/, ""), listId: input.listId ?? null },
    );
    itens.push({ ...item, cnpj: item.encontrada ? item.cnpj : chaveTxt });
  }
  return { itens };
}

/** Valores distintos existentes na base, para alimentar os filtros da busca avançada. */
export async function opcoesFiltro() {
  const { data } = await supabaseAdmin
    .from("companies")
    .select("uf, cidade, porte_estimado, situacao, setores")
    .limit(5000);
  const ufs = new Set<string>();
  const cidades = new Set<string>();
  const portes = new Set<string>();
  const situacoes = new Set<string>();
  const setores = new Set<string>();
  for (const r of (data ?? []) as Array<{
    uf: string | null;
    cidade: string | null;
    porte_estimado: string | null;
    situacao: string | null;
    setores: string[] | null;
  }>) {
    if (r.uf) ufs.add(r.uf);
    if (r.cidade) cidades.add(r.cidade);
    if (r.porte_estimado) portes.add(r.porte_estimado);
    if (r.situacao) situacoes.add(r.situacao);
    for (const s of r.setores ?? []) if (s) setores.add(s);
  }
  const ord = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return {
    ufs: ord(ufs),
    cidades: ord(cidades).slice(0, 300),
    portes: ord(portes),
    situacoes: ord(situacoes),
    setores: ord(setores).slice(0, 200),
  };
}

/** Lê o status da chave da API Econodata salva no banco. Nunca retorna o valor completo. */
export async function obterStatusChaveApi() {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "econodata_api_key")
    .maybeSingle();

  if (error) throw new Error(error.message);

  const value = data?.value ?? "";
  const env = process.env["ECONODATA_API_KEY"] ?? "";
  const configured = Boolean(env || value);
  const source = value ? "database" : env ? "env" : "none";
  const active = value || env;
  const masked = active ? "••••••••••••••••" + active.slice(-4) : null;

  return { configured, source, masked };
}

/** Salva a chave da API Econodata no banco. */
export async function salvarChaveApi(key: string) {
  const { error } = await supabaseAdmin.from("app_settings").upsert(
    { key: "econodata_api_key", value: key } as never,
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Migra a chave da variável de ambiente para o banco, quando disponível. */
export async function migrarChaveDoAmbiente() {
  const env = process.env["ECONODATA_API_KEY"];
  if (!env) throw new Error("Nenhuma chave encontrada nas variáveis de ambiente.");
  await salvarChaveApi(env);
  return { ok: true, integracao: null };
}

/** Testa uma chave candidata contra a Econodata sem persisti-la. */
export async function testarChaveApi(key: string) {
  const { validarToken } = await import("./econodata.server");
  try {
    const info = await validarToken(key);
    return { ok: true as const, cliente: info?.cd_cliente ?? null, integracao: info?.nm_integracao ?? null };
  } catch (e) {
    const err = e as EconodataError;
    return { ok: false as const, erro: err.message ?? "Falha desconhecida", status: err.status ?? 0 };
  }
}
