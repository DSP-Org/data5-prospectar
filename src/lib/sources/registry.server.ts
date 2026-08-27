// Orquestrador multi-fonte: lê configuração, consulta as fontes ativas e mescla.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADAPTERS, type LoteResultado } from "./adapters.server";
import { DEFAULT_PRIORITY, SOURCES, type SourceConfig, type SourceId } from "./catalog";
import { mesclar, type EmpresaMesclada, type EntradaFonte } from "./merge.server";

const LEGACY_ECONODATA_KEY = "econodata_api_key";

const keyKey = (id: SourceId) => (id === "econodata" ? LEGACY_ECONODATA_KEY : `source_${id}_key`);
const enabledKey = (id: SourceId) => `source_${id}_enabled`;
const PRIORITY_KEY = "sources_priority";

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

/** Configuração das fontes para a tela de Configurações. */
export async function listarFontes(): Promise<{ fontes: SourceConfig[]; prioridade: SourceId[] }> {
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
      enabled: ativa(id, s, Boolean(chave)),
      hasKey: Boolean(chave),
      maskedKey: mascarar(chave),
    } satisfies SourceConfig;
  });
  return { fontes, prioridade };
}

export async function salvarFonte(input: { id: SourceId; key?: string | null; enabled?: boolean }) {
  if (input.key !== undefined) {
    if (input.key === null || input.key === "") await gravar(keyKey(input.id), "");
    else await gravar(keyKey(input.id), input.key);
  }
  if (input.enabled !== undefined) await gravar(enabledKey(input.id), input.enabled ? "true" : "false");
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
};

/** Consulta todas as fontes ativas em paralelo e mescla por CNPJ. */
export async function buscarMultiFonte(cnpjs: string[]): Promise<ResultadoMultiFonte> {
  const s = await lerSettings();
  const prioridade = ordemPrioridade(s);
  const ativas = prioridade.filter((id) => ativa(id, s, Boolean(chaveDaFonte(id, s))));

  const falhas: Array<{ fonte: SourceId; erro: string }> = [];
  const resultados = new Map<SourceId, LoteResultado>();

  await Promise.all(
    ativas.map(async (id) => {
      try {
        resultados.set(id, await ADAPTERS[id].fetchLote(cnpjs, chaveDaFonte(id, s)));
      } catch (e) {
        falhas.push({ fonte: id, erro: e instanceof Error ? e.message : "Falha desconhecida." });
      }
    }),
  );

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

  return { empresas, falhas, fontesUsadas: ativas };
}
