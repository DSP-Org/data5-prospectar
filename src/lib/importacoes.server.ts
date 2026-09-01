// Fila de importação de CNPJs: o arquivo é recebido primeiro (etapa 1) e o
// enriquecimento acontece depois, em blocos, com retomada e reprocessamento.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { consultarCnpjs } from "./repo.server";
import { formatCnpjApi } from "./econodata.server";
import { type Escopo, unidadeDeGravacao, unidadesFiltro } from "./escopo.server";

export type ImportJob = {
  id: string;
  arquivo: string;
  list_id: string | null;
  unit_id: string | null;
  criado_por: string | null;
  total: number;
  concluidos: number;
  nao_encontrados: number;
  erros: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ImportItem = {
  id: string;
  job_id: string;
  cnpj: string;
  status: string;
  erro: string | null;
  tentativas: number;
};

const db = () => supabaseAdmin as unknown as {
  from: (t: string) => any;
};

const JA_NA_BASE = "Já estava na base — só vinculado à unidade.";
const SEM_DADOS = "Cadastrado sem dados — aguardando enriquecimento.";
/** Item cadastrado que ainda não passou pelas fontes externas. */
const A_ENRIQUECER = "a_enriquecer";

/** Quebra a lista em blocos (limite do PostgREST em filtros `in`). */
function blocos<T>(itens: T[], tam: number): T[][] {
  const saida: T[][] = [];
  for (let i = 0; i < itens.length; i += tam) saida.push(itens.slice(i, i + tam));
  return saida;
}

/**
 * Etapa 1: grava a fila e devolve o job criado.
 *
 * Quem já está no cadastro compartilhado é resolvido aqui mesmo, em massa
 * (só cria o vínculo com a unidade/lista) e nunca entra como pendente — a
 * fila de processamento fica apenas com os CNPJs realmente novos.
 */
export async function criarImportacao(input: {
  escopo: Escopo;
  arquivo: string;
  cnpjs: string[];
  listId?: string | null | undefined;
  unitId?: string | null | undefined;
}): Promise<{
  jobId: string;
  total: number;
  invalidos: number;
  jaNaBase: number;
  novos: number;
}> {
  const validos: string[] = [];
  const vistos = new Set<string>();
  let invalidos = 0;
  for (const raw of input.cnpjs) {
    const f = formatCnpjApi(raw);
    if (!f) {
      if (raw.trim()) invalidos += 1;
      continue;
    }
    if (!vistos.has(f)) {
      vistos.add(f);
      validos.push(f);
    }
  }
  if (validos.length === 0) throw new Error("Nenhum CNPJ válido no arquivo.");

  const unit = unidadeDeGravacao(input.escopo, input.unitId);

  // Separa, antes de enfileirar, quem já está no cadastro compartilhado.
  const existentes = new Set<string>();
  for (const bloco of blocos(validos, 400)) {
    const { data } = await db().from("companies").select("cnpj").in("cnpj", bloco);
    for (const r of (data ?? []) as { cnpj: string }[]) existentes.add(r.cnpj);
  }
  const jaNaBase = validos.filter((c) => existentes.has(c));
  const novos = validos.filter((c) => !existentes.has(c));

  const { data: job, error } = await db()
    .from("import_jobs")
    .insert({
      arquivo: input.arquivo || "importacao.csv",
      list_id: input.listId ?? null,
      unit_id: unit,
      criado_por: input.escopo.userId,
      total: validos.length,
      concluidos: jaNaBase.length,
      status: novos.length > 0 ? "aguardando" : "concluido",
    })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Falha ao criar a importação.");

  // Cadastro imediato dos novos: só o CNPJ, sem consultar fonte nenhuma.
  if (novos.length) {
    for (const bloco of blocos(novos, 500)) {
      const { error: e1 } = await db()
        .from("companies")
        .upsert(
          bloco.map((cnpj) => ({ cnpj })),
          { onConflict: "cnpj", ignoreDuplicates: true },
        );
      if (e1) throw new Error(e1.message);
    }
  }

  // Vincula em massa à unidade/lista: nenhuma consulta externa, nenhum crédito.
  if (unit) {
    const { vincularCarteira } = await import("./repo.server");
    for (const bloco of blocos(validos, 500))
      await vincularCarteira(bloco, unit, input.listId ?? null);
  }

  // Grava os itens em blocos para não estourar o tamanho da requisição.
  const TAM = 500;
  const linhasTodas = [
    ...jaNaBase.map((cnpj) => ({
      job_id: job.id,
      cnpj,
      status: "concluido",
      erro: JA_NA_BASE,
    })),
    ...novos.map((cnpj) => ({ job_id: job.id, cnpj, status: A_ENRIQUECER, erro: SEM_DADOS })),
  ];
  for (const linhas of blocos(linhasTodas, TAM)) {
    const { error: e2 } = await db().from("import_items").insert(linhas);
    if (e2) throw new Error(e2.message);
  }

  return {
    jobId: job.id as string,
    total: validos.length,
    invalidos,
    jaNaBase: jaNaBase.length,
    novos: novos.length,
  };
}

async function jobVisivel(jobId: string, escopo: Escopo): Promise<ImportJob> {
  const { data } = await db().from("import_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!data) throw new Error("Importação não encontrada.");
  const unidades = unidadesFiltro(escopo);
  if (unidades && data.unit_id && !unidades.includes(data.unit_id))
    throw new Error("Importação de outra unidade.");
  return data as ImportJob;
}

/** Contagem agregada no banco (não baixa linhas: importações grandes passavam do limite de 1.000). */
async function contarPorStatus(jobId: string) {
  const conta = async (status?: string) => {
    let q = db().from("import_items").select("id", { count: "exact", head: true }).eq("job_id", jobId);
    if (status) q = q.eq("status", status);
    const { count } = await q;
    return (count ?? 0) as number;
  };
  const [total, pendentes, aEnriquecer, concluidos, naoEncontrados, erros] = await Promise.all([
    conta(),
    conta("pendente"),
    conta(A_ENRIQUECER),
    conta("concluido"),
    conta("nao_encontrado"),
    conta("erro"),
  ]);
  return { total, pendentes: pendentes + aEnriquecer, concluidos, naoEncontrados, erros };
}

async function recontar(jobId: string) {
  const c = await contarPorStatus(jobId);
  const patch = {
    total: c.total,
    concluidos: c.concluidos,
    nao_encontrados: c.naoEncontrados,
    erros: c.erros,
    status: c.pendentes > 0 ? "aguardando" : "concluido",
  };
  await db().from("import_jobs").update(patch).eq("id", jobId);
  return { ...patch, pendentes: c.pendentes };
}


/** Marca um grupo inteiro de itens de uma vez (uma escrita por grupo, não por CNPJ). */
async function marcar(ids: string[], patch: Record<string, unknown>) {
  if (ids.length === 0) return;
  for (const bloco of blocos(ids, 200))
    await db().from("import_items").update(patch).in("id", bloco);
}

/** Etapa 2 (opcional): enriquece um bloco de CNPJs já cadastrados pelo job. */
export async function processarLote(input: {
  escopo: Escopo;
  jobId: string;
  tamanho?: number | undefined;
}) {
  const job = await jobVisivel(input.jobId, input.escopo);
  const tamanho = Math.min(Math.max(input.tamanho ?? 30, 1), 60);

  const { data } = await db()
    .from("import_items")
    .select("id, cnpj")
    .eq("job_id", job.id)
    .in("status", ["pendente", A_ENRIQUECER])
    .order("created_at", { ascending: true })
    .limit(tamanho);

  const pendentes = (data ?? []) as { id: string; cnpj: string }[];
  if (pendentes.length === 0) {
    const resumo = await recontar(job.id);
    return { processados: 0, ...resumo };
  }

  await db().from("import_jobs").update({ status: "processando" }).eq("id", job.id);



  try {
    const r = await consultarCnpjs({
      escopo: input.escopo,
      cnpjs: pendentes.map((p) => p.cnpj),
      listId: job.list_id,
      unitId: job.unit_id,
      salvar: true,
    });

    const ok: string[] = [];
    const semRetorno: { id: string; erro: string }[] = [];
    for (const item of pendentes) {
      const achado = r.itens.find((i) => i.cnpj.replace(/\D/g, "") === item.cnpj.replace(/\D/g, ""));
      if (achado?.encontrada) ok.push(item.id);
      else semRetorno.push({ id: item.id, erro: achado?.erro ?? "Não encontrada nas fontes ativas." });
    }
    await marcar(ok, { status: "concluido", erro: null, tentativas: 1 });
    // Agrupa por mensagem para continuar sendo poucas escritas.
    const porErro = new Map<string, string[]>();
    for (const s of semRetorno) porErro.set(s.erro, [...(porErro.get(s.erro) ?? []), s.id]);
    for (const [erro, ids] of porErro)
      await marcar(ids, { status: "nao_encontrado", erro, tentativas: 1 });
  } catch (e) {
    const msg = (e as Error).message;
    await marcar(pendentes.map((p) => p.id), { status: "erro", erro: msg, tentativas: 1 });
  }

  const resumo = await recontar(job.id);
  return { processados: pendentes.length + pulados.length, ...resumo };
}

export async function statusImportacao(jobId: string, escopo: Escopo) {
  const job = await jobVisivel(jobId, escopo);
  const c = await contarPorStatus(jobId);
  return {
    job,
    pendentes: c.pendentes,
    concluidos: c.concluidos,
    naoEncontrados: c.naoEncontrados,
    erros: c.erros,
  };
}


export async function listarImportacoes(escopo: Escopo) {
  let q = db().from("import_jobs").select("*").order("created_at", { ascending: false }).limit(50);
  const unidades = unidadesFiltro(escopo);
  if (unidades) q = q.or(`unit_id.is.null,unit_id.in.(${unidades.join(",")})`);
  const { data } = await q;
  return (data ?? []) as ImportJob[];
}

export async function itensImportacao(
  jobId: string,
  escopo: Escopo,
  status?: string | undefined,
) {
  await jobVisivel(jobId, escopo);
  let q = db()
    .from("import_items")
    .select("id, cnpj, status, erro, tentativas")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as ImportItem[];
}

/** Recoloca na fila apenas os itens que falharam. */
export async function reprocessarFalhas(jobId: string, escopo: Escopo) {
  await jobVisivel(jobId, escopo);
  const { data } = await db()
    .from("import_items")
    .update({ status: "pendente", erro: null })
    .eq("job_id", jobId)
    .in("status", ["erro", "nao_encontrado"])
    .select("id");
  await recontar(jobId);
  return { refila: (data ?? []).length as number };
}

export async function excluirImportacao(jobId: string, escopo: Escopo) {
  await jobVisivel(jobId, escopo);
  await db().from("import_jobs").delete().eq("id", jobId);
  return { ok: true };
}
