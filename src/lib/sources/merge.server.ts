// Mescla resultados parciais de várias fontes numa única empresa.

import { canonizarNatureza } from "../natureza-juridica";
import { isAdministrador, onlyDigits, type Json } from "../types";
import type { MappedCompany } from "../company-mapper.server";
import type { SourceId } from "./catalog";
import type { Partial2 } from "./adapters.server";

const ARRAY_FIELDS = [
  "setores",
  "enquadramento_porte",
  "telefones",
  "sites",
  "emails",
  "contatos",
  "decisores",
] as const;

const SCALAR_FIELDS = [
  "razao_social",
  "nome_fantasia",
  "tipo_unidade",
  "situacao",
  "natureza_juridica",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cep",
  "cidade",
  "uf",
  "cnae_codigo",
  "cnae_descricao",
  "porte_estimado",
  "faturamento_presumido",
  "qtd_funcionarios_estimada",
  "capital_social",
  "data_abertura",
  "melhor_telefone",
  "melhor_site",
  "email_receita",
  "link_detalhe",
] as const;

function vazio(v: unknown) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function chaveItem(v: unknown) {
  if (typeof v === "string") return v.trim().toLowerCase();
  return JSON.stringify(v);
}

export type EntradaFonte = { fonte: SourceId; dados: Partial2 };

/** Peso por campo: contatos e decisores valem mais que cadastro básico. */
const PESO_ARRAY: Record<string, number> = {
  telefones: 3,
  emails: 3,
  decisores: 5,
  contatos: 4,
  sites: 2,
  setores: 1,
  enquadramento_porte: 1,
};

const PESO_ESCALAR: Record<string, number> = {
  melhor_telefone: 3,
  melhor_site: 2,
  email_receita: 3,
  faturamento_presumido: 2,
  qtd_funcionarios_estimada: 2,
  porte_estimado: 1,
};

/** Pontua a riqueza dos dados trazidos por uma fonte. */
export function pontuarFonte(dados: Partial2): number {
  const r = dados as unknown as Record<string, unknown>;
  let score = 0;
  for (const campo of SCALAR_FIELDS) {
    if (!vazio(r[campo])) score += PESO_ESCALAR[campo] ?? 1;
  }
  for (const campo of ARRAY_FIELDS) {
    const lista = r[campo];
    if (Array.isArray(lista) && lista.length > 0) {
      score += (PESO_ARRAY[campo] ?? 1) * Math.min(lista.length, 5);
    }
  }
  return score;
}

/**
 * Fonte principal = a que trouxe mais dados úteis.
 * Empate resolve pela ordem de prioridade (entradas já vêm ordenadas).
 */
function melhorFonte(entradas: EntradaFonte[]): SourceId {
  let melhor = entradas[0]!;
  let melhorScore = pontuarFonte(melhor.dados);
  for (const e of entradas.slice(1)) {
    const s = pontuarFonte(e.dados);
    if (s > melhorScore) {
      melhor = e;
      melhorScore = s;
    }
  }
  return melhor.fonte;
}

export type EmpresaMesclada = MappedCompany & {
  fonte_principal: string;
  fontes: string[];
};

/**
 * @param entradas resultados por fonte já na ordem de prioridade (primeiro vence)
 */
export function mesclar(cnpj: string, entradas: EntradaFonte[]): EmpresaMesclada | null {
  const validas = entradas.filter((e) => e.dados && Object.keys(e.dados).length > 0);
  if (validas.length === 0) return null;

  const out: Record<string, unknown> = { cnpj };

  for (const campo of SCALAR_FIELDS) {
    for (const { dados } of validas) {
      const v = (dados as Record<string, unknown>)[campo];
      if (!vazio(v)) {
        out[campo] = v;
        break;
      }
    }
    if (!(campo in out)) out[campo] = campo === "razao_social" ? "" : null;
  }

  for (const campo of ARRAY_FIELDS) {
    const vistos = new Set<string>();
    const acc: unknown[] = [];
    for (const { dados } of validas) {
      const lista = (dados as Record<string, unknown>)[campo];
      if (!Array.isArray(lista)) continue;
      for (const item of lista) {
        const k = chaveItem(item);
        if (!k || vistos.has(k)) continue;
        vistos.add(k);
        acc.push(item);
      }
    }
    out[campo] = acc;
  }

  const raw: Record<string, unknown> = {};
  for (const { fonte, dados } of validas) {
    const d = dados as { raw?: unknown; extras?: Record<string, unknown> };
    const base = (d.raw ?? dados) as Record<string, unknown>;
    raw[fonte] =
      d.extras && Object.keys(d.extras).length > 0 ? { ...base, extras: d.extras } : base;
  }


  out["natureza_juridica"] = canonizarNatureza(out["natureza_juridica"] as string | null);

  // Higienização: telefones sempre em dígitos (sem máscara/DDI) e sem duplicatas.
  if (typeof out["melhor_telefone"] === "string") {
    out["melhor_telefone"] = onlyDigits(out["melhor_telefone"] as string) || null;
  }
  if (Array.isArray(out["telefones"])) {
    const vistos = new Set<string>();
    out["telefones"] = (out["telefones"] as unknown[])
      .map((t) => (typeof t === "string" ? onlyDigits(t) : ""))
      .filter((t) => {
        if (!t || vistos.has(t)) return false;
        vistos.add(t);
        return true;
      });
  }

  // Marca administrador/presidente/diretor em cada sócio ou decisor mesclado.
  for (const campoPessoas of ["contatos", "decisores"] as const) {
    if (Array.isArray(out[campoPessoas])) {
      out[campoPessoas] = (out[campoPessoas] as Array<Record<string, unknown>>).map((pessoa) => ({
        ...pessoa,
        is_administrador: isAdministrador(pessoa as { qualificacao?: Json; cargo?: Json }),
      }));
    }
  }

  out["raw"] = raw;
  out["synced_at"] = new Date().toISOString();
  out["fontes"] = validas.map((v) => v.fonte);
  out["fonte_principal"] = melhorFonte(validas);

  return out as unknown as EmpresaMesclada;
}
