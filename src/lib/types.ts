export const STATUSES = ["novo", "em_contato", "qualificado", "cliente", "descartado"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  qualificado: "Qualificado",
  cliente: "Cliente",
  descartado: "Descartado",
};

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type Contato = {
  key?: Json;
  nome?: Json;
  qualificacao?: Json;
  cargo?: Json;
  cpf?: Json;
  dataEntradaSociedade?: Json;
  emails?: Json;
  email?: Json;
  [k: string]: Json | undefined;
};

export type Company = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  tipo_unidade: string | null;
  situacao: string | null;
  natureza_juridica: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  uf: string | null;
  cnae_codigo: string | null;
  cnae_descricao: string | null;
  setores: string[];
  porte_estimado: string | null;
  enquadramento_porte: string[];
  faturamento_presumido: string | null;
  qtd_funcionarios_estimada: string | null;
  capital_social: number | null;
  data_abertura: string | null;
  melhor_telefone: string | null;
  telefones: string[];
  melhor_site: string | null;
  sites: string[];
  email_receita: string | null;
  emails: string[];
  contatos: Contato[];
  decisores: Contato[];
  link_detalhe: string | null;
  status: Status;
  notas: string;
  tags: string[];
  list_id: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
};

export type CompanyList = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type QueryLogEntry = {
  id: string;
  tipo: string;
  entrada: string;
  resultado: string;
  mensagem: string | null;
  quantidade: number;
  created_at: string;
};

export type LookupItem = {
  cnpj: string;
  encontrada: boolean;
  erro?: string | null;
  company?: Company | null;
  salva: boolean;
};

export function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
