/** Consulta gratuita da API aberta do CNPJá (sem chave, sem consumo de crédito). */

export type FichaSocio = {
  nome: string;
  qualificacao: string | null;
  desde: string | null;
  faixaEtaria: string | null;
};

export type FichaAtividade = { codigo: string; descricao: string };

export type FichaCnpja = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  matriz: boolean;
  dataAbertura: string | null;
  situacao: string | null;
  dataSituacao: string | null;
  motivoSituacao: string | null;
  naturezaJuridica: string | null;
  porte: string | null;
  capitalSocial: number | null;
  simples: string | null;
  mei: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefones: string[];
  emails: string[];
  atividadePrincipal: FichaAtividade | null;
  atividadesSecundarias: FichaAtividade[];
  socios: FichaSocio[];
  atualizadoEm: string | null;
};

type Aberto = {
  updated?: string;
  taxId?: string;
  alias?: string | null;
  founded?: string;
  head?: boolean;
  company?: {
    name?: string;
    equity?: number;
    nature?: { text?: string };
    size?: { text?: string };
    simples?: { optant?: boolean; since?: string | null };
    simei?: { optant?: boolean; since?: string | null };
    members?: Array<{
      since?: string;
      person?: { name?: string; age?: string };
      role?: { text?: string };
    }>;
  };
  status?: { text?: string };
  statusDate?: string;
  reason?: { text?: string };
  address?: {
    street?: string;
    number?: string;
    details?: string | null;
    district?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  phones?: Array<{ area?: string; number?: string }>;
  emails?: Array<{ address?: string }>;
  mainActivity?: { id?: number; text?: string };
  sideActivities?: Array<{ id?: number; text?: string }>;
};

function atividade(a?: { id?: number; text?: string }): FichaAtividade | null {
  if (!a?.id) return null;
  const s = String(a.id).padStart(7, "0");
  return {
    codigo: `${s.slice(0, 4)}-${s.slice(4, 5)}/${s.slice(5)}`,
    descricao: a.text ?? "",
  };
}

export async function fichaAbertaCnpja(cnpjBruto: string): Promise<FichaCnpja> {
  const cnpj = cnpjBruto.replace(/\D/g, "");
  if (cnpj.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");

  const resp = await fetch(`https://open.cnpja.com/office/${cnpj}`, {
    headers: { Accept: "application/json" },
  });

  if (resp.status === 404) throw new Error("CNPJ não encontrado na base pública do CNPJá.");
  if (resp.status === 429)
    throw new Error("Limite de consultas gratuitas atingido. Aguarde alguns segundos.");
  if (!resp.ok) throw new Error(`Falha na consulta pública (HTTP ${resp.status}).`);

  const d = (await resp.json()) as Aberto;
  const end = d.address ?? {};
  const linha = [
    [end.street, end.number].filter(Boolean).join(", "),
    end.details || null,
    end.district || null,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    cnpj,
    razaoSocial: d.company?.name ?? "",
    nomeFantasia: d.alias || null,
    matriz: d.head !== false,
    dataAbertura: d.founded ?? null,
    situacao: d.status?.text ?? null,
    dataSituacao: d.statusDate ?? null,
    motivoSituacao: d.reason?.text ?? null,
    naturezaJuridica: d.company?.nature?.text ?? null,
    porte: d.company?.size?.text ?? null,
    capitalSocial: typeof d.company?.equity === "number" ? d.company.equity : null,
    simples: d.company?.simples
      ? d.company.simples.optant
        ? `Optante${d.company.simples.since ? ` desde ${d.company.simples.since}` : ""}`
        : "Não optante"
      : null,
    mei: d.company?.simei
      ? d.company.simei.optant
        ? `Optante${d.company.simei.since ? ` desde ${d.company.simei.since}` : ""}`
        : "Não optante"
      : null,
    endereco: linha || null,
    municipio: end.city ?? null,
    uf: end.state ?? null,
    cep: end.zip ?? null,
    telefones: (d.phones ?? [])
      .map((p) => [p.area, p.number].filter(Boolean).join(" "))
      .filter((s) => s.trim() !== ""),
    emails: (d.emails ?? []).map((e) => e.address ?? "").filter((s) => s !== ""),
    atividadePrincipal: atividade(d.mainActivity),
    atividadesSecundarias: (d.sideActivities ?? [])
      .map(atividade)
      .filter((a): a is FichaAtividade => a !== null),
    socios: (d.company?.members ?? []).map((m) => ({
      nome: m.person?.name ?? "",
      qualificacao: m.role?.text ?? null,
      desde: m.since ?? null,
      faixaEtaria: m.person?.age ?? null,
    })),
    atualizadoEm: d.updated ?? null,
  };
}
