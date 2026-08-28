import { useUnidadeAtiva } from "@/lib/unidade-ativa";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { formatCnpj, ACTIVITY_LABEL, STATUS_LABEL, STATUSES, type Status } from "@/lib/types";
import { funilDadosFn } from "@/lib/prospection.functions";
import { GRUPOS_NATUREZA, grupoDaNatureza } from "@/lib/natureza-juridica";
import { atualizarEmpresaFn } from "@/lib/econodata.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, Loader2, Phone, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({
    meta: [
      { title: "Funil de prospecção | Prospectar360" },
      { name: "description", content: "Acompanhe empresas por estágio do funil comercial no Prospectar360." },
      { property: "og:title", content: "Funil de prospecção | Prospectar360" },
      { property: "og:description", content: "Funil comercial Kanban com status Novo, Em contato, Qualificado, Cliente e Descartado." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/funil" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/funil" }],
  }),
  component: Funil,
});

function formatDataHora(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Funil() {
  const qc = useQueryClient();
  const { unidade } = useUnidadeAtiva();
  const dados = useQuery({
    queryKey: ["funil", unidade],
    queryFn: () => funilDadosFn({ data: unidade ? { unidade } : {} }),
  });
  const listas = useListas();
  const atualizar = useServerFn(atualizarEmpresaFn);

  const [listaId, setListaId] = useState<string>("todas");
  const [grupo, setGrupo] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const mutStatus = useMutation({
    mutationFn: ({ cnpj, status }: { cnpj: string; status: Status }) =>
      atualizar({ data: { cnpj, status } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      void qc.invalidateQueries({ queryKey: ["funil"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
      void qc.invalidateQueries({ queryKey: ["painel"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const empresasFiltradas = useMemo(() => {
    const empresas = dados.data?.empresas ?? [];
    const termo = busca.trim().toLowerCase();
    return empresas.filter((e) => {
      if (listaId === "sem_lista" && e.list_id !== null) return false;
      if (listaId !== "todas" && listaId !== "sem_lista" && e.list_id !== listaId) return false;
      if (grupo !== "todas" && grupoDaNatureza(e.natureza_juridica) !== grupo) return false;
      if (termo) {
        const alvo = `${e.razao_social} ${e.nome_fantasia ?? ""} ${e.cnpj} ${e.cidade ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [dados.data, listaId, grupo, busca]);

  if (dados.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando funil…
      </div>
    );
  }

  const ultimas = dados.data?.ultimas ?? {};

  const porStatus: Record<Status, typeof empresasFiltradas> = {
    novo: [],
    em_contato: [],
    qualificado: [],
    cliente: [],
    descartado: [],
  };
  for (const e of empresasFiltradas) {
    const s = e.status as Status;
    if (porStatus[s]) porStatus[s].push(e);
  }

  const temFiltro = listaId !== "todas" || grupo !== "todas" || busca.trim() !== "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Funil de prospecção</h1>
        <p className="text-sm text-muted-foreground">
          Apenas empresas marcadas como clientes potenciais (prospectar) aparecem aqui.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <Select value={listaId} onValueChange={setListaId}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Lista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as listas</SelectItem>
              <SelectItem value="sem_lista">Sem lista</SelectItem>
              {(listas.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} ({l.total ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={grupo} onValueChange={setGrupo}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Natureza jurídica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as naturezas</SelectItem>
              {Object.entries(GRUPOS_NATUREZA).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar por nome, CNPJ ou cidade…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="sm:w-72"
          />
          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                setListaId("todas");
                setGrupo("todas");
                setBusca("");
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
          {temFiltro && (
            <span className="text-xs text-muted-foreground">
              {empresasFiltradas.length} empresa(s) no filtro
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid auto-cols-fr gap-4 md:grid-cols-5">
        {STATUSES.map((status) => {
          const lista = porStatus[status];
          return (
            <div key={status} className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
                <Badge variant="secondary">{lista.length}</Badge>
              </div>
              <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
                {lista.map((e) => {
                  const last = ultimas[e.cnpj];
                  return (
                    <Card key={e.cnpj} className="border-l-4" style={{ borderLeftColor: status === "cliente" ? "var(--color-chart-2)" : status === "descartado" ? "var(--color-muted-foreground)" : "var(--color-primary)" }}>
                      <CardContent className="space-y-3 p-3">
                        <div>
                          <Link
                            to="/empresas/$cnpj"
                            params={{ cnpj: e.cnpj }}
                            className="block text-sm font-medium hover:text-accent"
                          >
                            {e.razao_social}
                          </Link>
                          <span className="block font-mono text-xs text-muted-foreground">{formatCnpj(e.cnpj)}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[e.cidade, e.uf].filter(Boolean).join("/") || "Sem localização"}
                          </span>
                        </div>
                        {last && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {ACTIVITY_LABEL[last.tipo]} · {formatDataHora(last.created_at)}
                          </div>
                        )}
                        <Select
                          value={e.status}
                          onValueChange={(v) => mutStatus.mutate({ cnpj: e.cnpj, status: v as Status })}
                          disabled={mutStatus.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Mover para" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABEL).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
