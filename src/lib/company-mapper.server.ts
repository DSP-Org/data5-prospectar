import type { EconodataCompany, FaixaEconodata } from "./econodata.server";
import { isAdministrador, onlyDigits, type Json } from "./types";

function faixaTexto(v: FaixaEconodata): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  const { min, max } = v;
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (min != null && max != null) return `${fmt(min)} a ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

function faixaSimples(v: FaixaEconodata): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  const { min, max } = v;
  if (min == null && max == null) return null;
  if (min != null && max != null) return `de ${min} a ${max}`;
  return String(min ?? max);
}

function limpar(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

/** Normaliza uma lista de telefones para dígitos apenas (sem máscara/DDI), sem vazios. */
function limparTelefones(list: unknown): string[] {
  return limpar(list)
    .map(onlyDigits)
    .filter((v) => v.length > 0);
}

/** Marca cada sócio/decisor com is_administrador conforme a qualificação/cargo. */
function marcarAdministradores(lista: unknown): Record<string, unknown>[] {
  if (!Array.isArray(lista)) return [];
  return lista.map((pessoa) => {
    const p = (pessoa ?? {}) as Record<string, unknown>;
    return { ...p, is_administrador: isAdministrador(p as { qualificacao?: Json; cargo?: Json }) };
  });
}

function coletarEmails(c: EconodataCompany): string[] {
  const out = new Set<string>();
  if (c.emailReceitaFederal) out.add(c.emailReceitaFederal);
  for (const grupo of [c.contatos ?? [], c.decisores ?? []]) {
    for (const item of grupo) {
      const emails = (item as { emails?: unknown; email?: unknown }).emails ?? (item as { email?: unknown }).email;
      if (Array.isArray(emails)) limpar(emails).forEach((e) => out.add(e));
      else if (typeof emails === "string" && emails.trim()) out.add(emails);
    }
  }
  return [...out];
}

export function mapCompany(c: EconodataCompany) {
  const capital =
    c.capitalSocial == null || c.capitalSocial === ""
      ? null
      : Number(String(c.capitalSocial).replace(",", "."));

  return {
    cnpj: c.cnpj,
    razao_social: c.razaoSocial ?? "",
    nome_fantasia: c.nomeFantasia ?? null,
    tipo_unidade: c.tipoUnidade ?? null,
    situacao: c.situacao ?? null,
    natureza_juridica: c.naturezaJuridica ?? null,
    logradouro: c.logradouro ?? null,
    numero: c.numero ?? null,
    complemento: c.complemento ?? null,
    bairro: c.bairro ?? null,
    cep: c.cep ?? null,
    cidade: c.cidade ?? null,
    uf: c.uf ?? null,
    cnae_codigo: c.codigoAtividadeEconomica ?? null,
    cnae_descricao: c.atividadeEconomica ?? null,
    setores: (c.setorAmigavel ?? [])
      .map((s) => s?.setor_amigavel)
      .filter((s): s is string => typeof s === "string" && s.trim() !== ""),
    porte_estimado: c.porteEstimado ?? null,
    enquadramento_porte: limpar(c.enquadramentoPorte),
    faturamento_presumido: faixaTexto(c.faturamentoAnualPresumido ?? null),
    qtd_funcionarios_estimada: faixaSimples(c.qtdFuncionariosEstimada ?? null),
    capital_social: capital != null && Number.isFinite(capital) ? capital : null,
    data_abertura: c.dataAbertura ? c.dataAbertura.slice(0, 10) : null,
    melhor_telefone: c.melhorTelefone ? onlyDigits(c.melhorTelefone) || null : null,
    telefones: [
      ...new Set([
        ...limparTelefones(c.telefonesAltaAssertividade),
        ...limparTelefones(c.telefonesMediaAssertividade),
        ...limparTelefones(c.telefonesBaixaAssertividade),
        ...limparTelefones([c.melhorTelefone, c.segundoMelhorTelefone, c.terceiroMelhorTelefone]),
      ]),
    ],
    melhor_site: c.melhorSite ?? null,
    sites: [...new Set([...limpar(c.sites), ...limpar([c.melhorSite, c.segundoMelhorSite])])],
    email_receita: c.emailReceitaFederal ?? null,
    emails: coletarEmails(c),
    contatos: marcarAdministradores(c.contatos ?? []),
    decisores: marcarAdministradores(c.decisores ?? []),
    link_detalhe: c.linkDetalhe ?? null,
    raw: c as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

export type MappedCompany = ReturnType<typeof mapCompany>;
