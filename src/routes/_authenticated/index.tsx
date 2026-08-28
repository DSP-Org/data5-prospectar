import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Activity, Building2, CheckCircle2, Clock, Database, Search } from "lucide-react";

import { obterPainelFn, testarConexaoFn } from "@/lib/econodata.functions";
import { STATUS_LABEL, formatCnpj, type Status } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const painelQuery = queryOptions({ queryKey: ["painel"], queryFn: () => obterPainelFn() });
const conexaoQuery = queryOptions({ queryKey: ["conexao"], queryFn: () => testarConexaoFn() });

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel | Prospectar360" },
      {
        name: "description",
        content:
          "Visão geral da sua base de empresas: total salvo, status comercial e últimas consultas.",
      },
      { property: "og:title", content: "Painel | Prospectar360" },
      {
        property: "og:description",
        content: "Visão geral da base de empresas consultadas no Prospectar360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(painelQuery);
    void context.queryClient.ensureQueryData(conexaoQuery);
  },
  component: Painel,
});

function Painel() {
  const { data } = useSuspenseQuery(painelQuery);
  const { data: conexao } = useSuspenseQuery(conexaoQuery);

  const cards = [
    { label: "Empresas na base", valor: data.total, icon: Database },
    { label: "Adicionadas em 30 dias", valor: data.ultimos30, icon: Activity },
    { label: "Consultas realizadas", valor: data.consultas, icon: Search },
    {
      label: "Qualificadas + clientes",
      valor: (data.porStatus["qualificado"] ?? 0) + (data.porStatus["cliente"] ?? 0),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grade-papel rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Painel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua central de dados empresariais alimentada pela API Econodata.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-xs ${
                conexao.ok
                  ? "border-chart-4/40 bg-chart-4/10 text-chart-4"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {conexao.ok ? `API conectada — ${conexao.cliente ?? "conta ativa"}` : `API: ${conexao.erro}`}
            </span>
            <Button asChild>
              <Link to="/consulta">Nova consulta</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-2 font-display text-3xl font-semibold tabular">{c.valor}</p>
              </div>
              <c.icon className="h-8 w-8 text-accent" />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Empresas recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa salva ainda. Comece por uma{" "}
                <Link to="/consulta" className="text-accent underline underline-offset-4">
                  consulta de CNPJ
                </Link>
                .
              </p>
            )}
            {data.recentes.map((e) => (
              <Link
                key={e.cnpj}
                to="/empresas/$cnpj"
                params={{ cnpj: e.cnpj.replace(/\D/g, "") }}
                className="flex items-center justify-between gap-4 rounded-sm border border-border px-4 py-3 transition-colors hover:border-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.razao_social}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatCnpj(e.cnpj)} · {e.cidade ?? "—"}/{e.uf ?? "—"}
                  </p>
                </div>
                <StatusBadge status={e.status as Status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => {
                const qtd = data.porStatus[s] ?? 0;
                const pct = data.total ? Math.round((qtd / data.total) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{STATUS_LABEL[s]}</span>
                      <span className="tabular text-muted-foreground">{qtd}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Últimas consultas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.log.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem consultas registradas.</p>
              )}
              {data.log.map((l) => (
                <div key={l.id} className="border-b border-border pb-2 text-xs last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium uppercase text-muted-foreground">{l.tipo}</span>
                    <span
                      className={
                        l.resultado === "ok" ? "text-chart-4" : "text-destructive"
                      }
                    >
                      {l.resultado === "ok" ? `${l.quantidade} resultado(s)` : l.resultado}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-muted-foreground">{l.entrada}</p>
                  {l.mensagem && <p className="text-destructive">{l.mensagem}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          {data.topUf.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Principais estados
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.topUf.map((u) => (
                  <span
                    key={u.uf}
                    className="rounded-sm border border-border px-2 py-1 text-xs tabular"
                  >
                    {u.uf} · {u.qtd}
                  </span>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
