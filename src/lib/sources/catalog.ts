// Catálogo client-safe das fontes de dados (sem código de servidor).

export type SourceId = "econodata" | "brasilapi" | "cnpja" | "speedio";

export type SourceMeta = {
  id: SourceId;
  label: string;
  descricao: string;
  requiresKey: boolean;
  defaultEnabled: boolean;
  /** Traz telefones/e-mails/decisores? */
  contatos: boolean;
  /** Consulta consome crédito pago? */
  custo: "gratis" | "pago";
};

export const SOURCES: SourceMeta[] = [
  {
    id: "econodata",
    label: "Econodata",
    descricao: "Enriquecimento B2B completo: telefones, e-mails, decisores e faturamento presumido.",
    requiresKey: true,
    defaultEnabled: true,
    contatos: true,
    custo: "pago",
  },
  {
    id: "brasilapi",
    label: "BrasilAPI (Receita Federal)",
    descricao: "Dados cadastrais oficiais gratuitos (BrasilAPI com espelho CNPJ.ws): razão social, endereço, CNAE, sócios e capital social.",
    requiresKey: false,
    defaultEnabled: true,
    contatos: false,
    custo: "gratis",
  },
  {
    id: "cnpja",
    label: "CNPJá",
    descricao: "Cadastral completo com telefones e e-mails da Receita. Usa a base em cache da CNPJá (sem consumir crédito) e só vai online quando o dado passa da validade configurada.",
    requiresKey: true,
    defaultEnabled: false,
    contatos: true,
    custo: "pago",
  },
  {
    id: "speedio",
    label: "Speedio",
    descricao: "Base B2B pública da Speedio com dados cadastrais e contatos. Chave opcional.",
    requiresKey: false,
    defaultEnabled: false,
    contatos: true,
    custo: "gratis",
  },
];

export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s.label]),
);

/** Ordem padrão de prioridade na mesclagem (primeiro vence). */
export const DEFAULT_PRIORITY: SourceId[] = ["econodata", "speedio", "cnpja", "brasilapi"];

export type SourceConfig = {
  id: SourceId;
  label: string;
  descricao: string;
  requiresKey: boolean;
  contatos: boolean;
  custo: "gratis" | "pago";
  enabled: boolean;
  hasKey: boolean;
  maskedKey: string | null;
};

export type ModoConsulta = "economico" | "completo";

/** Módulos adicionais da CNPJá (cada um consome crédito extra). */
export type ModulosCnpja = {
  simples: boolean;
  registrations: boolean;
  suframa: boolean;
  geocoding: boolean;
  links: boolean;
};

export const MODULOS_CNPJA_PADRAO: ModulosCnpja = {
  simples: false,
  registrations: false,
  suframa: false,
  geocoding: false,
  links: false,
};

export const MODULOS_CNPJA_META: Array<{
  id: keyof ModulosCnpja;
  label: string;
  descricao: string;
}> = [
  {
    id: "simples",
    label: "Simples Nacional / MEI",
    descricao: "Enquadramento tributário atual e histórico de opções.",
  },
  {
    id: "registrations",
    label: "Inscrições Estaduais (CCC/SINTEGRA)",
    descricao: "Inscrições estaduais de todo o país, com situação e tipo.",
  },
  {
    id: "suframa",
    label: "SUFRAMA",
    descricao: "Inscrição, situação e incentivos da Zona Franca de Manaus.",
  },
  {
    id: "geocoding",
    label: "Geolocalização",
    descricao: "Latitude e longitude exatas do endereço.",
  },
  {
    id: "links",
    label: "Comprovantes (links)",
    descricao: "Link do comprovante de inscrição da Receita Federal.",
  },
];

export type EconomiaConfig = {
  modo: ModoConsulta;
  /** Dias de validade do cache local; 0 desliga o cache. */
  ttlDias: number;
  /** Trava de custo: nenhuma consulta pode debitar crédito de fonte paga. */
  somenteGratis: boolean;
};

