import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  consultarChavesFn,
  consultarCnpjsFn,
  listarListasFn,
} from "@/lib/econodata.functions";
import { fichaCnpjaAbertaFn } from "@/lib/cnpja-open.functions";
import { buscarCnpjaFn } from "@/lib/cnpja-busca.functions";
import { formatCnpj, type LookupItem } from "@/lib/types";
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

  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const consultarCnpjs = useServerFn(consultarCnpjsFn);
  const consultarChaves = useServerFn(consultarChavesFn);


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

              <TabsContent value="cnpja" className="space-y-3 pt-4">
                <Tabs defaultValue="ficha">
                  <TabsList>
                    <TabsTrigger value="ficha">Ficha por CNPJ (grátis)</TabsTrigger>
                    <TabsTrigger value="avancada">Busca avançada (plano pago)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ficha" className="pt-4">
                    <JanelaCnpja />
                  </TabsContent>
                  <TabsContent value="avancada" className="pt-4">
                    <BuscaAvancadaCnpja listId={alvoLista} />
                  </TabsContent>
                </Tabs>
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

const BLOCOS = [
  { id: "cadastro", label: "Cadastro e endereço" },
  { id: "contatos", label: "Contatos" },
  { id: "atividades", label: "Atividades (CNAE)" },
  { id: "socios", label: "Quadro societário" },
  { id: "tributario", label: "Tributário" },
] as const;

type BlocoId = (typeof BLOCOS)[number]["id"];

function JanelaCnpja() {
  const [cnpj, setCnpj] = useState("");
  const [visiveis, setVisiveis] = useState<BlocoId[]>(BLOCOS.map((b) => b.id));
  const consultar = useServerFn(fichaCnpjaAbertaFn);

  const busca = useMutation({
    mutationFn: (valor: string) => consultar({ data: { cnpj: valor } }),
    onError: (e: Error) => toast.error(e.message || "Não foi possível consultar."),
  });

  const ficha = busca.data;
  const mostrar = (id: BlocoId) => visiveis.includes(id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="cnpja-cnpj">CNPJ</Label>
          <Input
            id="cnpja-cnpj"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            onKeyDown={(e) => {
              if (e.key === "Enter" && cnpj.trim()) busca.mutate(cnpj);
            }}
          />
        </div>
        <Button onClick={() => busca.mutate(cnpj)} disabled={!cnpj.trim() || busca.isPending}>
          {busca.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Consultar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Consulta pública e gratuita do CNPJá, sem consumo de créditos. Os dados não são salvos na
        base — use a aba “Por CNPJ” para gravar e enriquecer com as demais fontes.
      </p>

      <div className="flex flex-wrap gap-4 rounded-md border bg-muted/30 p-3">
        {BLOCOS.map((b) => (
          <label key={b.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={mostrar(b.id)}
              onCheckedChange={(v) =>
                setVisiveis((atual) =>
                  v ? [...new Set([...atual, b.id])] : atual.filter((i) => i !== b.id),
                )
              }
            />
            {b.label}
          </label>
        ))}
      </div>

      {busca.isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {(busca.error as Error).message}
        </div>
      )}

      {ficha && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{ficha.razaoSocial}</h2>
            <p className="text-sm text-muted-foreground">
              {formatCnpj(ficha.cnpj)} · {ficha.matriz ? "Matriz" : "Filial"}
              {ficha.nomeFantasia ? ` · ${ficha.nomeFantasia}` : ""}
            </p>
          </div>

          {mostrar("cadastro") && (
            <BlocoFicha titulo="Cadastro e endereço">
              <CampoFicha rotulo="Situação" valor={ficha.situacao} />
              <CampoFicha rotulo="Data da situação" valor={ficha.dataSituacao} />
              <CampoFicha rotulo="Motivo" valor={ficha.motivoSituacao} />
              <CampoFicha rotulo="Abertura" valor={ficha.dataAbertura} />
              <CampoFicha rotulo="Natureza jurídica" valor={ficha.naturezaJuridica} />
              <CampoFicha rotulo="Porte" valor={ficha.porte} />
              <CampoFicha
                rotulo="Capital social"
                valor={
                  ficha.capitalSocial != null
                    ? ficha.capitalSocial.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : null
                }
              />
              <CampoFicha rotulo="Endereço" valor={ficha.endereco} />
              <CampoFicha
                rotulo="Município / UF"
                valor={[ficha.municipio, ficha.uf].filter(Boolean).join(" / ") || null}
              />
              <CampoFicha rotulo="CEP" valor={ficha.cep} />
            </BlocoFicha>
          )}

          {mostrar("contatos") && (
            <BlocoFicha titulo="Contatos">
              <CampoFicha rotulo="Telefones" valor={ficha.telefones.join(" · ") || null} />
              <CampoFicha rotulo="E-mails" valor={ficha.emails.join(" · ") || null} />
            </BlocoFicha>
          )}

          {mostrar("atividades") && (
            <BlocoFicha titulo="Atividades (CNAE)">
              <CampoFicha
                rotulo="Principal"
                valor={
                  ficha.atividadePrincipal
                    ? `${ficha.atividadePrincipal.codigo} — ${ficha.atividadePrincipal.descricao}`
                    : null
                }
              />
              {ficha.atividadesSecundarias.length > 0 && (
                <div className="col-span-full space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Secundárias</p>
                  <ul className="space-y-1 text-sm">
                    {ficha.atividadesSecundarias.map((a) => (
                      <li key={a.codigo}>
                        {a.codigo} — {a.descricao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </BlocoFicha>
          )}

          {mostrar("socios") && ficha.socios.length > 0 && (
            <BlocoFicha titulo="Quadro societário">
              <ul className="col-span-full space-y-2 text-sm">
                {ficha.socios.map((s) => (
                  <li key={`${s.nome}-${s.desde ?? ""}`}>
                    <span className="font-medium">{s.nome}</span>
                    <span className="text-muted-foreground">
                      {[s.qualificacao, s.desde ? `desde ${s.desde}` : null, s.faixaEtaria]
                        .filter(Boolean)
                        .map((t) => ` · ${t}`)
                        .join("")}
                    </span>
                  </li>
                ))}
              </ul>
            </BlocoFicha>
          )}

          {mostrar("tributario") && (
            <BlocoFicha titulo="Tributário">
              <CampoFicha rotulo="Simples Nacional" valor={ficha.simples} />
              <CampoFicha rotulo="MEI" valor={ficha.mei} />
              <CampoFicha
                rotulo="Atualizado em"
                valor={
                  ficha.atualizadoEm ? new Date(ficha.atualizadoEm).toLocaleString("pt-BR") : null
                }
              />
            </BlocoFicha>
          )}

          <a
            href={`https://cnpja.com/office/${ficha.cnpj}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs text-accent underline underline-offset-4"
          >
            Ver no CNPJá <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function BlocoFicha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function CampoFicha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase text-muted-foreground">{rotulo}</p>
      <p className="text-sm">{valor}</p>
    </div>
  );
}


// ===================== Busca avançada (API paga do CNPJá) =====================

const PORTES = [
  { id: "1", label: "MEI" },
  { id: "2", label: "ME" },
  { id: "3", label: "EPP" },
  { id: "5", label: "Demais" },
];

const SITUACOES = [
  { id: "1", label: "Nula" },
  { id: "2", label: "Ativa" },
  { id: "3", label: "Suspensa" },
  { id: "4", label: "Inapta" },
  { id: "8", label: "Baixada" },
];

type FiltrosCnpja = {
  nome: string;
  uf: string;
  municipioIbge: string;
  bairro: string;
  cep: string;
  cnaePrincipal: string;
  cnaeQualquer: string;
  porteIds: string[];
  situacaoIds: string[];
  capitalMin: string;
  capitalMax: string;
  aberturaDe: string;
  aberturaAte: string;
  somenteMatriz: boolean;
  limite: string;
};

const FILTROS_INICIAIS: FiltrosCnpja = {
  nome: "",
  uf: "",
  municipioIbge: "",
  bairro: "",
  cep: "",
  cnaePrincipal: "",
  cnaeQualquer: "",
  porteIds: [],
  situacaoIds: ["2"],
  capitalMin: "",
  capitalMax: "",
  aberturaDe: "",
  aberturaAte: "",
  somenteMatriz: true,
  limite: "20",
};

function BuscaAvancadaCnpja({ listId }: { listId: string | null }) {
  const [f, setF] = useState<FiltrosCnpja>(FILTROS_INICIAIS);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const qc = useQueryClient();

  const buscar = useServerFn(buscarCnpjaFn);
  const consultarCnpjs = useServerFn(consultarCnpjsFn);

  const set = <K extends keyof FiltrosCnpja>(k: K, v: FiltrosCnpja[K]) =>
    setF((atual) => ({ ...atual, [k]: v }));

  const toggle = (k: "porteIds" | "situacaoIds", id: string) =>
    setF((atual) => ({
      ...atual,
      [k]: atual[k].includes(id) ? atual[k].filter((v) => v !== id) : [...atual[k], id],
    }));

  const num = (v: string) => {
    const n = Number(v.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) && v.trim() !== "" ? n : null;
  };

  const mut = useMutation({
    mutationFn: (proximo: string | null) =>
      buscar({
        data: {
          nome: f.nome || null,
          uf: f.uf || null,
          municipioIbge: f.municipioIbge || null,
          bairro: f.bairro || null,
          cep: f.cep || null,
          cnaePrincipal: f.cnaePrincipal || null,
          cnaeQualquer: f.cnaeQualquer || null,
          porteIds: f.porteIds.join(",") || null,
          situacaoIds: f.situacaoIds.join(",") || null,
          capitalMin: num(f.capitalMin),
          capitalMax: num(f.capitalMax),
          aberturaDe: f.aberturaDe || null,
          aberturaAte: f.aberturaAte || null,
          somenteMatriz: f.somenteMatriz,
          limite: Number(f.limite) || 20,
          cursor: proximo,
        },
      }),
    onSuccess: (r) => {
      setCursor(r.proximoCursor);
      setSelecionados([]);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível buscar."),
  });

  const salvar = useMutation({
    mutationFn: (cnpjs: string[]) =>
      consultarCnpjs({ data: { cnpjs, listId, completo: false } }),
    onSuccess: (r) => {
      toast.success(`${r.itens?.length ?? 0} empresa(s) salva(s) na base.`);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar na base."),
  });

  const resultado = mut.data;
  const itens = resultado?.itens ?? [];
  const todos = itens.length > 0 && selecionados.length === itens.length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Busca por filtros na base completa do CNPJá usando sua chave paga. Consome créditos do seu
        plano. Municípios usam o código IBGE (ex.: 3550308 = São Paulo).
      </p>

      <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label>Nome / razão social contém</Label>
          <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: transportes" />
        </div>
        <div className="space-y-1">
          <Label>UF (separe por vírgula)</Label>
          <Input value={f.uf} onChange={(e) => set("uf", e.target.value)} placeholder="SP, MG" />
        </div>
        <div className="space-y-1">
          <Label>Município (código IBGE)</Label>
          <Input
            value={f.municipioIbge}
            onChange={(e) => set("municipioIbge", e.target.value)}
            placeholder="3550308"
          />
        </div>
        <div className="space-y-1">
          <Label>Bairro</Label>
          <Input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="CENTRO" />
        </div>
        <div className="space-y-1">
          <Label>CEP</Label>
          <Input value={f.cep} onChange={(e) => set("cep", e.target.value)} placeholder="01310000" />
        </div>
        <div className="space-y-1">
          <Label>CNAE principal</Label>
          <Input
            value={f.cnaePrincipal}
            onChange={(e) => set("cnaePrincipal", e.target.value)}
            placeholder="6201501"
          />
        </div>
        <div className="space-y-1">
          <Label>CNAE (principal ou secundário)</Label>
          <Input
            value={f.cnaeQualquer}
            onChange={(e) => set("cnaeQualquer", e.target.value)}
            placeholder="4712100, 4711302"
          />
        </div>
        <div className="space-y-1">
          <Label>Capital social mínimo</Label>
          <Input value={f.capitalMin} onChange={(e) => set("capitalMin", e.target.value)} placeholder="100000" />
        </div>
        <div className="space-y-1">
          <Label>Capital social máximo</Label>
          <Input value={f.capitalMax} onChange={(e) => set("capitalMax", e.target.value)} placeholder="5000000" />
        </div>
        <div className="space-y-1">
          <Label>Abertura de</Label>
          <Input type="date" value={f.aberturaDe} onChange={(e) => set("aberturaDe", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Abertura até</Label>
          <Input type="date" value={f.aberturaAte} onChange={(e) => set("aberturaAte", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Resultados por página</Label>
          <Select value={f.limite} onValueChange={(v) => set("limite", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "20", "50", "100"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label>Porte</Label>
          <div className="flex flex-wrap gap-3">
            {PORTES.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={f.porteIds.includes(p.id)}
                  onCheckedChange={() => toggle("porteIds", p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label>Situação cadastral</Label>
          <div className="flex flex-wrap gap-3">
            {SITUACOES.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={f.situacaoIds.includes(s.id)}
                  onCheckedChange={() => toggle("situacaoIds", s.id)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
          <Checkbox
            checked={f.somenteMatriz}
            onCheckedChange={(v) => set("somenteMatriz", Boolean(v))}
          />
          Somente matriz
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => mut.mutate(null)} disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setF(FILTROS_INICIAIS);
            setCursor(null);
          }}
        >
          Limpar filtros
        </Button>
        {resultado && (
          <span className="text-sm text-muted-foreground">
            {resultado.total.toLocaleString("pt-BR")} empresa(s) encontradas
          </span>
        )}
      </div>

      {mut.isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {(mut.error as Error).message}
        </div>
      )}

      {itens.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={todos}
                onCheckedChange={(v) => setSelecionados(v ? itens.map((i) => i.cnpj) : [])}
              />
              Selecionar todos
            </label>
            <Button
              size="sm"
              disabled={selecionados.length === 0 || salvar.isPending}
              onClick={() => salvar.mutate(selecionados)}
            >
              {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar {selecionados.length || ""} na base
            </Button>
          </div>

          <div className="divide-y rounded-md border">
            {itens.map((i) => (
              <div key={i.cnpj} className="flex items-start gap-3 p-3 text-sm">
                <Checkbox
                  className="mt-1"
                  checked={selecionados.includes(i.cnpj)}
                  onCheckedChange={(v) =>
                    setSelecionados((atual) =>
                      v ? [...new Set([...atual, i.cnpj])] : atual.filter((c) => c !== i.cnpj),
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.razaoSocial}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCnpj(i.cnpj)} · {i.matriz ? "Matriz" : "Filial"}
                    {i.cidade ? ` · ${i.cidade}` : ""}
                    {i.uf ? `/${i.uf}` : ""}
                    {i.situacao ? ` · ${i.situacao}` : ""}
                    {i.porte ? ` · ${i.porte}` : ""}
                  </p>
                  {i.cnaePrincipal && (
                    <p className="text-xs text-muted-foreground">{i.cnaePrincipal}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {cursor && (
            <Button variant="outline" onClick={() => mut.mutate(cursor)} disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Carregar próxima página
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
