// Prévia de uma lista de CNPJs: diz o que já está na base (e dentro da
// validade do cache) antes de qualquer chamada às fontes externas.
// Só lê o banco — nunca consome crédito.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatCnpjApi } from "./econodata.server";
import { economiaAtual } from "./sources/registry.server";

export type PreviaLote = {
  /** Validade do cache configurada (dias). 0 = cache desligado. */
  ttlDias: number;
  /** Linhas recebidas (incluindo repetidas e inválidas). */
  recebidos: number;
  /** CNPJs válidos e únicos. */
  validos: number;
  duplicados: number;
  invalidos: string[];
  /** Já na base e dentro da validade — resolvem sem custo. */
  vigentes: string[];
  /** Na base, porém com dado vencido — podem consultar as fontes. */
  vencidos: string[];
  /** Nunca vistos na base — vão consultar as fontes. */
  novos: string[];
};

const BLOCO = 400;

export async function previaLote(entrada: string[]): Promise<PreviaLote> {
  const invalidos: string[] = [];
  const validos: string[] = [];
  let duplicados = 0;

  for (const raw of entrada) {
    const bruto = raw.trim();
    if (!bruto) continue;
    const f = formatCnpjApi(bruto);
    if (!f) {
      if (!invalidos.includes(bruto)) invalidos.push(bruto);
      continue;
    }
    if (validos.includes(f)) duplicados += 1;
    else validos.push(f);
  }

  const { ttlDias } = await economiaAtual();
  const limite = ttlDias > 0 ? Date.now() - ttlDias * 86400000 : null;

  const sincronia = new Map<string, string>();
  for (let i = 0; i < validos.length; i += BLOCO) {
    const bloco = validos.slice(i, i + BLOCO);
    const { data } = await supabaseAdmin
      .from("companies")
      .select("cnpj, synced_at")
      .in("cnpj", bloco);
    for (const r of (data ?? []) as Array<Record<string, unknown>>)
      sincronia.set(String(r["cnpj"]), String(r["synced_at"] ?? ""));
  }

  const vigentes: string[] = [];
  const vencidos: string[] = [];
  const novos: string[] = [];

  for (const cnpj of validos) {
    const sync = sincronia.get(cnpj);
    if (sync === undefined) {
      novos.push(cnpj);
      continue;
    }
    const at = Date.parse(sync);
    if (limite !== null && Number.isFinite(at) && at >= limite) vigentes.push(cnpj);
    else vencidos.push(cnpj);
  }

  return {
    ttlDias,
    recebidos: entrada.filter((v) => v.trim()).length,
    validos: validos.length,
    duplicados,
    invalidos: invalidos.slice(0, 50),
    vigentes,
    vencidos,
    novos,
  };
}
