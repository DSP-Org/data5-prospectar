import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Columns3, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  exportarEmpresasFn,
  listarEmpresasFn,
  listarListasFn,
  vincularEmpresasListaFn,
} from "@/lib/econodata.functions";
import { STATUS_LABEL, formatCnpj, type Company, type Status } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ImportarEmpresas } from "@/components/ImportarEmpresas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export const Route = createFileRoute("/_authenticated/empresas/")({
  validateSearch: (search: Record<string, unknown>): { lista?: string } =>
    typeof search["lista"] === "string" ? { lista: search["lista"] } : {},
  head: () => ({
    meta: [
      { title: "Base de empresas | Prospectar360" },
      {
        name: "description",
        content:
          "Filtre, acompanhe o status comercial e exporte em CSV todas as empresas salvas.",
      },
      { property: "og:title", content: "Base de empresas | Prospectar360" },
      {
        property: "og:description",
        content: "Filtros por status, estado e lista, com exportação CSV da base de empresas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/empresas" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/empresas" }],
  }),
  component: Empresas,
});

export function enderecoDe(c: Company): string {
  const linha = [c.logradouro, c.numero, c.complemento].filter(Boolean).join(", ");
  const local = [c.bairro, [c.cidade, c.uf].filter(Boolean).join("/")].filter(Boolean).join(" - ");
  return [linha, local, c.cep].filter((p) => p && String(p).trim() !== "").join(" • ");
}

function atividadeDe(c: Company): string {
  return [c.cnae_codigo, c.cnae_descricao].filter(Boolean).join(" - ");
}

type Coluna = {
  key: string;
  label: string;
  padrao: boolean;
  cell: (c: Company) => React.ReactNode;
  csv: Array<[string, (c: Company) => string]>;
  className?: string;
};

const COLUNAS: Coluna[] = [
  {
    key: "nome_fantasia",
    label: "Nome fantasia",
    padrao: false,
    cell: (c) => c.nome_fantasia ?? "—",
    csv: [["Nome fantasia", (c) => c.nome_fantasia ?? ""]],
  },
  {
    key: "endereco",
    label: "Endereço",
    padrao: true,
    cell: (c) => enderecoDe(c) || "—",
    csv: [["Endereço", (c) => enderecoDe(c)]],
    className: "max-w-[18rem] text-sm",
  },
  {
    key: "atividade",
    label: "Atividade principal",
    padrao: true,
    cell: (c) => atividadeDe(c) || "—",
    csv: [["Atividade principal", (c) => atividadeDe(c)]],
    className: "max-w-[18rem] text-sm",
  },
  {
    key: "local",
    label: "Local",
    padrao: true,
    cell: (c) => `${c.cidade ?? "—"}/${c.uf ?? "—"}`,
    csv: [
      ["Cidade", (c) => c.cidade ?? ""],
      ["UF", (c) => c.uf ?? ""],
    ],
    className: "text-sm",
  },
  {
    key: "situacao",
    label: "Situação",
    padrao: false,
    cell: (c) => c.situacao ?? "—",
    csv: [["Situação", (c) => c.situacao ?? ""]],
    className: "text-sm",
  },
  {
    key: "porte",
    label: "Porte",
    padrao: true,
    cell: (c) => c.porte_estimado ?? "—",
    csv: [
      ["Porte", (c) => c.porte_estimado ?? ""],
      ["Faturamento presumido", (c) => c.faturamento_presumido ?? ""],
      ["Funcionários", (c) => c.qtd_funcionarios_estimada ?? ""],
    ],
    className: "text-sm",
  },
  {
    key: "contato",
    label: "Contato",
    padrao: true,
    cell: (c) => c.melhor_telefone ?? c.emails[0] ?? "—",
    csv: [
      ["Telefone", (c) => c.melhor_telefone ?? ""],
      ["Telefones", (c) => c.telefones.join(" | ")],
      ["Site", (c) => c.melhor_site ?? ""],
      ["E-mails", (c) => c.emails.join(" | ")],
    ],
    className: "text-sm",
  },
  {
    key: "status",
    label: "Status",
    padrao: true,
    cell: (c) => <StatusBadge status={c.status as Status} />,
    csv: [
      ["Status", (c) => STATUS_LABEL[c.status as Status] ?? c.status],
      ["Notas", (c) => c.notas],
    ],
  },
];

function csv(rows: Company[], visiveis: string[]) {
  const cols: Array<[string, (c: Company) => string]> = [
    ["CNPJ", (c) => c.cnpj],
    ["Razão social", (c) => c.razao_social],
    ...COLUNAS.filter((c) => visiveis.includes(c.key)).flatMap((c) => c.csv),
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
  const { lista: listaInicial } = Route.useSearch();
  const [lista, setLista] = useState(listaInicial ?? "todas");
  const [grupo, setGrupo] = useState("todas");
  const [page, setPage] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [colunas, setColunas] = useState<string[]>(
    COLUNAS.filter((c) => c.padrao).map((c) => c.key),
  );
  const visiveis = COLUNAS.filter((c) => colunas.includes(c.key));

  const filtros = { busca, status, uf, listId: lista, grupoNatureza: grupo };
  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const empresas = useQuery({
    queryKey: ["empresas", filtros, page],
    queryFn: () => listarEmpresasFn({ data: { ...filtros, page, perPage: 25 } }),
    placeholderData: keepPreviousData,
  });
  const exportar = useServerFn(exportarEmpresasFn);
  const vincular = useServerFn(vincularEmpresasListaFn);
  const qc = useQueryClient();
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const linhas = empresas.data?.empresas ?? [];
  const todosMarcados = linhas.length > 0 && linhas.every((e) => selecionados.includes(e.cnpj));

  const mutVincular = useMutation({
    mutationFn: (listId: string | null) => vincular({ data: { cnpjs: selecionados, listId } }),
    onSuccess: (r) => {
      toast.success(`${r.total} empresa(s) atualizada(s).`);
      setSelecionados([]);
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["listas"] });
      qc.invalidateQueries({ queryKey: ["sem-lista"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const total = empresas.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / 25));

  async function baixarCsv() {
    setExportando(true);
    try {
      const rows = await exportar({ data: filtros });
      const blob = new Blob(["\ufeff" + csv(rows as Company[], colunas)], {
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
        <div className="flex gap-2">
        <ImportarEmpresas />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Columns3 className="h-4 w-4" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Exibir colunas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUNAS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={colunas.includes(c.key)}
                onSelect={(ev) => ev.preventDefault()}
                onCheckedChange={(v) =>
                  setColunas((s) => (v ? [...s, c.key] : s.filter((k) => k !== c.key)))
                }
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={baixarCsv} disabled={exportando || total === 0}>
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar CSV
        </Button>
        </div>

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
              <SelectItem value="sem_lista">Sem lista</SelectItem>
              {(listas.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={grupo}
            onValueChange={(v) => {
              setGrupo(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
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
        </CardContent>
      </Card>

      {selecionados.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">{selecionados.length} selecionada(s)</span>
            <Select
              value=""
              onValueChange={(v) => mutVincular.mutate(v === "nenhuma" ? null : v)}
              disabled={mutVincular.isPending}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Vincular à lista…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Remover da lista</SelectItem>
                {(listas.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mutVincular.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Button variant="ghost" size="sm" onClick={() => setSelecionados([])}>
              Limpar seleção
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={todosMarcados}
                    onCheckedChange={(v) =>
                      setSelecionados(v === true ? linhas.map((e) => e.cnpj) : [])
                    }
                    aria-label="Selecionar todas"
                  />
                </TableHead>
                <TableHead>Empresa</TableHead>
                {visiveis.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={visiveis.length + 2}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {empresas.data?.empresas.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={visiveis.length + 2}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhuma empresa encontrada com esses filtros.
                  </TableCell>
                </TableRow>
              )}
              {linhas.map((e) => (
                <TableRow key={e.cnpj}>
                  <TableCell>
                    <Checkbox
                      checked={selecionados.includes(e.cnpj)}
                      onCheckedChange={(v) =>
                        setSelecionados((s) =>
                          v === true ? [...s, e.cnpj] : s.filter((c) => c !== e.cnpj),
                        )
                      }
                      aria-label={`Selecionar ${e.razao_social}`}
                    />
                  </TableCell>
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
                  {visiveis.map((col) => (
                    <TableCell key={col.key} className={col.className ?? ""}>
                      {col.cell(e)}
                    </TableCell>
                  ))}
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
