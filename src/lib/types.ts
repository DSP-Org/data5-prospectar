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
  /** Marcado automaticamente quando a qualificação/cargo indica administrador, presidente ou diretor. */
  is_administrador?: boolean;
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
  simples_optante: boolean | null;
  simples_desde: string | null;
  mei_optante: boolean | null;
  mei_desde: string | null;
  melhor_telefone: string | null;
  telefones: string[];
  melhor_site: string | null;
  sites: string[];
  email_receita: string | null;
  emails: string[];
  contatos: Contato[];
  decisores: Contato[];
  link_detalhe: string | null;
  fonte_principal: string | null;
  fontes: string[];

  status: Status;
  prospectar: boolean;
  /** Vendedor que assumiu o lead; nulo quando ainda não tem dono. */
  owner_id: string | null;
  owner_desde: string | null;
  notas: string;
  tags: string[];
  list_id: string | null;
  product_id: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
};

export type CompanyList = {
  id: string;
  name: string;
  color: string;
  created_at: string;
  total?: number;
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

export const ACTIVITY_TYPES = ["ligacao", "email", "whatsapp", "reuniao", "tarefa", "nota"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  nota: "Nota",
};

export const ACTIVITY_COLOR: Record<ActivityType, string> = {
  ligacao: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  whatsapp: "bg-green-100 text-green-700",
  reuniao: "bg-amber-100 text-amber-700",
  tarefa: "bg-slate-100 text-slate-700",
  nota: "bg-zinc-100 text-zinc-700",
};

export type ProspectionActivity = {
  id: string;
  company_cnpj: string;
  tipo: ActivityType;
  observacao: string;
  responsavel: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
};


export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// ==================== Higienização de contatos ====================

export type TipoTelefone = "CELULAR" | "FIXO" | "DESCONHECIDO";

export const TIPO_TELEFONE_LABEL: Record<TipoTelefone, string> = {
  CELULAR: "Celular",
  FIXO: "Fixo",
  DESCONHECIDO: "Indefinido",
};

/** Remove tudo que não for dígito e descarta o DDI 55 quando presente. */
export function normalizarTelefone(valor: string): string {
  const d = onlyDigits(valor);
  if (d.length > 11 && d.startsWith("55")) return d.slice(2);
  return d;
}

/**
 * Classifica um telefone brasileiro em CELULAR (DDD + 9 dígitos) ou
 * FIXO (DDD + 8 dígitos). Fora desse padrão, volta como DESCONHECIDO.
 */
export function classificarTelefone(valor: string): TipoTelefone {
  const d = normalizarTelefone(valor);
  if (d.length === 11) return "CELULAR";
  if (d.length === 10) return "FIXO";
  return "DESCONHECIDO";
}

/** No Brasil, todo número CELULAR (com o 9º dígito) é apto a ter WhatsApp. */
export function possuiWhatsapp(valor: string): boolean {
  return classificarTelefone(valor) === "CELULAR";
}

const PADROES_EMAIL_CONTABIL: RegExp[] = [
  /contabil/i,
  /escritorio/i,
  /contabilidade/i,
  /^fiscal@/i,
  /^dp@/i,
];

/**
 * Identifica e-mails característicos de escritórios de contabilidade
 * (@contabil, @escritorio, *contabilidade*, fiscal@, dp@), para evitar o
 * envio de comunicações comerciais ao contador em vez do decisor da empresa.
 */
export function isEmailContabil(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  return PADROES_EMAIL_CONTABIL.some((re) => re.test(e));
}

export type EmailClassificado = { email: string; is_contabil: boolean };

export function classificarEmail(email: string): EmailClassificado {
  return { email, is_contabil: isEmailContabil(email) };
}

/** Lê um campo que pode vir como texto puro ou aninhado ({ descricao }, { text }, { name }). */
function textoDe(valor: unknown): string | null {
  if (typeof valor === "string") return valor.trim() || null;
  if (valor && typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    for (const chave of ["descricao", "text", "name", "nome"]) {
      const v = o[chave];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

/**
 * Cada fonte devolve o sócio num formato diferente: a CNPJá aninha em
 * `person`/`role`, o CNPJ.ws usa `qualificacao_socio` e a BrasilAPI usa
 * `nome_socio`. Normaliza todos para o formato que a ficha e o
 * `isAdministrador` esperam, preservando os campos originais.
 */
export function normalizarSocio(bruto: Record<string, unknown>): Record<string, unknown> {
  const pessoa = (bruto["person"] ?? {}) as Record<string, unknown>;

  const normalizado: Record<string, unknown> = {
    nome: textoDe(bruto["nome"] ?? bruto["nome_socio"] ?? pessoa["name"]),
    qualificacao: textoDe(
      bruto["qualificacao"] ?? bruto["qualificacao_socio"] ?? bruto["role"] ?? bruto["cargo"],
    ),
    cpf: textoDe(bruto["cpf"] ?? bruto["cpf_cnpj_socio"] ?? bruto["cnpj_cpf_do_socio"] ?? pessoa["taxId"]),
    dataEntradaSociedade: textoDe(
      bruto["dataEntradaSociedade"] ?? bruto["data_entrada_sociedade"] ?? bruto["since"],
    ),
    faixaEtaria: textoDe(bruto["faixaEtaria"] ?? bruto["faixa_etaria"] ?? pessoa["age"]),
  };

  // Só sobrescreve o que realmente foi encontrado, para não apagar dados da fonte.
  const encontrados = Object.fromEntries(
    Object.entries(normalizado).filter(([, v]) => v != null),
  );
  return { ...bruto, ...encontrados };
}

const TERMOS_ADMINISTRADOR = [
  "socio-administrador",
  "administrador",
  "presidente",
  "diretor",
];

function semAcentos(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Identifica, pela qualificação/cargo do sócio, se a pessoa é
 * administradora/representante legal da empresa (Sócio-Administrador,
 * Administrador, Presidente ou Diretor).
 */
export function isAdministrador(pessoa: { qualificacao?: Json; cargo?: Json }): boolean {
  const qualificacao = typeof pessoa.qualificacao === "string" ? pessoa.qualificacao : "";
  const cargo = typeof pessoa.cargo === "string" ? pessoa.cargo : "";
  const texto = semAcentos(`${qualificacao} ${cargo}`.toLowerCase());
  return TERMOS_ADMINISTRADOR.some((termo) => texto.includes(semAcentos(termo)));
}

/** Recebe sócios/decisores, marca quem é administrador e traz esses nomes para o topo da lista. */
export function ordenarComAdministradorNoTopo<
  T extends { qualificacao?: Json; cargo?: Json; is_administrador?: boolean },
>(pessoas: T[]): Array<T & { is_administrador: boolean }> {
  return pessoas
    .map((p) => ({ ...p, is_administrador: p.is_administrador ?? isAdministrador(p) }))
    .sort((a, b) => Number(b.is_administrador) - Number(a.is_administrador));
}

