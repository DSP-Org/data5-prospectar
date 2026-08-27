import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de prospecção | Prospectar360" },
      { name: "description", content: "Calcule metas, conversão e ROI da prospecção comercial no Prospectar360." },
      { property: "og:title", content: "Calculadora de prospecção | Prospectar360" },
      { property: "og:description", content: "Simule quantos contatos são necessários para atingir sua meta de faturamento." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/calculadora" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/calculadora" }],
  }),
  component: Calculadora,
});

function moeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Calculadora() {
  const [meta, setMeta] = useState<number | "">(100000);
  const [ticket, setTicket] = useState<number | "">(5000);
  const [conversaoContato, setConversaoContato] = useState<number | "">(10);
  const [comissao, setComissao] = useState<number | "">(5);

  const metaNum = Number(meta) || 0;
  const ticketNum = Number(ticket) || 0;
  const convNum = Number(conversaoContato) || 0;
  const comNum = Number(comissao) || 0;

  const clientesNecessarios = ticketNum > 0 ? Math.ceil(metaNum / ticketNum) : 0;
  const contatosNecessarios = convNum > 0 ? Math.ceil(clientesNecessarios / (convNum / 100)) : 0;
  const comissaoValor = metaNum * (comNum / 100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calculadora de prospecção</h1>
        <p className="text-sm text-muted-foreground">Simule metas de contato, conversão e comissão.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Meta e conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="meta">Meta de faturamento (R$)</Label>
              <Input id="meta" type="number" value={meta} onChange={(e) => setMeta(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ticket">Ticket médio (R$)</Label>
              <Input id="ticket" type="number" value={ticket} onChange={(e) => setTicket(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conversao">Conversão de contato para cliente (%)</Label>
              <Input id="conversao" type="number" value={conversaoContato} onChange={(e) => setConversaoContato(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="comissao">% comissão estimada</Label>
              <Input id="comissao" type="number" value={comissao} onChange={(e) => setComissao(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Clientes necessários</p>
              <p className="text-2xl font-semibold">{clientesNecessarios}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contatos necessários</p>
              <p className="text-2xl font-semibold">{contatosNecessarios}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comissão estimada</p>
              <p className="text-2xl font-semibold text-accent">{moeda(comissaoValor)}</p>
            </div>
            <Button variant="outline" onClick={() => { setMeta(100000); setTicket(5000); setConversaoContato(10); setComissao(5); }}>
              Restaurar padrão
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
