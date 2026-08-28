import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { useListas } from "@/lib/use-listas";

import {
  listarEmpresasFn,
  marcarProspectarFn,
} from "@/lib/econodata.functions";
import { STATUS_LABEL, formatCnpj, type Status } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/clientes-potenciais")({
  head: () => ({
    meta: [
      { title: "Clientes potenciais | Prospectar360" },
      {
        name: "description",
        content:
          "Empresas marcadas como prospectar na base geral, prontas para a rotina comercial da equipe.",
      },
      { property: "og:title", content: "Clientes potenciais | Prospectar360" },
      {
        property: "og:description",
        content: "Lista de clientes potenciais marcados na base de empresas do Prospectar360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/clientes-potenciais" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://data5-prospectar.lovable.app/clientes-potenciais" },
    ],
  }),
  component: ClientesPotenciais,
});

function ClientesPotenciais() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [lista, setLista] = useState("todas");
  const [page, setPage] = useState(1);

  const filtros = { busca, status, listId: lista, prospectar: true };
  const listas = useListas();
  const empresas = useQuery({
    queryKey: ["clientes-potenciais", filtros, page],
    queryFn: () => listarEmpresasFn({ data: { ...filtros, page, perPage: 25 } }),
    placeholderData: keepPreviousData,
  });

  const marcar = useServerFn(marcarProspectarFn);
  const desmarcar = useMutation({
    mutationFn: (cnpj: string) => marcar({ data: { cnpjs: [cnpj], valor: false } }),
    onSuccess: () => {
      toast.success("Empresa removida dos clientes potenciais.");
      void qc.invalidateQueries({ queryKey: ["clientes-potenciais"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const linhas = empresas.data?.empresas ?? [];
  const total = empresas.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold">
          <Star className="h-7 w-7 text-chart-3" /> Clientes potenciais
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} empresa(s) marcada(s) como “prospectar” na base de empresas.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Input
            placeholder="Buscar por nome, CNPJ ou cidade"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={lista}
            onValueChange={(v) => {
              setLista(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Lista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as listas</SelectItem>
              <SelectItem value="sem_lista">Sem lista</SelectItem>
              {(listas.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!empresas.isLoading && linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum cliente potencial ainda. Marque empresas com a estrela na{" "}
                    <Link to="/empresas" className="underline">
                      Base de empresas
                    </Link>
                    .
                  </TableCell>
                </TableRow>
              )}
              {linhas.map((e) => (
                <TableRow key={e.cnpj}>
                  <TableCell>
                    <Link
                      to="/empresas/$cnpj"
                      params={{ cnpj: e.cnpj.replace(/\D/g, "") }}
                      className="font-medium hover:text-accent"
                    >
                      {e.razao_social}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{formatCnpj(e.cnpj)}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {[e.cidade, e.uf].filter(Boolean).join("/") || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.melhor_telefone ?? e.emails[0] ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.status as Status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={desmarcar.isPending}
                      onClick={() => desmarcar.mutate(e.cnpj)}
                    >
                      <StarOff className="h-4 w-4" /> Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {paginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {paginas}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= paginas}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
