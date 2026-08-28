import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  consultarChavesFn,
  consultarCnpjsFn,
  listarEmpresasFn,
  listarListasFn,
  opcoesFiltroFn,
} from "@/lib/econodata.functions";
import { formatCnpj, STATUSES, STATUS_LABEL, type Company, type LookupItem } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/consulta")({
  head: () => ({
    meta: [
      { title: "Consulta de empresas | Prospectar360" },
      {
        name: "description",
        content:
          "Consulte empresas por CNPJ (individual ou em lote), site ou e-mail e salve na sua base.",
      },
      { property: "og:title", content: "Consulta de empresas | Prospectar360" },
      {
        property: "og:description",
        content: "Consulta de CNPJ, site e e-mail com salvamento automático no Prospectar360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/consulta" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/consulta" }],
  }),
  component: Consulta,
});

function Consulta() {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [chaves, setChaves] = useState("");
  const [listId, setListId] = useState("nenhuma");
  const [itens, setItens] = useState<LookupItem[]>([]);
  const [buscaTotal, setBuscaTotal] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Filtros | null>(null);

  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const opcoes = useQuery({ queryKey: ["opcoes-filtro"], queryFn: () => opcoesFiltroFn() });
  const consultarCnpjs = useServerFn(consultarCnpjsFn);
  const consultarChaves = useServerFn(consultarChavesFn);
  const listarEmpresas = useServerFn(listarEmpresasFn);

  const baseQuery = useQuery({
    queryKey: ["busca-avancada", filtrosAtivos],
    enabled: filtrosAtivos !== null,
    queryFn: () => listarEmpresas({ data: { ...montarFiltros(filtrosAtivos!), perPage: 50 } }),
  });

  const alvoLista = listId === "nenhuma" ? null : listId;

  const mutCnpjs = useMutation({
    mutationFn: (cnpjs: string[]) =>
      consultarCnpjs({ data: { cnpjs, listId: alvoLista, completo: buscaTotal } }),
    onSuccess: (res) => {
      setItens(res.itens);
      const ok = res.itens.filter((i) => i.encontrada).length;
      toast.success(`${ok} empresa(s) encontrada(s) e salva(s).`);
      void qc.invalidateQueries({ queryKey: ["painel"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutChaves = useMutation({
    mutationFn: (lista: string[]) => consultarChaves({ data: { chaves: lista, listId: alvoLista } }),
    onSuccess: (res) => {
      setItens(res.itens);
      const ok = res.itens.filter((i) => i.encontrada).length;
      if (ok) toast.success(`${ok} empresa(s) encontrada(s) e salva(s).`);
      else toast.error("Nenhuma empresa encontrada.");
      void qc.invalidateQueries({ queryKey: ["painel"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cnpjs = texto
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);

  const listaChaves = chaves
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);

  const carregando = mutCnpjs.isPending || mutChaves.isPending;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Consulta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque empresas por CNPJ (até 300 por vez), site ou e-mail nas fontes ativas. Todo
          resultado é salvo automaticamente na sua base.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="cnpj">
              <TabsList>
                <TabsTrigger value="cnpj">Por CNPJ</TabsTrigger>
                <TabsTrigger value="chave">Site / e-mail</TabsTrigger>
                <TabsTrigger value="cnpja">Janela CNPJá</TabsTrigger>
              </TabsList>


              <TabsContent value="cnpj" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpjs">CNPJs</Label>
                  <Textarea
                    id="cnpjs"
                    rows={6}
                    className="font-mono text-sm"
                    placeholder={"38.024.964/0001-42\n03076832000180"}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe por linha, vírgula ou espaço. {cnpjs.length} identificado(s).
                  </p>
                </div>
                <label
                  className={`flex items-start gap-3 rounded-md border border-dashed p-3 ${
                    cnpjs.length > 1
                      ? "border-border/60 bg-muted/30"
                      : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={buscaTotal && cnpjs.length <= 1}
                    onCheckedChange={(v) => {
                      if (cnpjs.length > 1) return;
                      setBuscaTotal(v === true);
                    }}
                    disabled={cnpjs.length > 1}
                    aria-label="Buscar tudo"
                  />
                  <span>
                    <span className="block text-sm font-medium">Buscar tudo</span>
                    <span className="block text-xs text-muted-foreground">
                      Ignora o cache, consulta todas as fontes ativas em tempo real e pede os
                      módulos extras da CNPJá (Simples/MEI, inscrições estaduais, SUFRAMA,
                      geolocalização e comprovantes). Consome mais créditos.
                      {cnpjs.length > 1 && (
                        <>
                          {" "}
                          <span className="text-amber-600 dark:text-amber-400">
                            Disponível apenas para 1 CNPJ por vez para evitar consumo em massa.
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                </label>
                <Button
                  disabled={cnpjs.length === 0 || carregando}
                  onClick={() => mutCnpjs.mutate(cnpjs)}
                >
                  {mutCnpjs.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Consultar {cnpjs.length > 1 ? `${cnpjs.length} CNPJs` : "CNPJ"}
                </Button>
              </TabsContent>

              <TabsContent value="chave" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="chaves">Sites, e-mails ou CNPJs</Label>
                  <Textarea
                    id="chaves"
                    rows={6}
                    className="font-mono text-sm"
                    placeholder={"empresa.com.br\ncontato@empresa.com.br\n38.024.964/0001-42"}
                    value={chaves}
                    onChange={(e) => setChaves(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pode misturar site, e-mail e CNPJ na mesma lista. {listaChaves.length}{" "}
                    identificado(s).
                  </p>
                </div>
                <Button
                  disabled={listaChaves.length === 0 || carregando}
                  onClick={() => mutChaves.mutate(listaChaves)}
                >
                  {mutChaves.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar {listaChaves.length > 1 ? `${listaChaves.length} chaves` : ""}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salvar na lista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem lista</SelectItem>
                {(listas.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Crie e organize listas em{" "}
              <Link to="/listas" className="text-accent underline underline-offset-4">
                Listas
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Busca avançada na sua base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Nome / CNPJ">
              <Input
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                placeholder="razão social, fantasia ou CNPJ"
              />
            </Campo>
            <Campo label="CNAE (código ou descrição)">
              <Input
                value={filtros.cnae}
                onChange={(e) => setFiltros({ ...filtros, cnae: e.target.value })}
                placeholder="ex.: 6201-5 ou software"
              />
            </Campo>
            <Campo label="Cidade">
              <Input
                value={filtros.cidade}
                onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
                placeholder="ex.: Curitiba"
              />
            </Campo>
            <Campo label="Bairro">
              <Input
                value={filtros.bairro}
                onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
              />
            </Campo>
            <Campo label="Estado">
              <Combo
                value={filtros.uf}
                onChange={(v) => setFiltros({ ...filtros, uf: v })}
                todos="Todos os estados"
                itens={opcoes.data?.ufs ?? []}
              />
            </Campo>
            <Campo label="Porte estimado">
              <Combo
                value={filtros.porte}
                onChange={(v) => setFiltros({ ...filtros, porte: v })}
                todos="Todos os portes"
                itens={opcoes.data?.portes ?? []}
              />
            </Campo>
            <Campo label="Situação cadastral">
              <Combo
                value={filtros.situacao}
                onChange={(v) => setFiltros({ ...filtros, situacao: v })}
                todos="Todas as situações"
                itens={opcoes.data?.situacoes ?? []}
              />
            </Campo>
            <Campo label="Setor">
              <Combo
                value={filtros.setor}
                onChange={(v) => setFiltros({ ...filtros, setor: v })}
                todos="Todos os setores"
                itens={opcoes.data?.setores ?? []}
              />
            </Campo>
            <Campo label="Natureza jurídica">
              <Input
                value={filtros.naturezaJuridica}
                onChange={(e) => setFiltros({ ...filtros, naturezaJuridica: e.target.value })}
                placeholder="ex.: Limitada"
              />
            </Campo>
            <Campo label="Status comercial">
              <Combo
                value={filtros.status}
                onChange={(v) => setFiltros({ ...filtros, status: v })}
                todos="Todos os status"
                itens={STATUSES.map((st) => st)}
                rotulo={(v) => STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? v}
              />
            </Campo>
            <Campo label="Lista">
              <Combo
                value={filtros.listId}
                onChange={(v) => setFiltros({ ...filtros, listId: v })}
                todos="Todas as listas"
                itens={(listas.data ?? []).map((l) => l.id)}
                rotulo={(v) => (listas.data ?? []).find((l) => l.id === v)?.name ?? v}
              />
            </Campo>
            <Campo label="Capital social (R$)">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="mín."
                  value={filtros.capitalMin}
                  onChange={(e) => setFiltros({ ...filtros, capitalMin: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="máx."
                  value={filtros.capitalMax}
                  onChange={(e) => setFiltros({ ...filtros, capitalMax: e.target.value })}
                />
              </div>
            </Campo>
            <Campo label="Abertura de">
              <Input
                type="date"
                value={filtros.aberturaDe}
                onChange={(e) => setFiltros({ ...filtros, aberturaDe: e.target.value })}
              />
            </Campo>
            <Campo label="Abertura até">
              <Input
                type="date"
                value={filtros.aberturaAte}
                onChange={(e) => setFiltros({ ...filtros, aberturaAte: e.target.value })}
              />
            </Campo>
          </div>

          <div className="flex flex-wrap gap-4">
            {(
              [
                ["comTelefone", "Só com telefone"],
                ["comEmail", "Só com e-mail"],
                ["comSite", "Só com site"],
                ["comDecisor", "Só com sócio/decisor"],
              ] as const
            ).map(([campo, rotulo]) => (
              <label key={campo} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filtros[campo]}
                  onCheckedChange={(v) => setFiltros({ ...filtros, [campo]: v === true })}
                />
                {rotulo}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setFiltrosAtivos({ ...filtros })}>
              {baseQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Filtrar base
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFiltros(FILTROS_VAZIOS);
                setFiltrosAtivos(null);
              }}
            >
              Limpar
            </Button>
          </div>

          {filtrosAtivos && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {baseQuery.data?.total ?? 0} empresa(s) na base com esses filtros.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {(baseQuery.data?.empresas ?? []).map((c: Company) => (
                  <Link
                    key={c.cnpj}
                    to="/empresas/$cnpj"
                    params={{ cnpj: c.cnpj.replace(/\D/g, "") }}
                    className="rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{c.razao_social}</p>
                    <p className="font-mono text-xs text-muted-foreground">{formatCnpj(c.cnpj)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.cidade ?? "—"}/{c.uf ?? "—"} · {c.cnae_descricao ?? "—"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {itens.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Resultados</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {itens.map((item) => (
              <Card key={item.cnpj + String(item.encontrada)}>
                <CardContent className="p-4">
                  {item.encontrada && item.company ? (
                    <Link
                      to="/empresas/$cnpj"
                      params={{ cnpj: item.company.cnpj.replace(/\D/g, "") }}
                      className="block"
                    >
                      <p className="font-medium">{item.company.razao_social}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatCnpj(item.company.cnpj)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.company.cnae_descricao ?? "—"} · {item.company.cidade ?? "—"}/
                        {item.company.uf ?? "—"}
                      </p>
                      <p className="mt-2 text-xs text-accent">Ver ficha completa →</p>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-mono text-sm">{item.cnpj}</p>
                        <p className="text-xs text-destructive">{item.erro}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type Filtros = {
  busca: string;
  cnae: string;
  cidade: string;
  bairro: string;
  uf: string;
  porte: string;
  situacao: string;
  setor: string;
  naturezaJuridica: string;
  status: string;
  listId: string;
  capitalMin: string;
  capitalMax: string;
  aberturaDe: string;
  aberturaAte: string;
  comTelefone: boolean;
  comEmail: boolean;
  comSite: boolean;
  comDecisor: boolean;
};

const FILTROS_VAZIOS: Filtros = {
  busca: "",
  cnae: "",
  cidade: "",
  bairro: "",
  uf: "todos",
  porte: "todos",
  situacao: "todos",
  setor: "todos",
  naturezaJuridica: "",
  status: "todos",
  listId: "todos",
  capitalMin: "",
  capitalMax: "",
  aberturaDe: "",
  aberturaAte: "",
  comTelefone: false,
  comEmail: false,
  comSite: false,
  comDecisor: false,
};

function montarFiltros(f: Filtros) {
  const out: Record<string, unknown> = {};
  if (f.busca.trim()) out["busca"] = f.busca.trim();
  if (f.cnae.trim()) out["cnae"] = f.cnae.trim();
  if (f.cidade.trim()) out["cidade"] = f.cidade.trim();
  if (f.bairro.trim()) out["bairro"] = f.bairro.trim();
  if (f.naturezaJuridica.trim()) out["naturezaJuridica"] = f.naturezaJuridica.trim();
  if (f.uf !== "todos") out["uf"] = f.uf;
  if (f.porte !== "todos") out["porte"] = f.porte;
  if (f.situacao !== "todos") out["situacao"] = f.situacao;
  if (f.setor !== "todos") out["setor"] = f.setor;
  if (f.status !== "todos") out["status"] = f.status;
  if (f.listId !== "todos") out["listId"] = f.listId;
  if (f.capitalMin) out["capitalMin"] = Number(f.capitalMin);
  if (f.capitalMax) out["capitalMax"] = Number(f.capitalMax);
  if (f.aberturaDe) out["aberturaDe"] = f.aberturaDe;
  if (f.aberturaAte) out["aberturaAte"] = f.aberturaAte;
  if (f.comTelefone) out["comTelefone"] = true;
  if (f.comEmail) out["comEmail"] = true;
  if (f.comSite) out["comSite"] = true;
  if (f.comDecisor) out["comDecisor"] = true;
  return out;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Combo({
  value,
  onChange,
  itens,
  todos,
  rotulo,
}: {
  value: string;
  onChange: (v: string) => void;
  itens: string[];
  todos: string;
  rotulo?: (v: string) => string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">{todos}</SelectItem>
        {itens.map((i) => (
          <SelectItem key={i} value={i}>
            {rotulo ? rotulo(i) : i}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
