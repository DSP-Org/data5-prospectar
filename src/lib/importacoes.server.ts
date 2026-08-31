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

/** Etapa 1: grava a fila e devolve o job criado. */
export async function criarImportacao(input: {
  escopo: Escopo;
  arquivo: string;
  cnpjs: string[];
  listId?: string | null | undefined;
  unitId?: string | null | undefined;
}): Promise<{ jobId: string; total: number; invalidos: number }> {
  const validos: string[] = [];
  let invalidos = 0;
  for (const raw of input.cnpjs) {
    const f = formatCnpjApi(raw);
    if (!f) {
      if (raw.trim()) invalidos += 1;
      continue;
    }
    if (!validos.includes(f)) validos.push(f);
  }
  if (validos.length === 0) throw new Error("Nenhum CNPJ válido no arquivo.");

  const unit = unidadeDeGravacao(input.escopo, input.unitId);
  const { data: job, error } = await db()
    .from("import_jobs")
    .insert({
      arquivo: input.arquivo || "importacao.csv",
      list_id: input.listId ?? null,
      unit_id: unit,
      criado_por: input.escopo.userId,
      total: validos.length,
      status: "pendente",
    })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Falha ao criar a importação.");

  // Grava os itens em blocos para não estourar o tamanho da requisição.
  const TAM = 500;
  for (let i = 0; i < validos.length; i += TAM) {
    const linhas = validos.slice(i, i + TAM).map((cnpj) => ({ job_id: job.id, cnpj }));
    const { error: e2 } = await db().from("import_items").insert(linhas);
    if (e2) throw new Error(e2.message);
  }

  return { jobId: job.id as string, total: validos.length, invalidos };
}

async function jobVisivel(jobId: string, escopo: Escopo): Promise<ImportJob> {
  const { data } = await db().from("import_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!data) throw new Error("Importação não encontrada.");
  const unidades = unidadesFiltro(escopo);
  if (unidades && data.unit_id && !unidades.includes(data.unit_id))
    throw new Error("Importação de outra unidade.");
  return data as ImportJob;
}

async function recontar(jobId: string) {
  const { data } = await db().from("import_items").select("status").eq("job_id", jobId);
  const linhas = (data ?? []) as { status: string }[];
  const conta = (s: string) => linhas.filter((l) => l.status === s).length;
  const pendentes = conta("pendente");
  const patch = {
    total: linhas.length,
    concluidos: conta("concluido"),
    nao_encontrados: conta("nao_encontrado"),
    erros: conta("erro"),
    status: pendentes > 0 ? "processando" : "concluido",
  };
  await db().from("import_jobs").update(patch).eq("id", jobId);
  return { ...patch, pendentes };
}

/** Etapa 2: processa um bloco de pendentes do job. */
export async function processarLote(input: {
  escopo: Escopo;
  jobId: string;
  tamanho?: number | undefined;
}) {
  const job = await jobVisivel(input.jobId, input.escopo);
  const tamanho = Math.min(Math.max(input.tamanho ?? 15, 1), 30);

  const { data } = await db()
    .from("import_items")
    .select("id, cnpj")
    .eq("job_id", job.id)
    .eq("status", "pendente")
    .order("created_at", { ascending: true })
    .limit(tamanho);

  let pendentes = (data ?? []) as { id: string; cnpj: string }[];
  if (pendentes.length === 0) {
    const resumo = await recontar(job.id);
    return { processados: 0, ...resumo };
  }

  await db().from("import_jobs").update({ status: "processando" }).eq("id", job.id);

  // Se o CNPJ já está no cadastro compartilhado, pula a consulta e só garante o vínculo com esta unidade.
  const { data: jaExistem } = await db()
    .from("companies")
    .select("cnpj")
    .in("cnpj", pendentes.map((p) => p.cnpj));
  const existentes = new Set(((jaExistem ?? []) as { cnpj: string }[]).map((c) => c.cnpj));
  const pulados = pendentes.filter((p) => existentes.has(p.cnpj));
  if (pulados.length && job.unit_id) {
    const { vincularCarteira } = await import("./repo.server");
    await vincularCarteira(pulados.map((p) => p.cnpj), job.unit_id, job.list_id);
  }
  for (const item of pulados) {
    await db()
      .from("import_items")
      .update({ status: "concluido", erro: null })
      .eq("id", item.id);
  }
  pendentes = pendentes.filter((p) => !existentes.has(p.cnpj));
  if (pendentes.length === 0) {
    const resumo = await recontar(job.id);
    return { processados: pulados.length, ...resumo };
  }

  try {
    const r = await consultarCnpjs({
      escopo: input.escopo,
      cnpjs: pendentes.map((p) => p.cnpj),
      listId: job.list_id,
      unitId: job.unit_id,
      salvar: true,
    });

    for (const item of pendentes) {
      const achado = r.itens.find((i) => i.cnpj.replace(/\D/g, "") === item.cnpj.replace(/\D/g, ""));
      const status = achado?.encontrada ? "concluido" : "nao_encontrado";
      await db()
        .from("import_items")
        .update({
          status,
          erro: achado?.encontrada ? null : (achado?.erro ?? "Não encontrada nas fontes ativas."),
          tentativas: 1,
        })
        .eq("id", item.id);
    }
  } catch (e) {
    const msg = (e as Error).message;
    for (const item of pendentes) {
      await db()
        .from("import_items")
        .update({ status: "erro", erro: msg, tentativas: 1 })
        .eq("id", item.id);
    }
  }

  const resumo = await recontar(job.id);
  return { processados: pendentes.length + pulados.length, ...resumo };
}

export async function statusImportacao(jobId: string, escopo: Escopo) {
  const job = await jobVisivel(jobId, escopo);
  const { data } = await db().from("import_items").select("status").eq("job_id", jobId);
  const linhas = (data ?? []) as { status: string }[];
  const conta = (s: string) => linhas.filter((l) => l.status === s).length;
  return {
    job,
    pendentes: conta("pendente"),
    concluidos: conta("concluido"),
    naoEncontrados: conta("nao_encontrado"),
    erros: conta("erro"),
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
