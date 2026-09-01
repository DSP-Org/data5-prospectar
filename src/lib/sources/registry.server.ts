// Orquestrador multi-fonte: lê configuração, consulta as fontes ativas e mescla.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADAPTERS, type FetchOpts, type LoteResultado } from "./adapters.server";
import {
  DEFAULT_PRIORITY,
  MODULOS_CNPJA_PADRAO,
  SOURCES,
  type EconomiaConfig,
  type ModoConsulta,
  type ModulosCnpja,
  type SourceConfig,
  type SourceId,
} from "./catalog";
import { mesclar, type EmpresaMesclada, type EntradaFonte } from "./merge.server";

const LEGACY_ECONODATA_KEY = "econodata_api_key";

const keyKey = (id: SourceId) => (id === "econodata" ? LEGACY_ECONODATA_KEY : `source_${id}_key`);
const enabledKey = (id: SourceId) => `source_${id}_enabled`;
const PRIORITY_KEY = "sources_priority";
const MODE_KEY = "sources_modo";
const TTL_KEY = "sources_cache_ttl_dias";
/** Trava global de custo: nenhuma consulta pode debitar crédito. */
const SOMENTE_GRATIS_KEY = "sources_somente_gratis";
const moduloKey = (id: keyof ModulosCnpja) => `cnpja_modulo_${id}`;



type Settings = Record<string, string>;

async function lerSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin.from("app_settings").select("key,value");
  if (error) throw new Error(error.message);
  const out: Settings = {};
  for (const r of (data ?? []) as Array<{ key: string; value: string }>) out[r.key] = r.value;
  return out;
}

async function gravar(key: string, value: string) {
  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ key, value } as never, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

function chaveDaFonte(id: SourceId, s: Settings): string | null {
  const v = s[keyKey(id)];
  if (v) return v;
  if (id === "econodata") return process.env["ECONODATA_API_KEY"] ?? null;
  return null;
}

function ativa(id: SourceId, s: Settings, temChave: boolean) {
  const meta = SOURCES.find((m) => m.id === id)!;
  const flag = s[enabledKey(id)];
  const on = flag === undefined ? meta.defaultEnabled : flag === "true";
  if (!on) return false;
  if (meta.requiresKey && !temChave) return false;
  return true;
}

export function ordemPrioridade(s: Settings): SourceId[] {
  const salvo = (s[PRIORITY_KEY] ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is SourceId => DEFAULT_PRIORITY.includes(v as SourceId));
  const faltando = DEFAULT_PRIORITY.filter((id) => !salvo.includes(id));
  return [...salvo, ...faltando];
}

function mascarar(v: string | null) {
  return v ? "••••••••••••" + v.slice(-4) : null;
}

/** Modo de consulta e validade do cache. */
export function economiaDe(s: Settings): EconomiaConfig {
  const modo: ModoConsulta = s[MODE_KEY] === "completo" ? "completo" : "economico";
  const ttl = Number(s[TTL_KEY] ?? "30");
  return {
    modo,
    ttlDias: Number.isFinite(ttl) && ttl >= 0 ? Math.min(ttl, 365) : 30,
    somenteGratis: s[SOMENTE_GRATIS_KEY] === "true",
  };
}

/** A trava de custo está ligada? (usada também fora da orquestração) */
export async function somenteGratisAtivo(): Promise<boolean> {
  const s = await lerSettings();
  return s[SOMENTE_GRATIS_KEY] === "true";
}

/** Registra consultas que consumiram crédito de fonte paga. */
async function registrarConsumo(
  cnpjs: string[],
  fontes: SourceId[],
  origem: string,
  unitId?: string | null,
) {
  if (cnpjs.length === 0 || fontes.length === 0) return;
  const fonte = fontes.join("+");
  const linhas = cnpjs.map((cnpj) => ({
    fonte,
    cnpj,
    origem,
    unit_id: unitId ?? null,
    creditos: 1,
  }));
  await supabaseAdmin.from("consumo_consultas").insert(linhas as never);
}

export type ResumoConsumo = {
  hoje: number;
  mes: number;
  total: number;
  porFonte: Array<{ fonte: string; qtd: number }>;
  porOrigem: Array<{ origem: string; qtd: number }>;
  ultimos: Array<{ cnpj: string; fonte: string; origem: string; created_at: string }>;
};

/** Agregados de consumo pago para o painel de Configurações. */
export async function resumoConsumo(): Promise<ResumoConsumo> {
  const { data } = await supabaseAdmin
    .from("consumo_consultas")
    .select("cnpj,fonte,origem,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  const linhas = (data ?? []) as Array<{
    cnpj: string;
    fonte: string;
    origem: string;
    created_at: string;
  }>;
  const agora = new Date();
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const contar = (campo: "fonte" | "origem") => {
    const m = new Map<string, number>();
    for (const l of linhas) m.set(l[campo], (m.get(l[campo]) ?? 0) + 1);
    return [...m.entries()]
      .map(([k, qtd]) => ({ [campo]: k, qtd }))
      .sort((a, b) => b.qtd - a.qtd) as never[];
  };
  return {
    hoje: linhas.filter((l) => l.created_at >= inicioDia).length,
    mes: linhas.filter((l) => l.created_at >= inicioMes).length,
    total: linhas.length,
    porFonte: contar("fonte"),
    porOrigem: contar("origem"),
    ultimos: linhas.slice(0, 10),
  };
}

/** Módulos adicionais da CNPJá configurados pelo master. */
export function modulosCnpjaDe(s: Settings): ModulosCnpja {
  const out = { ...MODULOS_CNPJA_PADRAO };
  for (const id of Object.keys(MODULOS_CNPJA_PADRAO) as Array<keyof ModulosCnpja>) {
    out[id] = s[moduloKey(id)] === "true";
  }
  return out;
}

/** Configuração das fontes para a tela de Configurações. */
export async function listarFontes(): Promise<{
  fontes: SourceConfig[];
  prioridade: SourceId[];
  economia: EconomiaConfig;
  modulosCnpja: ModulosCnpja;
}> {
  const s = await lerSettings();
  const prioridade = ordemPrioridade(s);
  const fontes = prioridade.map((id) => {
    const meta = SOURCES.find((m) => m.id === id)!;
    const chave = chaveDaFonte(id, s);
    return {
      id: meta.id,
      label: meta.label,
      descricao: meta.descricao,
      requiresKey: meta.requiresKey,
      contatos: meta.contatos,
      custo: meta.custo,
      enabled: ativa(id, s, Boolean(chave)),
      hasKey: Boolean(chave),
      maskedKey: mascarar(chave),
    } satisfies SourceConfig;
  });
  return { fontes, prioridade, economia: economiaDe(s), modulosCnpja: modulosCnpjaDe(s) };
}

export async function salvarFonte(input: {
  id: SourceId;
  key?: string | null | undefined;
  enabled?: boolean | undefined;
}) {
  if (input.key !== undefined) {
    if (input.key === null || input.key === "") await gravar(keyKey(input.id), "");
    else await gravar(keyKey(input.id), input.key);
  }
  if (input.enabled !== undefined) await gravar(enabledKey(input.id), input.enabled ? "true" : "false");
  return { ok: true };
}

export async function salvarModulosCnpja(input: { [K in keyof ModulosCnpja]?: boolean | undefined }) {
  for (const [id, valor] of Object.entries(input)) {
    if (valor === undefined) continue;
    await gravar(moduloKey(id as keyof ModulosCnpja), valor ? "true" : "false");
  }
  return { ok: true };
}

export async function salvarEconomia(input: {
  modo?: ModoConsulta | undefined;
  ttlDias?: number | undefined;
  somenteGratis?: boolean | undefined;
}) {
  if (input.modo) await gravar(MODE_KEY, input.modo);
  if (input.ttlDias !== undefined) await gravar(TTL_KEY, String(Math.max(0, Math.min(365, Math.round(input.ttlDias)))));
  if (input.somenteGratis !== undefined)
    await gravar(SOMENTE_GRATIS_KEY, input.somenteGratis ? "true" : "false");
  return { ok: true };
}


export async function salvarPrioridade(ordem: SourceId[]) {
  const limpa = ordem.filter((id) => DEFAULT_PRIORITY.includes(id));
  await gravar(PRIORITY_KEY, limpa.join(","));
  return { ok: true };
}

export async function testarFonte(id: SourceId, key?: string | null) {
  const s = await lerSettings();
  const chave = key && key.trim() ? key.trim() : chaveDaFonte(id, s);
  return ADAPTERS[id].testar(chave);
}

export type ResultadoMultiFonte = {
  empresas: Map<string, EmpresaMesclada>;
  falhas: Array<{ fonte: SourceId; erro: string }>;
  fontesUsadas: SourceId[];
  /** CNPJs atendidos pelo cache local, sem consultar fonte externa. */
  doCache: string[];
  /** CNPJs que consumiram fonte paga. */
  pagasUsadas: string[];
};

function temContato(e: EmpresaMesclada | undefined) {
  if (!e) return false;
  const r = e as unknown as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(r[k]) ? (r[k] as unknown[]).length > 0 : false);
  return arr("telefones") || arr("emails") || arr("decisores") || Boolean(r["melhor_telefone"]);
}

/** Busca no cache local as empresas sincronizadas dentro da validade. */
async function lerCache(cnpjs: string[], ttlDias: number) {
  const out = new Map<string, EmpresaMesclada>();
  if (ttlDias <= 0 || cnpjs.length === 0) return out;
  const limite = new Date(Date.now() - ttlDias * 86400000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .in("cnpj", cnpjs)
    .gte("synced_at", limite);
  if (error) return out;
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const cnpj = String(row["cnpj"] ?? "");
    if (cnpj) out.set(cnpj, row as unknown as EmpresaMesclada);
  }
  return out;
}

async function rodarFontes(
  ids: SourceId[],
  cnpjs: string[],
  s: Settings,
  destino: Map<SourceId, LoteResultado>,
  falhas: Array<{ fonte: SourceId; erro: string }>,
  opts?: FetchOpts,
) {
  if (ids.length === 0 || cnpjs.length === 0) return;
  await Promise.all(
    ids.map(async (id) => {
      try {
        destino.set(id, await ADAPTERS[id].fetchLote(cnpjs, chaveDaFonte(id, s), opts));
      } catch (e) {
        falhas.push({ fonte: id, erro: e instanceof Error ? e.message : "Falha desconhecida." });
      }
    }),
  );
}

function mesclarTodos(
  cnpjs: string[],
  prioridade: SourceId[],
  resultados: Map<SourceId, LoteResultado>,
) {
  const empresas = new Map<string, EmpresaMesclada>();
  for (const cnpj of cnpjs) {
    const entradas: EntradaFonte[] = [];
    for (const id of prioridade) {
      const dados = resultados.get(id)?.get(cnpj);
      if (dados) entradas.push({ fonte: id, dados });
    }
    const mesclada = mesclar(cnpj, entradas);
    if (mesclada) empresas.set(cnpj, mesclada);
  }
  return empresas;
}

/**
 * Consulta as fontes ativas e mescla por CNPJ.
 * No modo econômico, as fontes gratuitas vêm primeiro e as pagas só são
 * acionadas para os CNPJs que ficaram sem contato (telefone/e-mail/decisor).
 * O cache local evita reconsultar empresas sincronizadas recentemente.
 */
export async function buscarMultiFonte(
  cnpjs: string[],
  opts?: {
    forcar?: boolean | undefined;
    modo?: ModoConsulta | undefined;
    /** Busca máxima: ignora cache, consulta online e liga todos os módulos da CNPJá. */
    completo?: boolean | undefined;
    /** De onde veio a consulta (para o painel de consumo). */
    origem?: string | undefined;
    unitId?: string | null | undefined;
  },
): Promise<ResultadoMultiFonte> {
  const s = await lerSettings();
  const prioridade = ordemPrioridade(s);
  const ativas = prioridade.filter((id) => ativa(id, s, Boolean(chaveDaFonte(id, s))));
  const { modo: modoSalvo, ttlDias, somenteGratis } = economiaDe(s);
  // Com a trava de custo ligada, nada pode ir online: nem "buscar tudo".
  const buscaTotal = opts?.completo === true && !somenteGratis;
  const modo = somenteGratis ? "economico" : buscaTotal ? "completo" : (opts?.modo ?? modoSalvo);
  const forcar = (opts?.forcar === true || buscaTotal) && !somenteGratis;

  const empresas = new Map<string, EmpresaMesclada>();
  const doCache: string[] = [];
  if (!forcar) {
    const cache = await lerCache(cnpjs, ttlDias);
    for (const [cnpj, empresa] of cache) {
      empresas.set(cnpj, empresa);
      doCache.push(cnpj);
    }
  }

  const pendentes = cnpjs.filter((c) => !empresas.has(c));
  const falhas: Array<{ fonte: SourceId; erro: string }> = [];
  const resultados = new Map<SourceId, LoteResultado>();
  const gratis = ativas.filter((id) => SOURCES.find((m) => m.id === id)!.custo === "gratis");
  const pagas = ativas.filter((id) => SOURCES.find((m) => m.id === id)!.custo === "pago");
  const pagasUsadas: string[] = [];

  const fetchOpts: FetchOpts = {
    maxAgeDias: ttlDias > 0 ? ttlDias : 45,
    economico: modo === "economico" && !forcar,
    online: buscaTotal,
    somenteCache: somenteGratis,
    // "Buscar tudo" força consulta online, mas os módulos extras da CNPJá
    // continuam obedecendo os toggles de Configurações (cada um custa crédito).
    modulos: modulosCnpjaDe(s),
  };


  // Só conta como crédito gasto quando a fonte paga de fato retornou dados
  // e a trava de custo estava desligada (com ela, a fonte paga só lê cache).
  const contarPagas = (candidatos: string[]) => {
    if (somenteGratis) return;
    for (const cnpj of candidatos) {
      if (pagas.some((id) => resultados.get(id)?.get(cnpj))) pagasUsadas.push(cnpj);
    }
  };

  if (modo === "completo") {
    await rodarFontes(ativas, pendentes, s, resultados, falhas, fetchOpts);
    if (pagas.length) contarPagas(pendentes);
  } else {
    await rodarFontes(gratis, pendentes, s, resultados, falhas, fetchOpts);
    const parciais = mesclarTodos(pendentes, prioridade, resultados);
    const semContato = pendentes.filter((c) => !temContato(parciais.get(c)));
    if (pagas.length && semContato.length) {
      await rodarFontes(pagas, semContato, s, resultados, falhas, fetchOpts);
      contarPagas(semContato);
    }
  }

  for (const [cnpj, empresa] of mesclarTodos(pendentes, prioridade, resultados)) {
    empresas.set(cnpj, empresa);
  }

  return { empresas, falhas, fontesUsadas: ativas, doCache, pagasUsadas };
}
