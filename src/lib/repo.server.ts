import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mapCompany } from "./company-mapper.server";
import {
  buscarPorChave,
  EconodataError,
  formatCnpjApi,
  validarToken,
} from "./econodata.server";
import { buscarMultiFonte } from "./sources/registry.server";
import { type Escopo, unidadeDeGravacao, unidadesFiltro } from "./escopo.server";
import type { ActivityType, Company, CompanyList, LookupItem, ProspectionActivity, QueryLogEntry, Status } from "./types";


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

type Persistivel = ReturnType<typeof mapCompany> | Record<string, unknown>;

async function persistir(mapped: Persistivel[], listId: string | null, unitId: string | null) {
  if (mapped.length === 0) return [] as Company[];
  // Mantém a unidade já existente da empresa; só define unidade para registros novos.
  const cnpjs = mapped.map((m) => String((m as Record<string, unknown>)["cnpj"] ?? ""));
  const { data: existentes } = await supabaseAdmin
    .from("companies")
    .select("cnpj, unit_id")
    .in("cnpj", cnpjs);
  const unidadeAtual = new Map<string, string | null>(
    ((existentes ?? []) as Array<{ cnpj: string; unit_id: string | null }>).map((r) => [r.cnpj, r.unit_id]),
  );
  const payload = mapped.map((m) => {
    const cnpj = String((m as Record<string, unknown>)["cnpj"] ?? "");
    const unit = unidadeAtual.get(cnpj) ?? unitId;
    return { ...(m as Record<string, unknown>), ...(listId ? { list_id: listId } : {}), unit_id: unit };
  });
  const { data, error } = await supabaseAdmin
    .from("companies")
    .upsert(payload as never, { onConflict: "cnpj" })
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => asCompany(r as Row));
}


export async function consultarCnpjs(input: {
  escopo: Escopo;
  unitId?: string | null | undefined;
  cnpjs: string[];
  listId?: string | null | undefined;
  salvar?: boolean | undefined;
  /** Ignora o cache local e reconsulta as fontes. */
  forcar?: boolean | undefined;
  /** Busca máxima: todas as fontes, dados em tempo real e módulos extras. */
  completo?: boolean | undefined;

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

  // Empresas que já estão na base não vão para as fontes (não gasta crédito).
  // "Buscar tudo" / reconsulta forçada ignoram esse atalho.
  let aConsultar = validos;
  if (!input.forcar && !input.completo) {
    const { data: jaNaBase } = await supabaseAdmin
      .from("companies")
      .select("*")
      .in("cnpj", validos);
    const existentes = ((jaNaBase ?? []) as Row[]).map(asCompany);
    if (existentes.length) {
      const idsExistentes = new Set(existentes.map((c) => c.cnpj));
      aConsultar = validos.filter((c) => !idsExistentes.has(c));
      // Se houver lista de destino, apenas vincula sem reconsultar as fontes.
      if (input.listId && input.salvar !== false) {
        await supabaseAdmin
          .from("companies")
          .update({ list_id: input.listId } as never)
          .in("cnpj", Array.from(idsExistentes));
      }
      for (const c of existentes)
        itens.push({
          cnpj: c.cnpj,
          encontrada: true,
          company: input.listId ? { ...c, list_id: input.listId } : c,
          salva: true,
        });
    }
  }

  if (aConsultar.length === 0) return { itens };

  const encontradas: Record<string, unknown>[] = [];
  try {
    const { empresas, falhas } = await buscarMultiFonte(aConsultar, {
      forcar: input.forcar,
      completo: input.completo,
    });


    for (const c of validos) {
      const m = empresas.get(c);
      if (m) encontradas.push(m as unknown as Record<string, unknown>);
      else
        itens.push({
          cnpj: c,
          encontrada: false,
          erro: falhas.length
            ? `Não encontrada. Falhas: ${falhas.map((f) => `${f.fonte}: ${f.erro}`).join(" | ")}`
            : "Não encontrada nas fontes ativas.",
          salva: false,
        });
    }
  } catch (e) {
    const err = e as EconodataError;
    for (const c of validos) itens.push({ cnpj: c, encontrada: false, erro: err.message, salva: false });
    await logQuery({
      tipo: "cnpj",
      entrada: validos.join(", "),
      resultado: "erro",
      mensagem: err.message,
      quantidade: 0,
    });
  }

  const salvar = input.salvar !== false;
  let salvas: Company[] = [];
  if (salvar) salvas = await persistir(encontradas, input.listId ?? null, unidadeDeGravacao(input.escopo, input.unitId));

  for (const m of encontradas) {
    const cnpj = String(m["cnpj"]);
    const salva = salvas.find((s) => s.cnpj === cnpj);
    itens.push({
      cnpj,
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
  escopo: Escopo;
  unitId?: string | null | undefined;
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
    // Enriquece com as demais fontes ativas usando o CNPJ encontrado.
    let final: Record<string, unknown> = {
      ...(mapped as unknown as Record<string, unknown>),
      fonte_principal: "econodata",
      fontes: ["econodata"],
    };
    try {
      // Respeita cache/TTL e Modo Econômico para não gastar crédito à toa.
      const { empresas } = await buscarMultiFonte([mapped.cnpj]);
      const m = empresas.get(mapped.cnpj);
      if (m) final = m as unknown as Record<string, unknown>;
    } catch {
      /* mantém apenas o resultado da Econodata */
    }
    const salvar = input.salvar !== false;
    const salvas = salvar ? await persistir([final], input.listId ?? null, unidadeDeGravacao(input.escopo, input.unitId)) : [];

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
  escopo: Escopo;
  busca?: string | undefined;
  status?: string | undefined;
  uf?: string | undefined;
  listId?: string | undefined;
  productId?: string | undefined;
  // filtros avançados abaixo
  cidade?: string | undefined;
  bairro?: string | undefined;
  cnae?: string | undefined;
  porte?: string | undefined;
  situacao?: string | undefined;
  naturezaJuridica?: string | undefined;
  grupoNatureza?: string | undefined;
  setor?: string | undefined;
  comTelefone?: boolean | undefined;
  comEmail?: boolean | undefined;
  comSite?: boolean | undefined;
  comDecisor?: boolean | undefined;
  capitalMin?: number | undefined;
  capitalMax?: number | undefined;
  aberturaDe?: string | undefined;
  aberturaAte?: string | undefined;
  prospectar?: boolean | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}) {
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(100, input.perPage ?? 25);
  // A base de empresas pertence ao sistema: não é filtrada pela unidade ativa.
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
  if (input.productId === "sem_produto") q = q.is("product_id", null);
  else if (input.productId && input.productId !== "todos") q = q.eq("product_id", input.productId);
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
  if (input.grupoNatureza && input.grupoNatureza !== "todas")
    q = q.ilike("natureza_juridica", `${input.grupoNatureza}%`);
  if (input.setor?.trim()) q = q.contains("setores", [input.setor.trim()]);
  if (input.comTelefone) q = q.not("melhor_telefone", "is", null);
  if (input.comSite) q = q.not("melhor_site", "is", null);
  if (input.comEmail) q = q.not("email_receita", "is", null);
  if (input.comDecisor) q = q.neq("decisores", "[]");
  if (typeof input.capitalMin === "number") q = q.gte("capital_social", input.capitalMin);
  if (typeof input.capitalMax === "number") q = q.lte("capital_social", input.capitalMax);
  if (input.aberturaDe) q = q.gte("data_abertura", input.aberturaDe);
  if (input.aberturaAte) q = q.lte("data_abertura", input.aberturaAte);
  if (typeof input.prospectar === "boolean") q = q.eq("prospectar", input.prospectar);

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

export async function obterEmpresa(cnpj: string, _escopo: Escopo) {
  const q = supabaseAdmin.from("companies").select("*").eq("cnpj", chave(cnpj));
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asCompany(data as Row) : null;
}


export async function atualizarEmpresa(input: {
  escopo: Escopo;
  cnpj: string;
  status?: Status | undefined;
  notas?: string | undefined;
  listId?: string | null | undefined;
  productId?: string | null | undefined;
  tags?: string[] | undefined;
  prospectar?: boolean | undefined;
}) {
  const patch: Row = {};
  if (input.status) patch["status"] = input.status;
  if (input.notas !== undefined) patch["notas"] = input.notas;
  if (input.listId !== undefined) patch["list_id"] = input.listId;
  if (input.productId !== undefined) patch["product_id"] = input.productId;
  if (input.tags) patch["tags"] = input.tags;
  if (input.prospectar !== undefined) patch["prospectar"] = input.prospectar;
  const uq = supabaseAdmin.from("companies").update(patch as never).eq("cnpj", chave(input.cnpj));
  const { data, error } = await uq.select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asCompany(data as Row) : null;
}

/** Marca/desmarca empresas como "prospectar" (clientes potenciais). */
export async function marcarProspectar(cnpjs: string[], valor: boolean, _escopo: Escopo) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { ok: true, total: 0 };
  const { error } = await supabaseAdmin
    .from("companies")
    .update({ prospectar: valor } as never)
    .in("cnpj", chaves);
  if (error) throw new Error(error.message);
  return { ok: true, total: chaves.length };
}

export async function vincularEmpresasLista(cnpjs: string[], listId: string | null, _escopo: Escopo) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { ok: true, total: 0 };
  const q = supabaseAdmin.from("companies").update({ list_id: listId } as never).in("cnpj", chaves);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true, total: chaves.length };
}

export async function excluirEmpresa(cnpj: string, _escopo: Escopo) {
  const q = supabaseAdmin.from("companies").delete().eq("cnpj", chave(cnpj));
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}


export async function listarListas(escopo: Escopo): Promise<CompanyList[]> {
  const unidades = unidadesFiltro(escopo);
  let lq = supabaseAdmin.from("company_lists").select("*").order("created_at", { ascending: true });
  if (unidades) lq = lq.in("unit_id", unidades);
  const { data, error } = await lq;
  if (error) throw new Error(error.message);

  // Contagem sobre a base do sistema (sem filtro de unidade); as listas é que pertencem à unidade.
  const cq = supabaseAdmin.from("companies").select("list_id");
  const { data: rows } = await cq;
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
export async function contarSemLista(_escopo: Escopo) {
  const q = supabaseAdmin.from("companies").select("cnpj", { count: "exact", head: true }).is("list_id", null);

  const { count } = await q;
  return count ?? 0;
}

export async function criarLista(name: string, color: string, escopo: Escopo, unitId?: string | null) {
  const { data, error } = await supabaseAdmin
    .from("company_lists")
    .insert({ name, color, unit_id: unidadeDeGravacao(escopo, unitId) } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CompanyList;
}

export async function excluirLista(id: string, escopo: Escopo) {
  let q = supabaseAdmin.from("company_lists").delete().eq("id", id);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function obterPainel(_escopo: Escopo) {
  // Painel reflete a base de empresas do sistema, sem recorte por unidade.
  const escopar = <T,>(q: T): T => q;

  const { count: total } = await escopar(
    supabaseAdmin.from("companies").select("cnpj", { count: "exact", head: true }),
  );

  const { data: statusRows } = await escopar(supabaseAdmin.from("companies").select("status, uf, created_at"));

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

  const { data: recentes } = await escopar(supabaseAdmin.from("companies").select("*"))
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
  escopo: Escopo;
  status?: string | undefined;
  uf?: string | undefined;
  listId?: string | undefined;
  busca?: string | undefined;
  grupoNatureza?: string | undefined;
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
  escopo: Escopo;
  unitId?: string | null | undefined;
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
    const r = await consultarCnpjs({ escopo: input.escopo, unitId: input.unitId, cnpjs, listId: input.listId ?? null });
    itens.push(...r.itens);
  }
  for (const chaveTxt of outros.slice(0, 50)) {
    const ehEmail = chaveTxt.includes("@");
    const item = await consultarChave(
      ehEmail
        ? { escopo: input.escopo, unitId: input.unitId, email: chaveTxt, listId: input.listId ?? null }
        : {
            escopo: input.escopo,
            unitId: input.unitId,
            site: chaveTxt.replace(/^https?:\/\//i, "").replace(/\/.*$/, ""),
            listId: input.listId ?? null,
          },
    );
    itens.push({ ...item, cnpj: item.encontrada ? item.cnpj : chaveTxt });
  }
  return { itens };
}

/** Valores distintos existentes na base, para alimentar os filtros da busca avançada. */
export async function opcoesFiltro(_escopo: Escopo) {
  const q = supabaseAdmin.from("companies").select("uf, cidade, porte_estimado, situacao, setores");

  const { data } = await q.limit(5000);
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

// =============================================================================
// Atividades de prospecção
// =============================================================================

export type ActivityInput = {
  company_cnpj: string;
  tipo: ActivityType;
  observacao?: string | undefined;
  responsavel?: string | null | undefined;
  scheduled_at?: string | null | undefined;
  completed_at?: string | null | undefined;
  product_id?: string | null | undefined;
};

function asActivity(row: Row): ProspectionActivity {
  return row as unknown as ProspectionActivity;
}

export async function listarAtividades(input: {
  escopo: Escopo;
  cnpj?: string | undefined;
  tipo?: string | undefined;
  de?: string | undefined;
  ate?: string | undefined;
  responsavel?: string | undefined;
  pendente?: boolean | undefined;
  productId?: string | undefined;
  limit?: number | undefined;
}) {
  let q = supabaseAdmin.from("prospection_activities").select("*").order("created_at", { ascending: false });
  const unidades = unidadesFiltro(input.escopo);
  if (unidades) q = q.in("unit_id", unidades);
  if (input.cnpj) q = q.eq("company_cnpj", chave(input.cnpj));
  if (input.tipo && input.tipo !== "todos") q = q.eq("tipo", input.tipo);
  if (input.de) q = q.gte("created_at", input.de);
  if (input.ate) q = q.lte("created_at", `${input.ate}T23:59:59`);
  if (input.responsavel?.trim()) q = q.ilike("responsavel", `%${input.responsavel.trim()}%`);
  if (input.pendente) q = q.is("completed_at", null);
  if (input.productId === "sem_produto") q = q.is("product_id", null);
  else if (input.productId && input.productId !== "todos") q = q.eq("product_id", input.productId);
  if (input.limit) q = q.limit(input.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => asActivity(r as Row));
}

export async function criarAtividade(input: ActivityInput, escopo: Escopo) {
  const empresa = await obterEmpresa(input.company_cnpj, escopo);
  if (!empresa) throw new Error("Empresa não encontrada nas suas unidades.");
  const payload: Row = {
    unit_id: (empresa as unknown as { unit_id: string | null }).unit_id ?? escopo.unidadeAtiva,
    company_cnpj: chave(input.company_cnpj),
    tipo: input.tipo,
    observacao: input.observacao ?? "",
    responsavel: input.responsavel ?? null,
    scheduled_at: input.scheduled_at ?? null,
    completed_at: input.completed_at ?? null,
    product_id: input.product_id ?? (empresa as unknown as { product_id: string | null }).product_id ?? null,
  };
  const { data, error } = await supabaseAdmin.from("prospection_activities").insert(payload as never).select("*").single();
  if (error) throw new Error(error.message);
  return asActivity(data as Row);
}

export async function atualizarAtividade(
  id: string,
  patch: Partial<Omit<ActivityInput, "company_cnpj" | "tipo">>,
  escopo: Escopo,
) {
  const payload: Row = {};
  if (patch.observacao !== undefined) payload["observacao"] = patch.observacao;
  if (patch.responsavel !== undefined) payload["responsavel"] = patch.responsavel;
  if (patch.scheduled_at !== undefined) payload["scheduled_at"] = patch.scheduled_at ?? null;
  if (patch.completed_at !== undefined) payload["completed_at"] = patch.completed_at ?? null;
  if (patch.product_id !== undefined) payload["product_id"] = patch.product_id ?? null;
  if (Object.keys(payload).length === 0) return null;
  let uq = supabaseAdmin.from("prospection_activities").update(payload as never).eq("id", id);
  const unidadesUp = unidadesFiltro(escopo);
  if (unidadesUp) uq = uq.in("unit_id", unidadesUp);
  const { data, error } = await uq.select("*").single();
  if (error) throw new Error(error.message);
  return data ? asActivity(data as Row) : null;
}


export async function excluirAtividade(id: string, escopo: Escopo) {
  let q = supabaseAdmin.from("prospection_activities").delete().eq("id", id);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function obterUltimasAtividadesPorEmpresa(escopo: Escopo) {
  let q = supabaseAdmin
    .from("prospection_activities")
    .select("company_cnpj, tipo, created_at, completed_at");
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const map = new Map<string, { tipo: ActivityType; created_at: string }>();
  for (const r of (data ?? []) as Array<{ company_cnpj: string; tipo: ActivityType; created_at: string }>) {
    if (!map.has(r.company_cnpj)) map.set(r.company_cnpj, { tipo: r.tipo, created_at: r.created_at });
  }
  return map;
}

export async function funilDados(escopo: Escopo) {
  let q = supabaseAdmin.from("companies").select("*").eq("prospectar", true);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  const empresas = (data ?? []).map((r) => asCompany(r as Row));
  const ultimas = await obterUltimasAtividadesPorEmpresa(escopo);
  return {
    empresas,
    ultimas: Object.fromEntries(
      Array.from(ultimas.entries()).map(([k, v]) => [k, v]),
    ) as Record<string, { tipo: ActivityType; created_at: string }>,
  };
}

export async function relatorioAtividades(input: { escopo: Escopo; de?: string | undefined; ate?: string | undefined }) {
  const atividades = await listarAtividades({ escopo: input.escopo, de: input.de, ate: input.ate, limit: 10000 });
  const porTipo: Record<string, number> = {};
  const porDia: Record<string, number> = {};
  let pendentes = 0;
  let concluidas = 0;
  for (const a of atividades) {
    porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
    const dia = a.created_at.slice(0, 10);
    porDia[dia] = (porDia[dia] ?? 0) + 1;
    if (a.completed_at) concluidas += 1;
    else pendentes += 1;
  }
  const dias = Object.keys(porDia).sort();
  return { total: atividades.length, porTipo, porDia, dias, pendentes, concluidas };
}

