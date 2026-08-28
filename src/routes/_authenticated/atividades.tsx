import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ACTIVITY_LABEL, ACTIVITY_TYPES, formatCnpj } from "@/lib/types";
import { listarAtividadesFn } from "@/lib/prospection.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/atividades")({
  head: () => ({
    meta: [
      { title: "Atividades de prospecção | Prospectar360" },
      { name: "description", content: "Histórico e tarefas de prospecção no Prospectar360." },
      { property: "og:title", content: "Atividades de prospecção | Prospectar360" },
      { property: "og:description", content: "Acompanhe ligações, e-mails, reuniões e tarefas da prospecção." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/atividades" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/atividades" }],
  }),
  component: Atividades,
});

function formatData(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function Atividades() {
  const [tipo, setTipo] = useState<string>("todos");
  const [de, setDe] = useState<string>("");
  const [ate, setAte] = useState<string>("");
  const [pendente, setPendente] = useState<boolean>(false);

  const listar = useServerFn(listarAtividadesFn);
  const { data, isLoading } = useQuery({
    queryKey: ["atividades", { tipo, de, ate, pendente }],
    queryFn: () =>
      listar({
        data: {
          tipo: tipo === "todos" ? undefined : tipo,
          de: de || undefined,
          ate: ate || undefined,
          pendente: pendente || undefined,
        },
      }),
  });

  const atividades = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Atividades de prospecção</h1>
        <p className="text-sm text-muted-foreground">Histórico de interações e tarefas agendadas.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 py-4 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACTIVITY_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Switch id="pendente" checked={pendente} onCheckedChange={setPendente} />
            <Label htmlFor="pendente" className="text-xs">Apenas pendentes</Label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : atividades.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma atividade encontrada para os filtros selecionados.</p>
      ) : (
        <div className="space-y-2">
          {atividades.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTIVITY_COLORS[a.tipo]}`}>
                      {ACTIVITY_LABEL[a.tipo]}
                    </span>
                    <Link
                      to="/empresas/$cnpj"
                      params={{ cnpj: a.company_cnpj }}
                      className="font-mono text-xs text-muted-foreground hover:text-accent"
                    >
                      {formatCnpj(a.company_cnpj)}
                    </Link>
                  </div>
                  <p className="text-sm">{a.observacao || "Sem observação"}</p>
                  {a.responsavel && <p className="text-xs text-muted-foreground">Responsável: {a.responsavel}</p>}
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  <p>Criada em {formatData(a.created_at)}</p>
                  {a.scheduled_at && <p>Agendada: {formatData(a.scheduled_at)}</p>}
                  {a.completed_at ? <p>Concluída: {formatData(a.completed_at)}</p> : <p className="text-amber-600">Pendente</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIVITY_COLORS: Record<string, string> = {
  ligacao: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  whatsapp: "bg-green-100 text-green-700",
  reuniao: "bg-amber-100 text-amber-700",
  tarefa: "bg-slate-100 text-slate-700",
  nota: "bg-zinc-100 text-zinc-700",
};
