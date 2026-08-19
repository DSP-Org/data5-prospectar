// Cliente server-only da API Econodata (ecdt-api).
// Contrato confirmado: header `Authorization: <token>` (token cru, sem "Bearer").

const BASE = "https://api.econodata.com.br/ecdt-api";

export type FaixaEconodata = { min?: number | null; max?: number | null } | string | null;

export type EconodataCompany = {
  cnpj: string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  tipoUnidade?: string | null;
  naturezaJuridica?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: string | null;
  situacao?: string | null;
  codigoAtividadeEconomica?: string | null;
  atividadeEconomica?: string | null;
  setorAmigavel?: Array<{ setor_amigavel?: string | null }> | null;
  porteEstimado?: string | null;
  enquadramentoPorte?: string[] | null;
  faturamentoAnualPresumido?: FaixaEconodata;
  qtdFuncionariosEstimada?: FaixaEconodata;
  quantidadeFuncionarios?: number | null;
  capitalSocial?: number | string | null;
  dataAbertura?: string | null;
  melhorTelefone?: string | null;
  segundoMelhorTelefone?: string | null;
  terceiroMelhorTelefone?: string | null;
  telefonesAltaAssertividade?: string[] | null;
  telefonesMediaAssertividade?: string[] | null;
  telefonesBaixaAssertividade?: string[] | null;
  melhorSite?: string | null;
  segundoMelhorSite?: string | null;
  sites?: string[] | null;
  emailReceitaFederal?: string | null;
  contatos?: Array<Record<string, unknown>> | null;
  decisores?: Array<Record<string, unknown>> | null;
  linkDetalhe?: string | null;
  [key: string]: unknown;
};

export class EconodataError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "EconodataError";
  }
}

const MENSAGENS: Record<number, string> = {
  400: "Parâmetro inválido enviado para a Econodata.",
  401: "Token de integração inválido ou sem permissão para este recurso.",
  402: "Sem saldo de créditos na conta Econodata.",
  404: "Empresa não encontrada ou fora do seu plano.",
  413: "Limite de 100 CNPJs por requisição excedido.",
  429: "Limite de requisições por minuto excedido. Tente novamente em instantes.",
  500: "Erro interno da Econodata.",
};

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const token = process.env["ECONODATA_API_KEY"];
  if (!token) throw new EconodataError(500, "Token da Econodata não configurado.");

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new EconodataError(503, "Não foi possível conectar à Econodata.");
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const apiMsg =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: { message?: string } }).error?.message ?? "")
        : "";
    throw new EconodataError(res.status, MENSAGENS[res.status] ?? apiMsg ?? `Erro ${res.status}.`);
  }

  return body as T;
}

/** Normaliza um CNPJ para o formato exigido: 00.000.000/0000-00 */
export function formatCnpjApi(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.length !== 14) return null;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export type TokenInfo = {
  cd_cliente?: string;
  nm_integracao?: string;
  url_webhook?: string;
  cd_token?: string;
};

export function validarToken() {
  return call<TokenInfo>("/valid-token-integration", { method: "POST" });
}

/** POST /companies — corpo é um array cru de CNPJs (máx. 100). */
export function buscarPorCnpjs(cnpjs: string[]) {
  return call<EconodataCompany[]>("/companies", {
    method: "POST",
    body: JSON.stringify(cnpjs),
  });
}

/** POST /companies/search — busca por cnpj, site ou email. */
export function buscarPorChave(params: { cnpj?: string; site?: string; email?: string }) {
  return call<EconodataCompany>("/companies/search", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
