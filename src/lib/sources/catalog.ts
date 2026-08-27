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
};

export const SOURCES: SourceMeta[] = [
  {
    id: "econodata",
    label: "Econodata",
    descricao: "Enriquecimento B2B completo: telefones, e-mails, decisores e faturamento presumido.",
    requiresKey: true,
    defaultEnabled: true,
    contatos: true,
  },
  {
    id: "brasilapi",
    label: "BrasilAPI (Receita Federal)",
    descricao: "Dados cadastrais oficiais gratuitos (BrasilAPI com espelho CNPJ.ws): razão social, endereço, CNAE, sócios e capital social.",
    requiresKey: false,
    defaultEnabled: true,
    contatos: false,
  },
  {
    id: "cnpja",
    label: "CNPJá",
    descricao: "Cadastral completo com telefones e e-mails da Receita. Requer chave da conta CNPJá.",
    requiresKey: true,
    defaultEnabled: false,
    contatos: true,
  },
  {
    id: "speedio",
    label: "Speedio",
    descricao: "Base B2B pública da Speedio com dados cadastrais e contatos. Chave opcional.",
    requiresKey: false,
    defaultEnabled: false,
    contatos: true,
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
  enabled: boolean;
  hasKey: boolean;
  maskedKey: string | null;
};
