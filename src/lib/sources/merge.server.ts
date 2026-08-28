// Mescla resultados parciais de várias fontes numa única empresa.

import { canonizarNatureza } from "../natureza-juridica";
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

  out["raw"] = raw;
  out["synced_at"] = new Date().toISOString();
  out["fontes"] = validas.map((v) => v.fonte);
  out["fonte_principal"] = validas[0]!.fonte;

  return out as unknown as EmpresaMesclada;
}
