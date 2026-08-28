import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  excluirImportacaoFn,
  itensImportacaoFn,
  listarImportacoesFn,
  processarLoteFn,
  reprocessarFalhasFn,
} from "@/lib/importacoes.functions";

export const Route = createFileRoute("/_authenticated/importacoes")({
  component: Pagina,
  head: () => ({
    meta: [
      { title: "Importações de CNPJ | Prospectar360" },
      {
        name: "description",
        content:
          "Acompanhe as importações de CNPJ: progresso, empresas encontradas e itens que falharam, com reprocessamento.",
      },
      { property: "og:title", content: "Importações de CNPJ | Prospectar360" },
      {
        property: "og:description",
        content: "Fila de importação de CNPJs com progresso e reprocessamento de falhas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Job = {
  id: string;
  arquivo: string;
  total: number;
  concluidos: number;
  nao_encontrados: number;
  erros: number;
  status: string;
  created_at: string;
};

function Pagina() {
  const qc = useQueryClient();
  const [ativo, setAtivo] = useState<string | null>(null);
  const [rodando, setRodando] = useState<string | null>(null);
  const parar = useRef(false);

  function pausar() {
    parar.current = true;
    autoIniciado.current = true;
    toast.info("Pausando após o bloco atual…");
  }

  const processar = useServerFn(processarLoteFn);
  const reprocessar = useServerFn(reprocessarFalhasFn);
  const excluir = useServerFn(excluirImportacaoFn);
  const listar = useServerFn(listarImportacoesFn);
  const itens = useServerFn(itensImportacaoFn);

  const jobs = useQuery({
    queryKey: ["importacoes"],
    queryFn: () => listar(undefined as never),
    refetchInterval: rodando ? 3000 : false,
  });

  const falhas = useQuery({
    queryKey: ["importacao-itens", ativo],
    queryFn: () => itens({ data: { jobId: ativo as string } }),
    enabled: Boolean(ativo),
  });

  async function rodar(jobId: string) {
    parar.current = false;
    setRodando(jobId);
    try {
      for (;;) {
        if (parar.current) break;
        const r = await processar({ data: { jobId, tamanho: 15 } });
        qc.invalidateQueries({ queryKey: ["importacoes"] });
        if (r.processados === 0 || r.pendentes === 0) break;
      }
      toast.success(parar.current ? "Importação pausada." : "Importação processada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRodando(null);
      qc.invalidateQueries({ queryKey: ["importacoes"] });
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["painel"] });
      if (ativo) qc.invalidateQueries({ queryKey: ["importacao-itens", ativo] });
    }
  }

  // Retoma sozinho a primeira importação com pendências ao abrir a tela.
  const autoIniciado = useRef(false);
  useEffect(() => {
    if (autoIniciado.current || rodando || !jobs.data) return;
    const alvo = (jobs.data as unknown as Job[]).find(
      (j) => j.total - (j.concluidos + j.nao_encontrados + j.erros) > 0,
    );
    if (!alvo) return;
    autoIniciado.current = true;
    void rodar(alvo.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.data]);


  useEffect(() => () => void (parar.current = true), []);

  function baixarFalhas() {
    const linhas = (falhas.data ?? []).filter((i) => i.status !== "concluido");
    const csv = ["CNPJ;Situacao;Erro"]
      .concat(linhas.map((i) => `${i.cnpj};${i.status};${(i.erro ?? "").replace(/[;\n]/g, " ")}`))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "importacao-falhas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const lista = (jobs.data ?? []) as unknown as Job[];

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        <header>
          <h1 className="font-display text-2xl font-semibold">Importações</h1>
          <p className="text-sm text-muted-foreground">
            O arquivo é recebido na hora e o enriquecimento roda depois, em blocos. Você pode
            retomar de onde parou e reprocessar os CNPJs que falharam.
          </p>
        </header>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma importação ainda. Envie um arquivo em Base de Empresas → Importar.
          </p>
        ) : null}

        <div className="space-y-4">
          {lista.map((j) => {
            const feitos = j.concluidos + j.nao_encontrados + j.erros;
            const pct = j.total ? Math.round((feitos / j.total) * 100) : 0;
            const pendentes = Math.max(j.total - feitos, 0);
            return (
              <Card key={j.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">{j.arquivo}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(j.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={pendentes === 0 ? "secondary" : "default"}>
                    {pendentes === 0 ? "Concluída" : `${pendentes} pendente(s)`}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} />
                  <p className="text-sm text-muted-foreground">
                    {feitos} de {j.total} processados · {j.concluidos} importada(s) ·{" "}
                    {j.nao_encontrados} sem retorno · {j.erros} com erro
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rodando === j.id ? (
                      <Button size="sm" variant="secondary" onClick={pausar}>
                        <Pause className="h-4 w-4" />
                        Pausar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={rodando !== null || pendentes === 0}
                        onClick={() => void rodar(j.id)}
                      >
                        <Play className="h-4 w-4" />
                        {pendentes === 0
                          ? "Sem pendências"
                          : feitos > 0
                            ? "Retomar"
                            : "Processar"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={rodando !== null || j.erros + j.nao_encontrados === 0}
                      onClick={async () => {
                        const r = await reprocessar({ data: { jobId: j.id } });
                        toast.success(`${r.refila} CNPJ(s) voltaram para a fila.`);
                        qc.invalidateQueries({ queryKey: ["importacoes"] });
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Tentar novamente os que falharam
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAtivo(ativo === j.id ? null : j.id)}
                    >
                      {ativo === j.id ? "Ocultar detalhes" : "Ver detalhes"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const ok = window.confirm(
                          "Excluir esta importação? As empresas já importadas continuam na base; some apenas a fila e o que ainda estava pendente.",
                        );
                        if (!ok) return;
                        parar.current = true;
                        if (ativo === j.id) setAtivo(null);
                        await excluir({ data: { jobId: j.id } });
                        toast.success("Importação excluída. As empresas já importadas foram mantidas.");
                        qc.invalidateQueries({ queryKey: ["importacoes"] });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {ativo === j.id ? (
                    <div className="rounded-md border">
                      <div className="flex items-center justify-between border-b p-2">
                        <span className="text-sm font-medium">CNPJs com problema</span>
                        <Button size="sm" variant="ghost" onClick={baixarFalhas}>
                          <Download className="h-4 w-4" />
                          CSV
                        </Button>
                      </div>
                      <div className="max-h-72 overflow-auto">
                        {(falhas.data ?? [])
                          .filter((i) => i.status === "erro" || i.status === "nao_encontrado")
                          .map((i) => (
                            <div
                              key={i.id}
                              className="flex items-start justify-between gap-3 border-b px-3 py-2 text-sm last:border-0"
                            >
                              <span className="font-mono">{i.cnpj}</span>
                              <span className="text-right text-xs text-muted-foreground">
                                {i.status === "erro" ? "Erro" : "Não encontrada"}
                                {i.erro ? ` — ${i.erro}` : ""}
                              </span>
                            </div>
                          ))}
                        {falhas.isLoading ? (
                          <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
