// Listas públicas do IBGE (UFs, municípios e CNAEs) usadas nos filtros de busca.

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type MunicipioIbge = { id: string; nome: string };
export type CnaeIbge = { id: string; descricao: string };

export async function listarMunicipios(uf: string): Promise<MunicipioIbge[]> {
  if (!uf) return [];
  const resp = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
  );
  if (!resp.ok) throw new Error("Não foi possível carregar os municípios do IBGE.");
  const json = (await resp.json()) as { id: number; nome: string }[];
  return json.map((m) => ({ id: String(m.id), nome: m.nome }));
}

export async function listarCnaes(): Promise<CnaeIbge[]> {
  const resp = await fetch("https://servicodados.ibge.gov.br/api/v2/cnae/subclasses");
  if (!resp.ok) throw new Error("Não foi possível carregar a lista de CNAEs do IBGE.");
  const json = (await resp.json()) as { id: string; descricao: string }[];
  return json.map((c) => ({ id: c.id.replace(/\D/g, ""), descricao: c.descricao }));
}
