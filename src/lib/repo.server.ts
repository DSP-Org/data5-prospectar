import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mapCompany } from "./company-mapper.server";
import {
  buscarPorChave,
  EconodataError,
  formatCnpjApi,
  validarToken,
} from "./econodata.server";
import { buscarMultiFonte } from "./sources/registry.server";
import { type Escopo, gerenciaCarteira, unidadeDeGravacao, unidadesFiltro } from "./escopo.server";
import { isAdministrador, normalizarSocio } from "./types";
import type { ActivityType, Company, CompanyList, Json, LookupItem, ProspectionActivity, QueryLogEntry, Status } from "./types";

type Row = Record<string, unknown>;

/**
 * Normaliza sócios na leitura: registros gravados antes da padronização das
 * fontes guardam o formato cru da API (person/role), que a ficha não sabe ler.
 */
function pessoasDaLinha(valor: unknown): Record<string, unknown>[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((pessoa) => {
    const p = normalizarSocio((pessoa ?? {}) as Record<string, unknown>);
    return { ...p, is_administrador: isAdministrador(p as { qualificacao?: Json; cargo?: Json }) };
  });
}

function asCompany(row: Row): Company {
  return {
    ...row,
    contatos: pessoasDaLinha(row["contatos"]),
    decisores: pessoasDaLinha(row["decisores"]),
  } as unknown as Company;
}

async function logQuery(entry: {
  tipo: string;
  entrada: string;
  resultado: string;
  mensagem?: string | null | undefined;
  quantidade?: number | undefined;
}) {
  await supabaseAdmin.from("query_log").insert({
    tipo: entry.tipo,
    entrada: entry.entrada,
    resultado: entry.resultado,
    mensagem: entry.mensagem ?? null,
    quantidade: entry.quantidade ?? 0,
  } as never);
}

export async function testarConexao() {
  try {
    const info = await validarToken();
    return { ok: true as const, cliente: info?.cd_cliente ?? null, integracao: info?.nm_integracao ?? null };
  } catch (e) {
    const err = e as EconodataError;
    return { ok: false as const, erro: err.message ?? "Falha desconhecida", status: err.status ?? 0 };
  }
}

type Persistivel = ReturnType<typeof mapCompany> | Record<string, unknown>;

/** Devolve uma empresa "neutra": cadastro real, comercial ainda sem vínculo. */
function comCarteiraNeutra(row: Row, unitId: string | null = null): Company {
  return asCompany({
    ...row,
    unit_id: unitId,
    status: "novo",
    prospectar: false,
    notas: "",
    tags: [],
    list_id: null,
    product_id: null,
    owner_id: null,
    owner_desde: null,
  });
}

/**
 * Garante uma linha de carteira para (cnpj, unitId) — cria se não existir; se já
 * existir, só atualiza a lista (quando informada), sem tocar status/dono/notas.
 */
export async function vincularCarteira(cnpjs: string[], unitId: string, listId?: string | null) {
  if (cnpjs.length === 0) return;
  const linhas = cnpjs.map((cnpj) => ({
    cnpj,
    unit_id: unitId,
    ...(listId ? { list_id: listId } : {}),
  }));
  const { error } = await supabaseAdmin
    .from("carteira")
    .upsert(linhas as never, { onConflict: "cnpj,unit_id" });
  if (error) throw new Error(error.message);
}

/** Lê de volta o cadastro + carteira de uma unidade específica, já no formato que a UI espera. */
async function empresasDaCarteira(cnpjs: string[], unitId: string | null): Promise<Company[]> {
  if (cnpjs.length === 0 || !unitId) return [];
  const { data, error } = await supabaseAdmin
    .from("v_carteira")
    .select("*")
    .in("cnpj", cnpjs)
    .eq("unit_id", unitId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => asCompany(r));
}

/**
 * Grava o cadastro compartilhado (companies) e, se houver unidade, garante o
 * vínculo de carteira para ela. Sem unidade (raro: usuário sem nenhuma
 * vinculada), devolve o cadastro com comercial neutro, sem gravar carteira.
 */
async function persistir(mapped: Persistivel[], listId: string | null, unitId: string | null): Promise<Company[]> {
  if (mapped.length === 0) return [];
  const { data, error } = await gravarEmpresas(mapped as Record<string, unknown>[]);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as Row[];
  if (!unitId) return linhas.map((r) => comCarteiraNeutra(r));

  const cnpjs = linhas.map((r) => String(r["cnpj"]));
  await vincularCarteira(cnpjs, unitId, listId);
  return empresasDaCarteira(cnpjs, unitId);
}

/** Colunas recentes que podem não existir se a migration ainda não foi aplicada. */
const COLUNAS_OPCIONAIS = ["simples_optante", "simples_desde", "mei_optante", "mei_desde"];

/**
 * Grava as empresas e, se o banco ainda não tiver alguma coluna opcional
 * (migration pendente), repete a gravação sem ela em vez de perder a consulta.
 */
async function gravarEmpresas(payload: Record<string, unknown>[]) {
  const enviar = (linhas: Record<string, unknown>[]) =>
    supabaseAdmin.from("companies").upsert(linhas as never, { onConflict: "cnpj" }).select("*");

  // O PostgREST reporta uma coluna por vez, então tenta de novo a cada descarte.
  let linhas = payload;
  let resposta = await enviar(linhas);
  for (let tentativa = 0; tentativa < COLUNAS_OPCIONAIS.length; tentativa += 1) {
    const mensagem = resposta.error?.message;
    if (!mensagem) break;
    const ausente = COLUNAS_OPCIONAIS.find(
      (c) => mensagem.includes(`'${c}'`) && linhas.some((l) => c in l),
    );
    if (!ausente) break;
    console.warn(
      `[companies] coluna "${ausente}" não existe no banco (migration pendente). Gravando sem ela.`,
    );
    linhas = linhas.map(({ [ausente]: _ignorado, ...resto }) => resto);
    resposta = await enviar(linhas);
  }
  return resposta;
}


export async function consultarCnpjs(input: {
  escopo: Escopo;
  unitId?: string | null | undefined;
  cnpjs: string[];
  listId?: string | null | undefined;
  salvar?: boolean | undefined;
  /** Ignora o cache local e reconsulta as fontes. */
  forcar?: boolean | undefined;
  /** Busca máxima: todas as fontes, dados em tempo real e módulos extras. */
  completo?: boolean | undefined;

}): Promise<{ itens: LookupItem[] }> {
  const invalidos: string[] = [];
  const validos: string[] = [];
  for (const raw of input.cnpjs) {
    const f = formatCnpjApi(raw);
    if (f) {
      if (!validos.includes(f)) validos.push(f);
    } else if (raw.trim()) invalidos.push(raw.trim());
  }

  const itens: LookupItem[] = invalidos.map((c) => ({
    cnpj: c,
    encontrada: false,
    erro: "CNPJ inválido (precisa ter 14 dígitos).",
    salva: false,
  }));

  if (validos.length === 0) {
    if (itens.length)
      await logQuery({ tipo: "cnpj", entrada: input.cnpjs.join(", "), resultado: "erro", mensagem: "CNPJ inválido" });
    return { itens };
  }

  // Empresas que já estão no cadastro compartilhado não vão para as fontes
  // (não gasta crédito). Unidades são independentes — cada uma vincula (ou
  // não) as empresas que quiser, sem depender de quem mais já vinculou a
  // mesma empresa: a mesma empresa pode estar na carteira de nenhuma, uma ou
  // várias unidades ao mesmo tempo. "Buscar tudo" / reconsulta forçada
  // ignoram o atalho de carteira e vão direto às fontes.
  const unitIdAtual = unidadeDeGravacao(input.escopo, input.unitId);
  const salvar = input.salvar !== false;

  const { data: cadastroRows } = await supabaseAdmin.from("companies").select("cnpj").in("cnpj", validos);
  const noCadastro = new Set(((cadastroRows ?? []) as Row[]).map((r) => String(r["cnpj"])));

  const { data: carteiraRows } = await supabaseAdmin.from("carteira").select("cnpj, unit_id").in("cnpj", validos);
  const carteiraPorCnpj = new Map<string, string>();
  for (const r of (carteiraRows ?? []) as Row[]) carteiraPorCnpj.set(String(r["cnpj"]), String(r["unit_id"]));

  const minhas = validos.filter((c) => {
    const unitDono = carteiraPorCnpj.get(c);
    return unitDono !== undefined && naUnidade(input.escopo, unitDono);
  });
  const semCarteiraPropria = validos.filter((c) => !minhas.includes(c));

  let aConsultar = [...validos];

  if (!input.forcar && !input.completo) {
    // Já é minha carteira: não reconsulta, só (opcionalmente) atualiza a lista.
    const minhasNoCadastro = minhas.filter((c) => noCadastro.has(c));
    if (minhasNoCadastro.length) {
      aConsultar = aConsultar.filter((c) => !minhasNoCadastro.includes(c));
      if (unitIdAtual && input.listId && salvar) {
        await supabaseAdmin
          .from("carteira")
          .update({ list_id: input.listId } as never)
          .in("cnpj", minhasNoCadastro)
          .eq("unit_id", unitIdAtual);
      }
      for (const c of await empresasDaCarteira(minhasNoCadastro, unitIdAtual))
        itens.push({ cnpj: c.cnpj, encontrada: true, company: c, salva: true });
    }

    // Cadastro já existe mas minha unidade ainda não vinculou: vincula sem gastar crédito.
    const paraVincular = semCarteiraPropria.filter((c) => noCadastro.has(c));
    if (paraVincular.length) {
      aConsultar = aConsultar.filter((c) => !paraVincular.includes(c));
      if (unitIdAtual && salvar) {
        await vincularCarteira(paraVincular, unitIdAtual, input.listId ?? null);
        for (const c of await empresasDaCarteira(paraVincular, unitIdAtual))
          itens.push({ cnpj: c.cnpj, encontrada: true, company: c, salva: true });
      } else {
        const { data: previa } = await supabaseAdmin.from("companies").select("*").in("cnpj", paraVincular);
        for (const r of (previa ?? []) as Row[])
          itens.push({
            cnpj: String(r["cnpj"]),
            encontrada: true,
            company: comCarteiraNeutra(r, unitIdAtual),
            salva: false,
          });
      }
    }
  }

  if (aConsultar.length === 0) return { itens };

  const encontradas: Record<string, unknown>[] = [];
  try {
    const { empresas, falhas } = await buscarMultiFonte(aConsultar, {
      forcar: input.forcar,
      completo: input.completo,
      origem: aConsultar.length > 1 ? "lote" : "consulta",
      unitId: unitIdAtual,
    });


    for (const c of aConsultar) {
      const m = empresas.get(c);
      if (m) encontradas.push(m as unknown as Record<string, unknown>);
      else
        itens.push({
          cnpj: c,
          encontrada: false,
          erro: falhas.length
            ? `Não encontrada. Falhas: ${falhas.map((f) => `${f.fonte}: ${f.erro}`).join(" | ")}`
            : "Não encontrada nas fontes ativas.",
          salva: false,
        });
    }
  } catch (e) {
    const err = e as EconodataError;
    for (const c of aConsultar) itens.push({ cnpj: c, encontrada: false, erro: err.message, salva: false });
    await logQuery({
      tipo: "cnpj",
      entrada: aConsultar.join(", "),
      resultado: "erro",
      mensagem: err.message,
      quantidade: 0,
    });
  }

  let salvas: Company[] = [];
  if (salvar) salvas = await persistir(encontradas, input.listId ?? null, unitIdAtual);

  for (const m of encontradas) {
    const cnpj = String(m["cnpj"]);
    const salva = salvas.find((s) => s.cnpj === cnpj);
    itens.push({
      cnpj,
      encontrada: true,
      company: salva ?? comCarteiraNeutra(m as Row, unitIdAtual),
      salva: Boolean(salva),
    });
  }


  if (encontradas.length)
    await logQuery({
      tipo: "cnpj",
      entrada: aConsultar.join(", "),
      resultado: "ok",
      quantidade: encontradas.length,
    });

  return { itens };
}

export async function consultarChave(input: {
  escopo: Escopo;
  unitId?: string | null | undefined;
  site?: string | undefined;
  email?: string | undefined;
  listId?: string | null | undefined;
  salvar?: boolean | undefined;
}): Promise<LookupItem> {
  const tipo = input.site ? "site" : "email";
  const entrada = (input.site ?? input.email ?? "").trim();
  try {
    const res = await buscarPorChave(input.site ? { site: entrada } : { email: entrada });
    if (!res?.cnpj) {
      await logQuery({ tipo, entrada, resultado: "nao_encontrado" });
      return { cnpj: entrada, encontrada: false, erro: "Nenhuma empresa encontrada.", salva: false };
    }
    const mapped = mapCompany(res);
    // Enriquece com as demais fontes ativas usando o CNPJ encontrado.
    let final: Record<string, unknown> = {
      ...(mapped as unknown as Record<string, unknown>),
      fonte_principal: "econodata",
      fontes: ["econodata"],
    };
    try {
      // Respeita cache/TTL e Modo Econômico para não gastar crédito à toa.
      const { empresas } = await buscarMultiFonte([mapped.cnpj], { origem: "busca por nome" });
      const m = empresas.get(mapped.cnpj);
      if (m) final = m as unknown as Record<string, unknown>;
    } catch {
      /* mantém apenas o resultado da Econodata */
    }
    const unitIdAtual = unidadeDeGravacao(input.escopo, input.unitId);
    const salvar = input.salvar !== false;
    const salvas = salvar ? await persistir([final], input.listId ?? null, unitIdAtual) : [];

    await logQuery({ tipo, entrada, resultado: "ok", quantidade: 1 });
    return {
      cnpj: mapped.cnpj,
      encontrada: true,
      company: salvas[0] ?? comCarteiraNeutra(mapped as unknown as Row, unitIdAtual),
      salva: salvas.length > 0,
    };
  } catch (e) {
    const err = e as EconodataError;
    await logQuery({ tipo, entrada, resultado: "erro", mensagem: err.message });
    return { cnpj: entrada, encontrada: false, erro: err.message, salva: false };
  }
}

export async function listarEmpresas(input: {
  escopo: Escopo;
  busca?: string | undefined;
  status?: string | undefined;
  uf?: string | undefined;
  listId?: string | undefined;
  productId?: string | undefined;
  // filtros avançados abaixo
  cidade?: string | undefined;
  bairro?: string | undefined;
  cnae?: string | undefined;
  porte?: string | undefined;
  situacao?: string | undefined;
  naturezaJuridica?: string | undefined;
  grupoNatureza?: string | undefined;
  setor?: string | undefined;
  comTelefone?: boolean | undefined;
  comEmail?: boolean | undefined;
  comSite?: boolean | undefined;
  comDecisor?: boolean | undefined;
  capitalMin?: number | undefined;
  capitalMax?: number | undefined;
  aberturaDe?: string | undefined;
  aberturaAte?: string | undefined;
  simples?: string | undefined;
  mei?: string | undefined;
  prospectar?: boolean | undefined;
  /** Carteira: "meus", "sem_dono" ou "outros". */
  dono?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}) {
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(100, input.perPage ?? 25);
  // Território exclusivo: "Base de Empresas" é a carteira da(s) unidade(s) do
  // usuário — cadastro compartilhado (companies) + comercial da unidade (carteira).
  let q = restringirPorUnidade(supabaseAdmin.from("v_carteira").select("*", { count: "exact" }), input.escopo);


  if (input.busca?.trim()) {
    const termo = input.busca.trim();
    const digitos = termo.replace(/\D/g, "");
    const alvo = digitos.length >= 3 ? digitos : termo;
    q = q.or(
      `razao_social.ilike.%${alvo}%,nome_fantasia.ilike.%${alvo}%,cnpj.ilike.%${alvo}%,cidade.ilike.%${alvo}%`,
    );
  }
  if (input.status && input.status !== "todos") q = q.eq("status", input.status);
  if (input.uf && input.uf !== "todos") q = q.eq("uf", input.uf);
  if (input.listId === "sem_lista") q = q.is("list_id", null);
  else if (input.listId && input.listId !== "todas") q = q.eq("list_id", input.listId);
  if (input.productId === "sem_produto") q = q.is("product_id", null);
  else if (input.productId && input.productId !== "todos") q = q.eq("product_id", input.productId);
  if (input.cidade?.trim()) q = q.ilike("cidade", `%${input.cidade.trim()}%`);
  if (input.bairro?.trim()) q = q.ilike("bairro", `%${input.bairro.trim()}%`);
  if (input.cnae?.trim()) {
    const t = input.cnae.trim();
    q = q.or(`cnae_codigo.ilike.%${t}%,cnae_descricao.ilike.%${t}%`);
  }
  if (input.porte && input.porte !== "todos") q = q.eq("porte_estimado", input.porte);
  if (input.situacao && input.situacao !== "todas") q = q.ilike("situacao", input.situacao);
  if (input.naturezaJuridica?.trim())
    q = q.ilike("natureza_juridica", `%${input.naturezaJuridica.trim()}%`);
  if (input.grupoNatureza && input.grupoNatureza !== "todas")
    q = q.ilike("natureza_juridica", `${input.grupoNatureza}%`);
  if (input.setor?.trim()) q = q.contains("setores", [input.setor.trim()]);
  if (input.comTelefone) q = q.not("melhor_telefone", "is", null);
  if (input.comSite) q = q.not("melhor_site", "is", null);
  if (input.comEmail) q = q.not("email_receita", "is", null);
  if (input.comDecisor) q = q.neq("decisores", "[]");
  if (typeof input.capitalMin === "number") q = q.gte("capital_social", input.capitalMin);
  if (typeof input.capitalMax === "number") q = q.lte("capital_social", input.capitalMax);
  if (input.aberturaDe) q = q.gte("data_abertura", input.aberturaDe);
  if (input.aberturaAte) q = q.lte("data_abertura", input.aberturaAte);
  if (input.simples === "sim" || input.simples === "nao")
    q = q.eq("simples_optante", input.simples === "sim");
  if (input.mei === "sim" || input.mei === "nao") q = q.eq("mei_optante", input.mei === "sim");
  if (typeof input.prospectar === "boolean") q = q.eq("prospectar", input.prospectar);
  if (input.dono === "meus") q = q.eq("owner_id", input.escopo.userId);
  else if (input.dono === "sem_dono") q = q.is("owner_id", null);
  else if (input.dono === "outros")
    q = q.not("owner_id", "is", null).neq("owner_id", input.escopo.userId);

  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) throw new Error(error.message);

  const empresas: Company[] = ((data ?? []) as Row[]).map((r) => asCompany(r));
  return {
    empresas,
    donos: await nomesDosDonos(empresas),
    total: count ?? 0,
    page,
    perPage,
  };
}

/** Nome de cada vendedor dono das empresas da página, para exibir na lista. */
async function nomesDosDonos(empresas: Company[]): Promise<Record<string, string>> {
  const ids = [...new Set(empresas.map((e) => e.owner_id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return {};
  const { data } = await supabaseAdmin.from("profiles").select("id, nome, email").in("id", ids);
  const out: Record<string, string> = {};
  for (const p of (data ?? []) as Array<{ id: string; nome: string | null; email: string | null }>) {
    out[p.id] = p.nome?.trim() || p.email || "Vendedor";
  }
  return out;
}

function chave(cnpj: string) {
  return formatCnpjApi(cnpj) ?? cnpj;
}

/**
 * Território exclusivo: só a(s) unidade(s) do usuário enxergam a linha de
 * carteira. Aplica-se a `carteira`/`v_carteira`, onde unit_id nunca é nulo
 * (sem linha de carteira = ninguém vinculou ainda, não aparece de jeito nenhum).
 * Master enxerga tudo.
 */
function restringirPorUnidade<T extends { in: (col: string, vals: string[]) => T }>(q: T, escopo: Escopo): T {
  const unidades = unidadesFiltro(escopo);
  if (!unidades) return q;
  return q.in("unit_id", unidades);
}

/** Mesma regra que `restringirPorUnidade`, para quando a linha já foi lida em memória. */
function naUnidade(escopo: Escopo, unitId: string | null): boolean {
  const unidades = unidadesFiltro(escopo);
  if (!unidades) return true;
  return unitId !== null && unidades.includes(unitId);
}

/**
 * Informação que a ficha precisa mas não mora na tabela: nome do dono e o que
 * está sob opt-out. Fica separado de `obterEmpresa` para não inchar o tipo
 * Company com campos que só existem em uma tela.
 */
export async function contextoEmpresa(cnpj: string, escopo: Escopo) {
  const empresa = await obterEmpresa(cnpj, escopo);
  const { carregarBloqueios, emailBloqueado, empresaBloqueada, telefoneBloqueado } = await import(
    "./supressoes.server"
  );
  const bloqueios = await carregarBloqueios();
  const donos = empresa ? await nomesDosDonos([empresa]) : {};
  return {
    donoNome: empresa?.owner_id ? (donos[empresa.owner_id] ?? "Outro vendedor") : null,
    empresaBloqueada: empresaBloqueada(bloqueios, cnpj),
    emailsBloqueados: (empresa?.emails ?? []).filter((m) => emailBloqueado(bloqueios, m)),
    telefonesBloqueados: (empresa?.telefones ?? []).filter((t) => telefoneBloqueado(bloqueios, t)),
  };
}

export async function obterEmpresa(cnpj: string, escopo: Escopo) {
  // A mesma empresa pode ter uma linha de carteira em cada unidade do usuário
  // (unidades independentes) — v_carteira pode devolver mais de uma linha
  // para o mesmo cnpj, então não dá pra usar maybeSingle() aqui.
  const q = restringirPorUnidade(supabaseAdmin.from("v_carteira").select("*").eq("cnpj", chave(cnpj)), escopo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as Row[];
  const primeira = linhas[0];
  if (!primeira) return null;
  const daUnidadeAtiva = linhas.find((l) => l["unit_id"] === escopo.unidadeAtiva);
  return asCompany(daUnidadeAtiva ?? primeira);
}


/**
 * Unidades são independentes (cada uma como se fosse uma empresa à parte):
 * a mesma empresa pode estar na carteira de nenhuma, uma ou várias unidades
 * ao mesmo tempo, sem que uma saiba da outra. O que importa aqui é só a linha
 * de carteira da(s) unidade(s) do próprio usuário.
 */
async function carteiraNaMinhaUnidade(escopo: Escopo, cnpj: string) {
  const { data } = await supabaseAdmin.from("carteira").select("unit_id, owner_id").eq("cnpj", chave(cnpj));
  const linhas = (data ?? []) as Array<{ unit_id: string; owner_id: string | null }>;
  return linhas.find((l) => naUnidade(escopo, l.unit_id)) ?? null;
}

/**
 * Devolve a linha de carteira que este usuário pode editar (dono do lead na
 * sua própria unidade), ou lança erro se pertence a outro vendedor. Devolve
 * null quando a própria unidade do usuário nunca vinculou esta empresa.
 * A base é visível a todos, mas quem edita é o dono do lead. Empresa sem dono
 * segue livre; gestor, administrador de unidade e master passam por cima.
 */
export async function exigirEdicao(escopo: Escopo, cnpj: string): Promise<{ unit_id: string } | null> {
  const minha = await carteiraNaMinhaUnidade(escopo, cnpj);
  if (!minha) return null;

  if (gerenciaCarteira(escopo)) return { unit_id: minha.unit_id };
  const dono = minha.owner_id;
  if (!dono || dono === escopo.userId) return { unit_id: minha.unit_id };

  const { data: perfil } = await supabaseAdmin
    .from("profiles")
    .select("nome, email")
    .eq("id", dono)
    .maybeSingle();
  const nome = (perfil as { nome?: string | null; email?: string | null } | null);
  const quem = nome?.nome?.trim() || nome?.email || "outro vendedor";
  throw new Error(`Esta empresa está na carteira de ${quem}. Peça a liberação para editar.`);
}

/**
 * Restringe uma alteração em lote ao que o usuário pode mexer: primeiro o
 * território (unidade), depois a carteira (dele ou sem dono — gestor passa
 * por cima da carteira, mas não da unidade).
 */
function apenasEditaveis<T extends { or: (f: string) => T; in: (col: string, vals: string[]) => T }>(
  q: T,
  escopo: Escopo,
): T {
  q = restringirPorUnidade(q, escopo);
  if (gerenciaCarteira(escopo)) return q;
  return q.or(`owner_id.is.null,owner_id.eq.${escopo.userId}`);
}

export async function atualizarEmpresa(input: {
  escopo: Escopo;
  cnpj: string;
  status?: Status | undefined;
  notas?: string | undefined;
  listId?: string | null | undefined;
  productId?: string | null | undefined;
  tags?: string[] | undefined;
  prospectar?: boolean | undefined;
}) {
  const alvo = await exigirEdicao(input.escopo, input.cnpj);
  if (!alvo) throw new Error("Esta empresa ainda não foi vinculada a nenhuma unidade.");
  const patch: Row = {};
  if (input.status) patch["status"] = input.status;
  if (input.notas !== undefined) patch["notas"] = input.notas;
  if (input.listId !== undefined) patch["list_id"] = input.listId;
  if (input.productId !== undefined) patch["product_id"] = input.productId;
  if (input.tags) patch["tags"] = input.tags;
  if (input.prospectar !== undefined) patch["prospectar"] = input.prospectar;
  const { error } = await supabaseAdmin
    .from("carteira")
    .update(patch as never)
    .eq("cnpj", chave(input.cnpj))
    .eq("unit_id", alvo.unit_id);
  if (error) throw new Error(error.message);
  return obterEmpresa(input.cnpj, input.escopo);
}

/** Marca/desmarca empresas como "prospectar" (clientes potenciais). */
export async function marcarProspectar(cnpjs: string[], valor: boolean, escopo: Escopo) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { ok: true, total: 0, semPermissao: 0 };
  const q = supabaseAdmin.from("carteira").update({ prospectar: valor } as never).in("cnpj", chaves);
  const { data, error } = await apenasEditaveis(q, escopo).select("cnpj");
  if (error) throw new Error(error.message);
  const total = (data ?? []).length;
  return { ok: true, total, semPermissao: chaves.length - total };
}

export async function vincularEmpresasLista(cnpjs: string[], listId: string | null, escopo: Escopo) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { ok: true, total: 0, semPermissao: 0 };
  const q = supabaseAdmin.from("carteira").update({ list_id: listId } as never).in("cnpj", chaves);
  const { data, error } = await apenasEditaveis(q, escopo).select("cnpj");
  if (error) throw new Error(error.message);
  const total = (data ?? []).length;
  return { ok: true, total, semPermissao: chaves.length - total };
}

/**
 * O vendedor assume o lead. A trava é a própria condição do update
 * (`owner_id is null`): dois vendedores clicando ao mesmo tempo, só um leva.
 */
export async function assumirLeads(cnpjs: string[], escopo: Escopo) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { assumidos: 0, jaComDono: 0 };
  const q = supabaseAdmin
    .from("carteira")
    .update({ owner_id: escopo.userId, owner_desde: new Date().toISOString() } as never)
    .in("cnpj", chaves)
    .is("owner_id", null);
  const { data, error } = await restringirPorUnidade(q, escopo).select("cnpj");
  if (error) throw new Error(error.message);
  const assumidos = (data ?? []).length;
  return { assumidos, jaComDono: chaves.length - assumidos };
}

/** Devolve o lead para a base. O vendedor solta o que é dele; gestor solta qualquer um. */
export async function liberarLeads(cnpjs: string[], escopo: Escopo) {
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { liberados: 0, semPermissao: 0 };
  let q = supabaseAdmin
    .from("carteira")
    .update({ owner_id: null, owner_desde: null } as never)
    .in("cnpj", chaves);
  q = restringirPorUnidade(q, escopo);
  if (!gerenciaCarteira(escopo)) q = q.eq("owner_id", escopo.userId);
  const { data, error } = await q.select("cnpj");
  if (error) throw new Error(error.message);
  const liberados = (data ?? []).length;
  return { liberados, semPermissao: chaves.length - liberados };
}

/** Transferência de carteira: só quem gerencia equipe. */
export async function definirDono(cnpjs: string[], ownerId: string | null, escopo: Escopo) {
  if (!gerenciaCarteira(escopo))
    throw new Error("Apenas gestor, administrador de unidade ou master pode transferir carteira.");
  const chaves = cnpjs.map((c) => chave(c));
  if (chaves.length === 0) return { total: 0 };
  const q = supabaseAdmin
    .from("carteira")
    .update({
      owner_id: ownerId,
      owner_desde: ownerId ? new Date().toISOString() : null,
    } as never)
    .in("cnpj", chaves);
  const { data, error } = await restringirPorUnidade(q, escopo).select("cnpj");
  if (error) throw new Error(error.message);
  return { total: (data ?? []).length };
}

/** Nome fixo da unidade residual, onde ficam as empresas sem vínculo. */
export const UNIDADE_RESIDUAL_NOME = "Sem unidade (residual)";

/** Busca (ou cria) a unidade residual que guarda empresas desvinculadas. */
export async function unidadeResidual(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("units")
    .select("id")
    .eq("nome", UNIDADE_RESIDUAL_NOME)
    .maybeSingle();
  if (data?.id) return data.id;
  const { data: nova, error } = await supabaseAdmin
    .from("units")
    .insert({ nome: UNIDADE_RESIDUAL_NOME, cor: "slate", ativa: false } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return nova.id;
}

/**
 * "Excluir" aqui é desvincular da carteira da unidade — o cadastro (companies)
 * é compartilhado e continua existindo para as demais unidades/grupos. A linha
 * comercial vai para a unidade residual, sem dono, lista nem prospecção.
 */
export async function excluirEmpresa(cnpj: string, escopo: Escopo) {
  return desvincularEmpresas([cnpj], escopo);
}

/** Move as linhas de carteira selecionadas para a unidade residual. */
export async function desvincularEmpresas(cnpjs: string[], escopo: Escopo) {
  const residual = await unidadeResidual();
  let total = 0;
  for (const cnpj of cnpjs) {
    const alvo = await exigirEdicao(escopo, cnpj);
    if (!alvo || alvo.unit_id === residual) continue;
    const k = chave(cnpj);
    // Se a residual já tem esta empresa, basta remover a linha da unidade.
    const { data: existente } = await supabaseAdmin
      .from("carteira")
      .select("cnpj")
      .eq("cnpj", k)
      .eq("unit_id", residual)
      .maybeSingle();
    if (existente) {
      const { error } = await supabaseAdmin.from("carteira").delete().eq("cnpj", k).eq("unit_id", alvo.unit_id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("carteira")
        .update({
          unit_id: residual,
          owner_id: null,
          owner_desde: null,
          list_id: null,
          product_id: null,
          prospectar: false,
        } as never)
        .eq("cnpj", k)
        .eq("unit_id", alvo.unit_id);
      if (error) throw new Error(error.message);
    }
    total += 1;
  }
  return { ok: true, total };
}



export async function listarListas(escopo: Escopo): Promise<CompanyList[]> {
  const unidades = unidadesFiltro(escopo);
  let lq = supabaseAdmin.from("company_lists").select("*").order("created_at", { ascending: true });
  if (unidades) lq = lq.in("unit_id", unidades);
  const { data, error } = await lq;
  if (error) throw new Error(error.message);

  // Contagem na carteira de cada unidade (a mesma empresa pode estar em listas
  // diferentes conforme a unidade que a vinculou).
  const cq = restringirPorUnidade(supabaseAdmin.from("carteira").select("list_id"), escopo);
  const { data: rows } = await cq;
  const contagem: Record<string, number> = {};
  for (const r of (rows ?? []) as Array<{ list_id: string | null }>) {
    const k = r.list_id ?? "sem_lista";
    contagem[k] = (contagem[k] ?? 0) + 1;
  }

  return ((data ?? []) as unknown as CompanyList[]).map((l) => ({
    ...l,
    total: contagem[l.id] ?? 0,
  }));
}

/** Quantidade de empresas ainda sem lista, na carteira das unidades do usuário. */
export async function contarSemLista(escopo: Escopo) {
  const q = restringirPorUnidade(
    supabaseAdmin.from("carteira").select("cnpj", { count: "exact", head: true }).is("list_id", null),
    escopo,
  );
  const { count } = await q;
  return count ?? 0;
}

export async function criarLista(name: string, color: string, escopo: Escopo, unitId?: string | null) {
  const { data, error } = await supabaseAdmin
    .from("company_lists")
    .insert({ name, color, unit_id: unidadeDeGravacao(escopo, unitId) } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CompanyList;
}

export async function excluirLista(id: string, escopo: Escopo) {
  let q = supabaseAdmin.from("company_lists").delete().eq("id", id);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type FiltrosMercado = {
  escopo: Escopo;
  uf?: string | undefined;
  cidade?: string | undefined;
  cnae?: string | undefined;
  porte?: string | undefined;
  setor?: string | undefined;
  situacao?: string | undefined;
  listId?: string | undefined;
  status?: string | undefined;
  prospectar?: boolean | undefined;
  comTelefone?: boolean | undefined;
  comEmail?: boolean | undefined;
};

type LinhaMercado = {
  uf: string | null;
  cidade: string | null;
  porte_estimado: string | null;
  setores: string[] | null;
  cnae_descricao: string | null;
  melhor_telefone: string | null;
  melhor_site: string | null;
  email_receita: string | null;
  status: string | null;
};

function topN(mapa: Record<string, number>, n = 6) {
  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, qtd]) => ({ label, qtd }));
}

/**
 * Calculadora de mercado: quantas empresas da base (carteira da unidade)
 * cabem no recorte escolhido, com as quebras por UF, porte e atividade.
 */
export async function mercadoAgregado(input: FiltrosMercado) {
  const { escopo } = input;

  const { count: baseTotal } = await restringirPorUnidade(
    supabaseAdmin.from("carteira").select("cnpj", { count: "exact", head: true }),
    escopo,
  );

  let q = restringirPorUnidade(
    supabaseAdmin
      .from("v_carteira")
      .select(
        "uf, cidade, porte_estimado, setores, cnae_descricao, melhor_telefone, melhor_site, email_receita, status",
      ),
    escopo,
  );

  if (input.uf && input.uf !== "todos") q = q.eq("uf", input.uf);
  if (input.cidade?.trim()) q = q.ilike("cidade", `%${input.cidade.trim()}%`);
  if (input.cnae?.trim()) {
    const t = input.cnae.trim();
    q = q.or(`cnae_codigo.ilike.%${t}%,cnae_descricao.ilike.%${t}%`);
  }
  if (input.porte && input.porte !== "todos") q = q.eq("porte_estimado", input.porte);
  if (input.setor && input.setor !== "todos") q = q.contains("setores", [input.setor]);
  if (input.situacao && input.situacao !== "todas") q = q.ilike("situacao", input.situacao);
  if (input.listId === "sem_lista") q = q.is("list_id", null);
  else if (input.listId && input.listId !== "todas") q = q.eq("list_id", input.listId);
  if (input.status && input.status !== "todos") q = q.eq("status", input.status);
  if (input.prospectar) q = q.eq("prospectar", true);
  if (input.comTelefone) q = q.not("melhor_telefone", "is", null);
  if (input.comEmail) q = q.not("email_receita", "is", null);

  const { data, error } = await q.limit(20000);
  if (error) throw new Error(error.message);

  const linhas = (data ?? []) as LinhaMercado[];
  const porUf: Record<string, number> = {};
  const porPorte: Record<string, number> = {};
  const porAtividade: Record<string, number> = {};
  const porStatus: Record<string, number> = {};
  let comTelefone = 0;
  let comEmail = 0;
  let acionaveis = 0;

  for (const r of linhas) {
    if (r.uf) porUf[r.uf] = (porUf[r.uf] ?? 0) + 1;
    const porte = r.porte_estimado ?? "Não informado";
    porPorte[porte] = (porPorte[porte] ?? 0) + 1;
    const atividade = r.cnae_descricao ?? r.setores?.[0] ?? "Não informado";
    porAtividade[atividade] = (porAtividade[atividade] ?? 0) + 1;
    if (r.status) porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;
    const tel = Boolean(r.melhor_telefone);
    const mail = Boolean(r.email_receita);
    if (tel) comTelefone += 1;
    if (mail) comEmail += 1;
    if (tel || mail) acionaveis += 1;
  }

  return {
    baseTotal: baseTotal ?? 0,
    empresas: linhas.length,
    comTelefone,
    comEmail,
    acionaveis,
    porStatus,
    topUf: topN(porUf),
    topPorte: topN(porPorte),
    topAtividade: topN(porAtividade),
  };
}

export async function obterPainel(escopo: Escopo) {
  // Painel reflete a carteira da(s) unidade(s) do usuário (master vê tudo).
  const { count: total } = await restringirPorUnidade(
    supabaseAdmin.from("carteira").select("cnpj", { count: "exact", head: true }),
    escopo,
  );

  const { data: statusRows } = await restringirPorUnidade(
    supabaseAdmin.from("v_carteira").select("status, uf, created_at"),
    escopo,
  );

  const porStatus: Record<string, number> = {};
  const porUf: Record<string, number> = {};
  let ultimos30 = 0;
  const limite = Date.now() - 30 * 24 * 3600 * 1000;
  for (const r of (statusRows ?? []) as Array<{ status: string; uf: string | null; created_at: string }>) {
    porStatus[r.status] = (porStatus[r.status] ?? 0) + 1;
    if (r.uf) porUf[r.uf] = (porUf[r.uf] ?? 0) + 1;
    if (new Date(r.created_at).getTime() >= limite) ultimos30 += 1;
  }

  const { data: log } = await supabaseAdmin
    .from("query_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: recentes } = await restringirPorUnidade(supabaseAdmin.from("v_carteira").select("*"), escopo)
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: consultas } = await supabaseAdmin
    .from("query_log")
    .select("id", { count: "exact", head: true });

  return {
    total: total ?? 0,
    ultimos30,
    consultas: consultas ?? 0,
    porStatus,
    topUf: Object.entries(porUf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([uf, qtd]) => ({ uf, qtd })),
    log: (log ?? []) as unknown as QueryLogEntry[],
    recentes: ((recentes ?? []) as Row[]).map((r) => asCompany(r)),
  };
}

export async function exportarEmpresas(input: {
  escopo: Escopo;
  status?: string | undefined;
  uf?: string | undefined;
  listId?: string | undefined;
  busca?: string | undefined;
  grupoNatureza?: string | undefined;
}) {
  const out: Company[] = [];
  for (let page = 1; page <= 40; page += 1) {
    const { empresas } = await listarEmpresas({ ...input, page, perPage: 100 });
    out.push(...empresas);
    if (empresas.length < 100) break;
  }

  // Quem pediu para não ser contatado não sai em lista de prospecção.
  const { carregarBloqueios, emailBloqueado, empresaBloqueada, telefoneBloqueado } = await import(
    "./supressoes.server"
  );
  const bloqueios = await carregarBloqueios();
  return out
    .filter((e) => !empresaBloqueada(bloqueios, e.cnpj))
    .map((e) => ({
      ...e,
      emails: e.emails.filter((m) => !emailBloqueado(bloqueios, m)),
      telefones: e.telefones.filter((t) => !telefoneBloqueado(bloqueios, t)),
      melhor_telefone:
        e.melhor_telefone && telefoneBloqueado(bloqueios, e.melhor_telefone) ? null : e.melhor_telefone,
      email_receita:
        e.email_receita && emailBloqueado(bloqueios, e.email_receita) ? null : e.email_receita,
    }));
}

/** Consulta em lote por chaves misturadas (site, e-mail ou CNPJ). */
export async function consultarChaves(input: {
  escopo: Escopo;
  unitId?: string | null | undefined;
  chaves: string[];
  listId?: string | null | undefined;
}): Promise<{ itens: LookupItem[] }> {
  const vistos = new Set<string>();
  const chaves = input.chaves
    .map((c) => c.trim())
    .filter((c) => c && !vistos.has(c.toLowerCase()) && vistos.add(c.toLowerCase()));

  const cnpjs = chaves.filter((c) => formatCnpjApi(c));
  const outros = chaves.filter((c) => !formatCnpjApi(c));

  const itens: LookupItem[] = [];
  if (cnpjs.length) {
    const r = await consultarCnpjs({ escopo: input.escopo, unitId: input.unitId, cnpjs, listId: input.listId ?? null });
    itens.push(...r.itens);
  }
  for (const chaveTxt of outros.slice(0, 50)) {
    const ehEmail = chaveTxt.includes("@");
    const item = await consultarChave(
      ehEmail
        ? { escopo: input.escopo, unitId: input.unitId, email: chaveTxt, listId: input.listId ?? null }
        : {
            escopo: input.escopo,
            unitId: input.unitId,
            site: chaveTxt.replace(/^https?:\/\//i, "").replace(/\/.*$/, ""),
            listId: input.listId ?? null,
          },
    );
    itens.push({ ...item, cnpj: item.encontrada ? item.cnpj : chaveTxt });
  }
  return { itens };
}

/** Valores distintos existentes na base, para alimentar os filtros da busca avançada. */
export async function opcoesFiltro(escopo: Escopo) {
  const q = restringirPorUnidade(
    supabaseAdmin.from("v_carteira").select("uf, cidade, porte_estimado, situacao, setores"),
    escopo,
  );

  const { data } = await q.limit(5000);
  const ufs = new Set<string>();
  const cidades = new Set<string>();
  const portes = new Set<string>();
  const situacoes = new Set<string>();
  const setores = new Set<string>();
  for (const r of (data ?? []) as Array<{
    uf: string | null;
    cidade: string | null;
    porte_estimado: string | null;
    situacao: string | null;
    setores: string[] | null;
  }>) {
    if (r.uf) ufs.add(r.uf);
    if (r.cidade) cidades.add(r.cidade);
    if (r.porte_estimado) portes.add(r.porte_estimado);
    if (r.situacao) situacoes.add(r.situacao);
    for (const s of r.setores ?? []) if (s) setores.add(s);
  }
  const ord = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return {
    ufs: ord(ufs),
    cidades: ord(cidades).slice(0, 300),
    portes: ord(portes),
    situacoes: ord(situacoes),
    setores: ord(setores).slice(0, 200),
  };
}

/** Lê o status da chave da API Econodata salva no banco. Nunca retorna o valor completo. */
export async function obterStatusChaveApi() {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "econodata_api_key")
    .maybeSingle();

  if (error) throw new Error(error.message);

  const value = data?.value ?? "";
  const env = process.env["ECONODATA_API_KEY"] ?? "";
  const configured = Boolean(env || value);
  const source = value ? "database" : env ? "env" : "none";
  const active = value || env;
  const masked = active ? "••••••••••••••••" + active.slice(-4) : null;

  return { configured, source, masked };
}

/** Salva a chave da API Econodata no banco. */
export async function salvarChaveApi(key: string) {
  const { error } = await supabaseAdmin.from("app_settings").upsert(
    { key: "econodata_api_key", value: key } as never,
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Migra a chave da variável de ambiente para o banco, quando disponível. */
export async function migrarChaveDoAmbiente() {
  const env = process.env["ECONODATA_API_KEY"];
  if (!env) throw new Error("Nenhuma chave encontrada nas variáveis de ambiente.");
  await salvarChaveApi(env);
  return { ok: true, integracao: null };
}

/** Testa uma chave candidata contra a Econodata sem persisti-la. */
export async function testarChaveApi(key: string) {
  const { validarToken } = await import("./econodata.server");
  try {
    const info = await validarToken(key);
    return { ok: true as const, cliente: info?.cd_cliente ?? null, integracao: info?.nm_integracao ?? null };
  } catch (e) {
    const err = e as EconodataError;
    return { ok: false as const, erro: err.message ?? "Falha desconhecida", status: err.status ?? 0 };
  }
}

// =============================================================================
// Atividades de prospecção
// =============================================================================

export type ActivityInput = {
  company_cnpj: string;
  tipo: ActivityType;
  observacao?: string | undefined;
  responsavel?: string | null | undefined;
  scheduled_at?: string | null | undefined;
  completed_at?: string | null | undefined;
  product_id?: string | null | undefined;
};

function asActivity(row: Row): ProspectionActivity {
  return row as unknown as ProspectionActivity;
}

export async function listarAtividades(input: {
  escopo: Escopo;
  cnpj?: string | undefined;
  tipo?: string | undefined;
  de?: string | undefined;
  ate?: string | undefined;
  responsavel?: string | undefined;
  pendente?: boolean | undefined;
  productId?: string | undefined;
  limit?: number | undefined;
}) {
  let q = supabaseAdmin.from("prospection_activities").select("*").order("created_at", { ascending: false });
  const unidades = unidadesFiltro(input.escopo);
  if (unidades) q = q.in("unit_id", unidades);
  if (input.cnpj) q = q.eq("company_cnpj", chave(input.cnpj));
  if (input.tipo && input.tipo !== "todos") q = q.eq("tipo", input.tipo);
  if (input.de) q = q.gte("created_at", input.de);
  if (input.ate) q = q.lte("created_at", `${input.ate}T23:59:59`);
  if (input.responsavel?.trim()) q = q.ilike("responsavel", `%${input.responsavel.trim()}%`);
  if (input.pendente) q = q.is("completed_at", null);
  if (input.productId === "sem_produto") q = q.is("product_id", null);
  else if (input.productId && input.productId !== "todos") q = q.eq("product_id", input.productId);
  if (input.limit) q = q.limit(input.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => asActivity(r as Row));
}

export async function criarAtividade(input: ActivityInput, escopo: Escopo) {
  const empresa = await obterEmpresa(input.company_cnpj, escopo);
  if (!empresa) throw new Error("Empresa não encontrada nas suas unidades.");
  await exigirEdicao(escopo, input.company_cnpj);

  // Registrar um contato numa empresa que pediu opt-out é justamente o que a
  // lista de supressão existe para impedir. Anotação interna segue permitida.
  if (input.tipo !== "nota") {
    const { carregarBloqueios, empresaBloqueada } = await import("./supressoes.server");
    if (empresaBloqueada(await carregarBloqueios(), input.company_cnpj))
      throw new Error("Esta empresa pediu para não ser contatada (opt-out registrado).");
  }
  const payload: Row = {
    unit_id: (empresa as unknown as { unit_id: string | null }).unit_id ?? escopo.unidadeAtiva,
    company_cnpj: chave(input.company_cnpj),
    tipo: input.tipo,
    observacao: input.observacao ?? "",
    responsavel: input.responsavel ?? null,
    scheduled_at: input.scheduled_at ?? null,
    completed_at: input.completed_at ?? null,
    product_id: input.product_id ?? (empresa as unknown as { product_id: string | null }).product_id ?? null,
  };
  const { data, error } = await supabaseAdmin.from("prospection_activities").insert(payload as never).select("*").single();
  if (error) throw new Error(error.message);
  return asActivity(data as Row);
}

export const MOTIVOS_ENCERRAMENTO = ["ganhou", "perdeu", "sem_fit"] as const;
export type MotivoEncerramento = (typeof MOTIVOS_ENCERRAMENTO)[number];

const ENCERRAMENTO: Record<MotivoEncerramento, { status: Status; texto: string }> = {
  ganhou: { status: "cliente", texto: "Encerrado: virou cliente." },
  perdeu: { status: "descartado", texto: "Encerrado: perdemos a oportunidade." },
  sem_fit: { status: "descartado", texto: "Encerrado: empresa não tem perfil." },
};

/**
 * Registra o que aconteceu e obriga a definir o que vem depois: ou fica uma
 * próxima ação agendada, ou a prospecção é encerrada com um motivo. Sem isso o
 * lead some da vista — que é a maior fonte de perda em prospecção ativa.
 */
export async function registrarContato(
  input: ActivityInput & {
    proxima?: { tipo: ActivityType; quando: string } | null | undefined;
    encerrar?: MotivoEncerramento | null | undefined;
  },
  escopo: Escopo,
) {
  if (!input.proxima && !input.encerrar)
    throw new Error("Defina a próxima ação ou encerre a prospecção desta empresa.");
  if (input.proxima && input.encerrar)
    throw new Error("Escolha uma coisa só: agendar a próxima ação ou encerrar.");

  const contato = await criarAtividade(
    { ...input, completed_at: input.completed_at ?? new Date().toISOString() },
    escopo,
  );

  if (input.proxima) {
    const proxima = await criarAtividade(
      {
        company_cnpj: input.company_cnpj,
        tipo: input.proxima.tipo,
        observacao: "",
        responsavel: input.responsavel ?? null,
        scheduled_at: input.proxima.quando,
        completed_at: null,
        product_id: input.product_id ?? null,
      },
      escopo,
    );
    return { contato, proxima, encerrado: null };
  }

  const { status, texto } = ENCERRAMENTO[input.encerrar as MotivoEncerramento];
  await atualizarEmpresa({ escopo, cnpj: input.company_cnpj, status });
  await criarAtividade(
    {
      company_cnpj: input.company_cnpj,
      tipo: "nota",
      observacao: texto,
      responsavel: input.responsavel ?? null,
      completed_at: new Date().toISOString(),
    },
    escopo,
  );
  return { contato, proxima: null, encerrado: input.encerrar };
}

export type Pendencia = ProspectionActivity & {
  empresa: string;
  cnpj: string;
  meu: boolean;
};

/**
 * Fila de trabalho: o que já venceu, o que é para hoje e o que vem a seguir.
 * Atrasado é medido pelo fim do dia agendado, não pela hora — quem marcou para
 * hoje de manhã não deve aparecer como atrasado à tarde.
 */
export async function listarPendencias(escopo: Escopo, apenasMinhas = false) {
  let q = supabaseAdmin
    .from("prospection_activities")
    .select("*")
    .is("completed_at", null)
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true })
    .limit(300);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as Row[];
  const cnpjs = [...new Set(linhas.map((r) => String(r["company_cnpj"])))];

  // Nome da empresa é cadastral (companies, compartilhado); dono do lead é
  // comercial (carteira, por unidade) — a atividade já guarda seu próprio unit_id.
  const [{ data: empresasRows }, { data: carteiraRows }] = cnpjs.length
    ? await Promise.all([
        supabaseAdmin.from("companies").select("cnpj, razao_social, nome_fantasia").in("cnpj", cnpjs),
        supabaseAdmin.from("carteira").select("cnpj, unit_id, owner_id").in("cnpj", cnpjs),
      ])
    : [{ data: [] }, { data: [] }];

  const nomes = new Map<string, { razao_social: string; nome_fantasia: string | null }>();
  for (const r of (empresasRows ?? []) as Row[])
    nomes.set(String(r["cnpj"]), {
      razao_social: String(r["razao_social"] ?? ""),
      nome_fantasia: r["nome_fantasia"] as string | null,
    });

  const donoPorCnpjUnidade = new Map<string, string | null>();
  for (const r of (carteiraRows ?? []) as Row[])
    donoPorCnpjUnidade.set(`${r["cnpj"]}::${r["unit_id"]}`, r["owner_id"] as string | null);

  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const atrasadas: Pendencia[] = [];
  const hoje: Pendencia[] = [];
  const proximas: Pendencia[] = [];

  for (const row of linhas) {
    const cnpj = String(row["company_cnpj"] ?? "");
    const unitId = row["unit_id"] as string | null;
    const nomeEmpresa = nomes.get(cnpj);
    const dono = unitId ? (donoPorCnpjUnidade.get(`${cnpj}::${unitId}`) ?? null) : null;
    const meu = dono === escopo.userId;
    if (apenasMinhas && !meu) continue;

    const item: Pendencia = {
      ...asActivity(row),
      empresa: nomeEmpresa?.nome_fantasia?.trim() || nomeEmpresa?.razao_social || "Empresa",
      cnpj,
      meu,
    };
    const quando = new Date(item.scheduled_at as string);
    if (quando < hojeFim && quando.toDateString() !== hojeFim.toDateString()) atrasadas.push(item);
    else if (quando <= hojeFim) hoje.push(item);
    else proximas.push(item);
  }

  return { atrasadas, hoje, proximas: proximas.slice(0, 50) };
}

export async function atualizarAtividade(
  id: string,
  patch: Partial<Omit<ActivityInput, "company_cnpj" | "tipo">>,
  escopo: Escopo,
) {
  const payload: Row = {};
  if (patch.observacao !== undefined) payload["observacao"] = patch.observacao;
  if (patch.responsavel !== undefined) payload["responsavel"] = patch.responsavel;
  if (patch.scheduled_at !== undefined) payload["scheduled_at"] = patch.scheduled_at ?? null;
  if (patch.completed_at !== undefined) payload["completed_at"] = patch.completed_at ?? null;
  if (patch.product_id !== undefined) payload["product_id"] = patch.product_id ?? null;
  if (Object.keys(payload).length === 0) return null;
  let uq = supabaseAdmin.from("prospection_activities").update(payload as never).eq("id", id);
  const unidadesUp = unidadesFiltro(escopo);
  if (unidadesUp) uq = uq.in("unit_id", unidadesUp);
  const { data, error } = await uq.select("*").single();
  if (error) throw new Error(error.message);
  return data ? asActivity(data as Row) : null;
}


export async function excluirAtividade(id: string, escopo: Escopo) {
  let q = supabaseAdmin.from("prospection_activities").delete().eq("id", id);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function obterUltimasAtividadesPorEmpresa(escopo: Escopo) {
  let q = supabaseAdmin
    .from("prospection_activities")
    .select("company_cnpj, tipo, created_at, completed_at");
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.in("unit_id", unidades);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const map = new Map<string, { tipo: ActivityType; created_at: string }>();
  for (const r of (data ?? []) as Array<{ company_cnpj: string; tipo: ActivityType; created_at: string }>) {
    if (!map.has(r.company_cnpj)) map.set(r.company_cnpj, { tipo: r.tipo, created_at: r.created_at });
  }
  return map;
}

export async function funilDados(escopo: Escopo) {
  const q = restringirPorUnidade(supabaseAdmin.from("v_carteira").select("*").eq("prospectar", true), escopo);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  const empresas: Company[] = ((data ?? []) as Row[]).map((r) => asCompany(r));
  const ultimas = await obterUltimasAtividadesPorEmpresa(escopo);
  return {
    empresas,
    ultimas: Object.fromEntries(
      Array.from(ultimas.entries()).map(([k, v]) => [k, v]),
    ) as Record<string, { tipo: ActivityType; created_at: string }>,
  };
}

export async function relatorioAtividades(input: { escopo: Escopo; de?: string | undefined; ate?: string | undefined }) {
  const atividades = await listarAtividades({ escopo: input.escopo, de: input.de, ate: input.ate, limit: 10000 });
  const porTipo: Record<string, number> = {};
  const porDia: Record<string, number> = {};
  let pendentes = 0;
  let concluidas = 0;
  for (const a of atividades) {
    porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
    const dia = a.created_at.slice(0, 10);
    porDia[dia] = (porDia[dia] ?? 0) + 1;
    if (a.completed_at) concluidas += 1;
    else pendentes += 1;
  }
  const dias = Object.keys(porDia).sort();
  return { total: atividades.length, porTipo, porDia, dias, pendentes, concluidas };
}

