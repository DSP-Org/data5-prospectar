import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  exportarEmpresasFn,
  listarEmpresasFn,
  listarListasFn,
} from "@/lib/econodata.functions";
import { STATUS_LABEL, formatCnpj, type Company, type Status } from "@/lib/types";
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

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const Route = createFileRoute("/empresas/")({
  head: () => ({
    meta: [
      { title: "Base de empresas | Econodata Hub" },
      {
        name: "description",
        content:
          "Filtre, acompanhe o status comercial e exporte em CSV todas as empresas salvas da Econodata.",
      },
      { property: "og:title", content: "Base de empresas | Econodata Hub" },
      {
        property: "og:description",
        content: "Filtros por status, estado e lista, com exportação CSV da base de empresas.",
      },
    ],
  }),
  component: Empresas,
});

function csv(rows: Company[]) {
  const cols: Array<[string, (c: Company) => string]> = [
    ["CNPJ", (c) => c.cnpj],
    ["Razão social", (c) => c.razao_social],
    ["Nome fantasia", (c) => c.nome_fantasia ?? ""],
    ["Situação", (c) => c.situacao ?? ""],
    ["CNAE", (c) => `${c.cnae_codigo ?? ""} ${c.cnae_descricao ?? ""}`.trim()],
    ["Cidade", (c) => c.cidade ?? ""],
    ["UF", (c) => c.uf ?? ""],
    ["Porte", (c) => c.porte_estimado ?? ""],
    ["Faturamento presumido", (c) => c.faturamento_presumido ?? ""],
    ["Funcionários", (c) => c.qtd_funcionarios_estimada ?? ""],
    ["Telefone", (c) => c.melhor_telefone ?? ""],
    ["Telefones", (c) => c.telefones.join(" | ")],
    ["Site", (c) => c.melhor_site ?? ""],
    ["E-mails", (c) => c.emails.join(" | ")],
    ["Status", (c) => STATUS_LABEL[c.status as Status] ?? c.status],
    ["Notas", (c) => c.notas],
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    cols.map(([h]) => esc(h)).join(";"),
    ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(";")),
  ].join("\n");
}

function Empresas() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [uf, setUf] = useState("todos");
  const [lista, setLista] = useState("todas");
  const [page, setPage] = useState(1);
  const [exportando, setExportando] = useState(false);

  const filtros = { busca, status, uf, listId: lista };
  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const empresas = useQuery({
    queryKey: ["empresas", filtros, page],
    queryFn: () => listarEmpresasFn({ data: { ...filtros, page, perPage: 25 } }),
    placeholderData: keepPreviousData,
  });
  const exportar = useServerFn(exportarEmpresasFn);

  const total = empresas.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / 25));

  async function baixarCsv() {
    setExportando(true);
    try {
      const rows = await exportar({ data: filtros });
      const blob = new Blob(["\ufeff" + csv(rows as Company[])], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `empresas-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} empresa(s) exportada(s).`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Base de empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} empresa(s) salva(s) a partir da Econodata.
          </p>
        </div>
        <Button variant="outline" onClick={baixarCsv} disabled={exportando || total === 0}>
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar CSV
        </Button>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
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
            value={uf}
            onValueChange={(v) => {
              setUf(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {UFS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
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
                <TableHead className="hidden md:table-cell">Local</TableHead>
                <TableHead className="hidden lg:table-cell">Porte</TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {empresas.data?.empresas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhuma empresa encontrada com esses filtros.
                  </TableCell>
                </TableRow>
              )}
              {(empresas.data?.empresas ?? []).map((e) => (
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
                  <TableCell className="hidden text-sm md:table-cell">
                    {e.cidade ?? "—"}/{e.uf ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    {e.porte_estimado ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    {e.melhor_telefone ?? e.emails[0] ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.status as Status} />
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
