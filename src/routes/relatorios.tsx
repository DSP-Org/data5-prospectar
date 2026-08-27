import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { obterPainelFn } from "@/lib/econodata.functions";
import { relatorioAtividadesFn } from "@/lib/prospection.functions";
import { ACTIVITY_LABEL, STATUS_LABEL } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Loader2 } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | Prospectar360" },
      { name: "description", content: "Relatórios de prospecção, atividades e conversão no Prospectar360." },
      { property: "og:title", content: "Relatórios | Prospectar360" },
      { property: "og:description", content: "Painel com status, atividades, conversão e distribuição geográfica." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/relatorios" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/relatorios" }],
  }),
  component: Relatorios,
});

function Bar({ label, value, max, colorClass = "bg-primary" }: { label: string; value: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full rounded bg-muted">
        <div className={`h-2 rounded ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Relatorios() {
  const [de, setDe] = useState<string>("");
  const [ate, setAte] = useState<string>("");

  const painelFn = useServerFn(obterPainelFn);
  const ativFn = useServerFn(relatorioAtividadesFn);

  const painel = useQuery({ queryKey: ["painel"], queryFn: () => painelFn() });
  const ativ = useQuery({
    queryKey: ["relatorio-atividades", de, ate],
    queryFn: () => ativFn({ data: { de: de || undefined, ate: ate || undefined } }),
  });

  const statusEntries = painel.data?.porStatus ? Object.entries(painel.data.porStatus) : [];
  const statusMax = Math.max(...statusEntries.map(([, v]) => v), 1);
  const ufEntries = (painel.data?.topUf ?? []).slice(0, 8);
  const ufMax = Math.max(...ufEntries.map((u) => u.qtd), 1);
  const tipoEntries = ativ.data?.porTipo ? Object.entries(ativ.data.porTipo) : [];
  const tipoMax = Math.max(...tipoEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Acompanhe KPIs, atividades e distribuição da base.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de empresas</p>
            <p className="text-2xl font-semibold">{painel.data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Adições (30 dias)</p>
            <p className="text-2xl font-semibold">{painel.data?.ultimos30 ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de atividades</p>
            <p className="text-2xl font-semibold">{ativ.data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Atividades pendentes</p>
            <p className="text-2xl font-semibold">{ativ.data?.pendentes ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Empresas por status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {painel.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
            ) : statusEntries.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma empresa na base.</p>
            ) : (
              statusEntries.map(([k, v]) => <Bar key={k} label={STATUS_LABEL[k as keyof typeof STATUS_LABEL] ?? k} value={v} max={statusMax} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividades por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
              </div>
            </div>
            {ativ.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
            ) : tipoEntries.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma atividade no período.</p>
            ) : (
              tipoEntries.map(([k, v]) => <Bar key={k} label={ACTIVITY_LABEL[k as keyof typeof ACTIVITY_LABEL] ?? k} value={v} max={tipoMax} colorClass="bg-accent" />)
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas por estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {painel.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
          ) : ufEntries.length === 0 ? (
            <p className="text-muted-foreground">Sem dados por estado.</p>
          ) : (
            ufEntries.map((u) => <Bar key={u.uf} label={u.uf} value={u.qtd} max={ufMax} colorClass="bg-chart-3" />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
