import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Calculator, ChevronDown, Mail, Phone, Target } from "lucide-react";

import { listarListasFn, mercadoAgregadoFn, opcoesFiltroFn } from "@/lib/econodata.functions";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnidadeAtiva } from "@/lib/unidade-ativa";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Calculadora de mercado | Prospectar360" },
      {
        name: "description",
        content:
          "Monte um recorte de mercado sobre a sua base de empresas e descubra potencial de faturamento, metas e esforço de prospecção.",
      },
      { property: "og:title", content: "Calculadora de mercado | Prospectar360" },
      {
        property: "og:description",
        content: "Tamanho de mercado e metas comerciais calculados sobre a base de empresas da sua unidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/" }],
  }),
  component: CalculadoraMercado,
});

function moeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function num(n: number) {
  return n.toLocaleString("pt-BR");
}

type Filtros = {
  uf: string;
  cidade: string;
  cnae: string;
  porte: string;
  setor: string;
  situacao: string;
  listId: string;
  status: string;
  prospectar: boolean;
  comTelefone: boolean;
  comEmail: boolean;
};

const FILTROS_INICIAIS: Filtros = {
  uf: "todos",
  cidade: "",
  cnae: "",
  porte: "todos",
  setor: "todos",
  situacao: "todas",
  listId: "todas",
  status: "todos",
  prospectar: false,
  comTelefone: false,
  comEmail: false,
};

function Barras({ titulo, itens, total }: { titulo: string; itens: Array<{ label: string; qtd: number }>; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no recorte.</p>}
        {itens.map((i) => {
          const pct = total ? Math.round((i.qtd / total) * 100) : 0;
          return (
            <div key={i.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate" title={i.label}>
                  {i.label}
                </span>
                <span className="tabular text-muted-foreground">
                  {num(i.qtd)} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CalculadoraMercado() {
  const { unidade } = useUnidadeAtiva();
  const [f, setF] = useState<Filtros>(FILTROS_INICIAIS);
  const [abertos, setAbertos] = useState(true);

  const [ticket, setTicket] = useState<number | "">(5000);
  const [meta, setMeta] = useState<number | "">(100000);
  const [conversao, setConversao] = useState<number | "">(3);
  const [resposta, setResposta] = useState<number | "">(20);
  const [comissao, setComissao] = useState<number | "">(5);

  const base = unidade ? { unidade } : {};

  const { data: opcoes } = useQuery({
    queryKey: ["opcoes-filtro", unidade],
    queryFn: () => opcoesFiltroFn({ data: base }),
  });
  const { data: listas } = useQuery({
    queryKey: ["listas", unidade],
    queryFn: () => listarListasFn({ data: base }),
  });
  const { data: mercado, isFetching } = useQuery({
    queryKey: ["mercado", unidade, f],
    queryFn: () =>
      mercadoAgregadoFn({
        data: {
          ...base,
          uf: f.uf,
          cidade: f.cidade || undefined,
          cnae: f.cnae || undefined,
          porte: f.porte,
          setor: f.setor,
          situacao: f.situacao,
          listId: f.listId,
          status: f.status,
          prospectar: f.prospectar || undefined,
          comTelefone: f.comTelefone || undefined,
          comEmail: f.comEmail || undefined,
        },
      }),
  });

  const empresas = mercado?.empresas ?? 0;
  const ticketNum = Number(ticket) || 0;
  const metaNum = Number(meta) || 0;
  const convNum = Number(conversao) || 0;
  const respNum = Number(resposta) || 0;
  const comNum = Number(comissao) || 0;

  const potencial = empresas * ticketNum;
  const clientesNecessarios = ticketNum > 0 ? Math.ceil(metaNum / ticketNum) : 0;
  const contatosNecessarios = convNum > 0 ? Math.ceil(clientesNecessarios / (convNum / 100)) : 0;
  const abordagensNecessarias = respNum > 0 ? Math.ceil(contatosNecessarios / (respNum / 100)) : contatosNecessarios;
  const acionaveis = mercado?.acionaveis ?? 0;
  const cobertura = abordagensNecessarias > 0 ? Math.round((acionaveis / abordagensNecessarias) * 100) : 0;
  const comissaoValor = metaNum * (comNum / 100);
  const pctBase = mercado?.baseTotal ? Math.round((empresas / mercado.baseTotal) * 100) : 0;

  const cards = [
    { label: "Empresas no recorte", valor: num(empresas), icon: Building2, nota: `${pctBase}% da base da unidade` },
    { label: "Mercado potencial", valor: moeda(potencial), icon: Target, nota: `${num(empresas)} × ${moeda(ticketNum)}` },
    { label: "Com telefone", valor: num(mercado?.comTelefone ?? 0), icon: Phone, nota: "contato direto disponível" },
    { label: "Com e-mail", valor: num(mercado?.comEmail ?? 0), icon: Mail, nota: "contato digital disponível" },
  ];

  return (
    <div className="space-y-6">
      <section className="grade-papel rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Calculadora de mercado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha um recorte da sua base de empresas e veja o potencial de faturamento e o esforço de
              prospecção necessário.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/empresas" search={buscaEmpresas(f)}>
                Ver empresas deste recorte
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/empresas" search={{ ...buscaEmpresas(f), comTelefone: true }}>
                Só com telefone
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/empresas" search={{ ...buscaEmpresas(f), comEmail: true }}>
                Só com e-mail
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/empresas" search={{ ...buscaEmpresas(f), prospectar: true }}>
                Marcadas para prospectar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Collapsible open={abertos} onOpenChange={setAbertos}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <CardTitle className="text-base">Recorte de mercado</CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${abertos ? "" : "-rotate-90"}`} />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={f.uf} onValueChange={(v) => setF((s) => ({ ...s, uf: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(opcoes?.ufs ?? []).map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cidade">Município</Label>
                <Input
                  id="cidade"
                  value={f.cidade}
                  placeholder="Ex.: Salvador"
                  onChange={(e) => setF((s) => ({ ...s, cidade: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cnae">Atividade econômica (CNAE)</Label>
                <Input
                  id="cnae"
                  value={f.cnae}
                  placeholder="Código ou descrição"
                  onChange={(e) => setF((s) => ({ ...s, cnae: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label>Porte estimado</Label>
                <Select value={f.porte} onValueChange={(v) => setF((s) => ({ ...s, porte: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(opcoes?.portes ?? []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Setor</Label>
                <Select value={f.setor} onValueChange={(v) => setF((s) => ({ ...s, setor: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(opcoes?.setores ?? []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Situação cadastral</Label>
                <Select value={f.situacao} onValueChange={(v) => setF((s) => ({ ...s, situacao: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {(opcoes?.situacoes ?? []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Lista</Label>
                <Select value={f.listId} onValueChange={(v) => setF((s) => ({ ...s, listId: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="sem_lista">Sem lista</SelectItem>
                    {(listas ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Status comercial</Label>
                <Select value={f.status} onValueChange={(v) => setF((s) => ({ ...s, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="prospectar"
                    checked={f.prospectar}
                    onCheckedChange={(v) => setF((s) => ({ ...s, prospectar: v }))}
                  />
                  <Label htmlFor="prospectar">Somente marcadas para prospectar</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="comTelefone"
                    checked={f.comTelefone}
                    onCheckedChange={(v) => setF((s) => ({ ...s, comTelefone: v }))}
                  />
                  <Label htmlFor="comTelefone">Somente com telefone</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="comEmail"
                    checked={f.comEmail}
                    onCheckedChange={(v) => setF((s) => ({ ...s, comEmail: v }))}
                  />
                  <Label htmlFor="comEmail">Somente com e-mail</Label>
                </div>
              </div>

              <div className="md:col-span-3">
                <Button variant="ghost" size="sm" onClick={() => setF(FILTROS_INICIAIS)}>
                  Limpar recorte
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-2 font-display text-2xl font-semibold tabular">
                  {isFetching ? "…" : c.valor}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{c.nota}</p>
              </div>
              <c.icon className="h-7 w-7 shrink-0 text-accent" />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" /> Meta e conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ticket">Ticket médio (R$)</Label>
              <Input
                id="ticket"
                type="number"
                value={ticket}
                onChange={(e) => setTicket(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta">Meta de faturamento (R$)</Label>
              <Input
                id="meta"
                type="number"
                value={meta}
                onChange={(e) => setMeta(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conversao">Conversão contato → cliente (%)</Label>
              <Input
                id="conversao"
                type="number"
                value={conversao}
                onChange={(e) => setConversao(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resposta">Taxa de resposta (%)</Label>
              <Input
                id="resposta"
                type="number"
                value={resposta}
                onChange={(e) => setResposta(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="comissao">Comissão (%)</Label>
              <Input
                id="comissao"
                type="number"
                value={comissao}
                onChange={(e) => setComissao(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTicket(5000);
                  setMeta(100000);
                  setConversao(3);
                  setResposta(20);
                  setComissao(5);
                }}
              >
                Restaurar padrão
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Esforço para bater a meta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Clientes necessários</p>
              <p className="text-2xl font-semibold tabular">{num(clientesNecessarios)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contatos necessários</p>
              <p className="text-2xl font-semibold tabular">{num(contatosNecessarios)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Empresas a abordar</p>
              <p className="text-2xl font-semibold tabular">{num(abordagensNecessarias)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comissão estimada</p>
              <p className="text-2xl font-semibold text-accent">{moeda(comissaoValor)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">
                Cobertura do recorte ({num(acionaveis)} empresas com contato)
              </p>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${cobertura >= 100 ? "bg-chart-4" : "bg-destructive"}`}
                  style={{ width: `${Math.min(100, cobertura)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {cobertura >= 100
                  ? "O recorte tem empresas suficientes para o esforço planejado."
                  : `O recorte cobre ${cobertura}% do esforço necessário — amplie os filtros ou importe mais empresas.`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Barras titulo="Por estado" itens={mercado?.topUf ?? []} total={empresas} />
        <Barras titulo="Por porte" itens={mercado?.topPorte ?? []} total={empresas} />
        <Barras titulo="Por atividade" itens={mercado?.topAtividade ?? []} total={empresas} />
      </div>
    </div>
  );
}
