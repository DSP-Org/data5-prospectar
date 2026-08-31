import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useListas } from "@/lib/use-listas";
import { useUnidadeAtiva } from "@/lib/unidade-ativa";

import {
  consultarCnpjsFn,
} from "@/lib/econodata.functions";
import { fichaCnpjaAbertaFn } from "@/lib/cnpja-open.functions";
import { buscarCnpjaFn } from "@/lib/cnpja-busca.functions";
import { buscarLocalFn } from "@/lib/busca-local.functions";
import { conversarFiltrosFn } from "@/lib/ia-filtros.functions";

import { formatCnpj, type LookupItem } from "@/lib/types";
import { UFS, listarCnaes, listarMunicipios, type CnaeIbge, type MunicipioIbge } from "@/lib/ibge";
import { Combobox, ComboboxMulti } from "@/components/Combobox";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  const [listId, setListId] = useState("nenhuma");
  const [itens, setItens] = useState<LookupItem[]>([]);
  const [buscaTotal, setBuscaTotal] = useState(false);
  const [cnpjUnico, setCnpjUnico] = useState("");
  const [subAba, setSubAba] = useState("ficha");
  const [termoPago, setTermoPago] = useState("");


  const listas = useListas();
  const { unidade } = useUnidadeAtiva();
  const consultarCnpjs = useServerFn(consultarCnpjsFn);


  const alvoLista = listId === "nenhuma" ? null : listId;

  const mutCnpjs = useMutation({
    mutationFn: (p: { cnpjs: string[]; completo: boolean }) =>
      consultarCnpjs({
        data: { cnpjs: p.cnpjs, listId: alvoLista, completo: p.completo, unitId: unidade ?? undefined },
      }),
    onSuccess: (res) => {
      setItens(res.itens);
      const ok = res.itens.filter((i) => i.encontrada).length;
      toast.success(`${ok} empresa(s) encontrada(s) e salva(s).`);
      void qc.invalidateQueries({ queryKey: ["painel"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cnpjs = texto
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);

  const cnpjUnicoLimpo = cnpjUnico.trim();


  const carregando = mutCnpjs.isPending;

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
            <Tabs defaultValue="individual">
              <TabsList>
                <TabsTrigger value="individual">CNPJ individual</TabsTrigger>
                <TabsTrigger value="lista">Lista de CNPJs</TabsTrigger>
                <TabsTrigger value="cnpja">Janela CNPJá</TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj-unico">CNPJ</Label>
                  <Input
                    id="cnpj-unico"
                    className="font-mono text-sm"
                    placeholder="38.024.964/0001-42"
                    value={cnpjUnico}
                    onChange={(e) => setCnpjUnico(e.target.value)}
                  />
                </div>
                <label className="flex items-start gap-3 rounded-md border border-dashed border-border p-3">
                  <Checkbox
                    checked={buscaTotal}
                    onCheckedChange={(v) => setBuscaTotal(v === true)}
                    aria-label="Buscar tudo"
                  />
                  <span>
                    <span className="block text-sm font-medium">Buscar tudo</span>
                    <span className="block text-xs text-muted-foreground">
                      Ignora o cache, consulta todas as fontes ativas em tempo real e pede os
                      módulos extras da CNPJá (Simples/MEI, inscrições estaduais, SUFRAMA,
                      geolocalização e comprovantes). Consome mais créditos.
                    </span>
                  </span>
                </label>
                <Button
                  disabled={cnpjUnicoLimpo.length === 0 || carregando}
                  onClick={() => mutCnpjs.mutate({ cnpjs: [cnpjUnicoLimpo], completo: buscaTotal })}
                >
                  {mutCnpjs.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Consultar CNPJ
                </Button>
              </TabsContent>

              <TabsContent value="lista" className="space-y-4 pt-4">
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
                <p className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  Em lote o sistema usa o cache e as fontes gratuitas primeiro para economizar
                  créditos. Use a aba “CNPJ individual” quando precisar do “Buscar tudo”.
                </p>
                <Button
                  disabled={cnpjs.length === 0 || carregando}
                  onClick={() => mutCnpjs.mutate({ cnpjs, completo: false })}
                >
                  {mutCnpjs.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Consultar {cnpjs.length > 1 ? `${cnpjs.length} CNPJs` : "CNPJ"}
                </Button>
              </TabsContent>





              <TabsContent value="cnpja" className="space-y-3 pt-4">
                <Tabs value={subAba} onValueChange={setSubAba}>
                  <TabsList>
                    <TabsTrigger value="ficha">Buscar por nome ou CNPJ (grátis)</TabsTrigger>
                    <TabsTrigger value="avancada">Busca avançada (plano pago)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ficha" className="pt-4">
                    <JanelaCnpja
                      listId={alvoLista}
                      onEscalar={(termo) => {
                        setTermoPago(termo);
                        setSubAba("avancada");
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="avancada" className="pt-4">
                    <BuscaAvancadaCnpja listId={alvoLista} nomeInicial={termoPago} />
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

function JanelaCnpja({
  listId,
  onEscalar,
}: {
  listId: string | null;
  onEscalar: (termo: string) => void;
}) {
  const [cnpj, setCnpj] = useState("");
  const [termoDebounce, setTermoDebounce] = useState("");
  const [visiveis, setVisiveis] = useState<BlocoId[]>(BLOCOS.map((b) => b.id));
  const consultar = useServerFn(fichaCnpjaAbertaFn);
  const consultarCnpjs = useServerFn(consultarCnpjsFn);
  const buscarLocal = useServerFn(buscarLocalFn);
  const qc = useQueryClient();
  const { unidade } = useUnidadeAtiva();

  const digitos = cnpj.replace(/\D/g, "");
  const ehCnpj = digitos.length === 14;
  const termoNome = ehCnpj ? "" : cnpj.trim();

  useEffect(() => {
    const t = setTimeout(() => setTermoDebounce(termoNome), 400);
    return () => clearTimeout(t);
  }, [termoNome]);

  // Só consulta a base local do sistema — nunca chama API paga.
  const locais = useQuery({
    queryKey: ["busca-local", termoDebounce],
    queryFn: () => buscarLocal({ data: { termo: termoDebounce, limite: 20 } }),
    enabled: termoDebounce.length >= 2,
    staleTime: 30_000,
  });

  const busca = useMutation({
    mutationFn: (valor: string) => consultar({ data: { cnpj: valor } }),
    onError: (e: Error) => toast.error(e.message || "Não foi possível consultar."),
  });

  const salvar = useMutation({
    mutationFn: (valor: string) =>
      consultarCnpjs({
        data: { cnpjs: [valor.replace(/\D/g, "")], listId, completo: false, unitId: unidade ?? undefined },
      }),
    onSuccess: () => {
      toast.success("Empresa salva na base.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar na base."),
  });

  const ficha = busca.data;
  const mostrar = (id: BlocoId) => visiveis.includes(id);

  const abrirFicha = (valor: string) => {
    setCnpj(formatCnpj(valor));
    busca.mutate(valor);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="cnpja-cnpj">CNPJ ou nome da empresa</Label>
          <Input
            id="cnpja-cnpj"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00 ou parte do nome"
            onKeyDown={(e) => {
              if (e.key === "Enter" && ehCnpj) busca.mutate(cnpj);
            }}
          />
        </div>
        <Button onClick={() => busca.mutate(cnpj)} disabled={!ehCnpj || busca.isPending}>
          {busca.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Consultar
        </Button>
        <Button
          variant="secondary"
          onClick={() => salvar.mutate(cnpj)}
          disabled={!ficha || salvar.isPending}
        >
          {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar na base
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Digitando um nome, o sistema filtra a sua própria base de empresas — sem consumir créditos.
        Digitando um CNPJ completo, a ficha pública e gratuita do CNPJá é consultada e pode ser
        salva na lista selecionada acima (respeitando cache e Modo Econômico).
      </p>

      {termoNome.length >= 2 && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Resultados na base local
              {locais.data ? ` · ${locais.data.total}` : ""}
            </p>
            {locais.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {locais.data?.itens.length ? (
            <ul className="divide-y">
              {locais.data.itens.map((e) => (
                <li key={e.cnpj} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.razaoSocial}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatCnpj(e.cnpj)}
                      {e.nomeFantasia ? ` · ${e.nomeFantasia}` : ""}
                      {e.cidade ? ` · ${e.cidade}${e.uf ? `/${e.uf}` : ""}` : ""}
                      {e.telefone ? ` · ${e.telefone}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => abrirFicha(e.cnpj)}>
                      Ver ficha
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        to="/empresas/$cnpj"
                        params={{ cnpj: e.cnpj.replace(/\D/g, "") }}
                      >
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !locais.isFetching && (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa com esse nome na base local.
              </p>
            )
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={() => onEscalar(termoNome)}>
              Procurar nas fontes pagas
            </Button>
            <span className="text-xs text-muted-foreground">
              Só consome crédito ao clicar em “Buscar” na busca avançada.
            </span>
          </div>
        </div>
      )}


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
  municipiosIbge: string[];
  bairro: string;
  cep: string;
  cnaesPrincipais: string[];
  cnaeQualquer: string;
  porteIds: string[];
  situacaoIds: string[];
  capitalMin: string;
  capitalMax: string;
  aberturaDe: string;
  aberturaAte: string;
  somenteMatriz: boolean;
  nomeFantasia: string;
  excluirNomes: string;
  logradouro: string;
  cepDe: string;
  cepAte: string;
  cnaeSecundario: string;
  cnaeExcluir: string;
  situacaoDesde: string;
  situacaoAte: string;
  matrizFilial: string;
  simples: string;
  mei: string;
  temTelefone: string;
  telefoneTipo: string;
  ddd: string;
  temEmail: string;
  emailDominio: string;
  emailTipo: string;
  limite: string;
};

const FILTROS_INICIAIS: FiltrosCnpja = {
  nome: "",
  uf: "",
  municipiosIbge: [],
  bairro: "",
  cep: "",
  cnaesPrincipais: [],
  cnaeQualquer: "",
  porteIds: [],
  situacaoIds: ["2"],
  capitalMin: "",
  capitalMax: "",
  aberturaDe: "",
  aberturaAte: "",
  somenteMatriz: true,
  nomeFantasia: "",
  excluirNomes: "",
  logradouro: "",
  cepDe: "",
  cepAte: "",
  cnaeSecundario: "",
  cnaeExcluir: "",
  situacaoDesde: "",
  situacaoAte: "",
  matrizFilial: "matriz",
  simples: "",
  mei: "",
  temTelefone: "",
  telefoneTipo: "",
  ddd: "",
  temEmail: "",
  emailDominio: "",
  emailTipo: "",
  limite: "20",
};

const normalizar = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function BuscaAvancadaCnpja({
  listId,
  nomeInicial,
}: {
  listId: string | null;
  nomeInicial?: string;
}) {
  const [f, setF] = useState<FiltrosCnpja>(FILTROS_INICIAIS);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pedidoIa, setPedidoIa] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [avancadosAbertos, setAvancadosAbertos] = useState(false);
  const [conversa, setConversa] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => {
    if (nomeInicial) setF((atual) => ({ ...atual, nome: nomeInicial }));
  }, [nomeInicial]);

  const qc = useQueryClient();

  const buscar = useServerFn(buscarCnpjaFn);
  const consultarCnpjs = useServerFn(consultarCnpjsFn);
  const { unidade } = useUnidadeAtiva();

  const municipios = useQuery({
    queryKey: ["ibge-municipios", f.uf],
    queryFn: () => listarMunicipios(f.uf),
    enabled: f.uf !== "",
    staleTime: 1000 * 60 * 60 * 24,
  });
  const cnaes = useQuery({
    queryKey: ["ibge-cnaes"],
    queryFn: listarCnaes,
    staleTime: 1000 * 60 * 60 * 24,
  });

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

  const conversar = useServerFn(conversarFiltrosFn);

  const ia = useMutation({
    mutationFn: async (pedido: string) => {
      const historico = [...conversa, { role: "user" as const, content: pedido }];
      const r = await conversar({ data: { mensagens: historico } });

      if (!r.aplicar || !r.filtros) {
        return { r, historico, uf: "", municipiosIds: [] as string[], cnaesIds: [] as string[] };
      }

      const s = r.filtros;
      const uf = (s.uf ?? "").toUpperCase().slice(0, 2);
      let municipiosIds: string[] = [];
      if (uf && (s.municipios?.length ?? 0) > 0) {
        const lista = await listarMunicipios(uf);
        municipiosIds = (s.municipios ?? [])
          .map((nome) => {
            const alvo = normalizar(nome);
            return lista.find((m) => normalizar(m.nome) === alvo)?.id
              ?? lista.find((m) => normalizar(m.nome).includes(alvo))?.id
              ?? "";
          })
          .filter(Boolean);
      }

      let cnaesIds: string[] = [];
      if ((s.cnaeTermos?.length ?? 0) > 0) {
        const lista = cnaes.data ?? (await listarCnaes());
        const PARADAS = new Set([
          "de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "a", "o", "as", "os",
          "no", "na", "nos", "nas", "ou", "um", "uma",
        ]);
        const tokens = (t: string) =>
          normalizar(t)
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length >= 3 && !PARADAS.has(w));

        for (const termo of s.cnaeTermos ?? []) {
          const codigo = termo.replace(/\D/g, "");
          if (codigo.length >= 4) {
            const exato = lista.filter((c) => c.id.startsWith(codigo)).slice(0, 5);
            if (exato.length > 0) {
              cnaesIds.push(...exato.map((c) => c.id));
              continue;
            }
          }
          const palavras = tokens(termo);
          if (palavras.length === 0) continue;

          const pontuados = lista
            .map((c) => {
              const desc = normalizar(c.descricao);
              const acertos = palavras.filter((p) => desc.includes(p)).length;
              return { id: c.id, acertos, tamanho: desc.length };
            })
            .filter((x) => x.acertos > 0);

          const melhor = Math.max(...pontuados.map((x) => x.acertos), 0);
          if (melhor === 0) continue;
          const minimo = Math.max(1, Math.min(melhor, Math.ceil(palavras.length / 2)));

          cnaesIds.push(
            ...pontuados
              .filter((x) => x.acertos >= minimo)
              .sort((a, b) => b.acertos - a.acertos || a.tamanho - b.tamanho)
              .slice(0, 8)
              .map((x) => x.id),
          );
        }
        cnaesIds = [...new Set(cnaesIds)].slice(0, 20);
      }

      return { r, historico, uf, municipiosIds, cnaesIds };
    },
    onSuccess: ({ r, historico, uf, municipiosIds, cnaesIds }) => {
      const s = r.filtros;
      const fala = r.mensagem || (r.aplicar ? s?.explicacao ?? "Filtros preenchidos." : "…");
      setConversa([...historico, { role: "assistant" as const, content: fala }]);
      setPedidoIa("");

      if (!r.aplicar || !s) return;

      setF((atual) => ({
        ...atual,
        nome: s.nome ?? atual.nome,
        nomeFantasia: s.nomeFantasia ?? atual.nomeFantasia,
        uf: uf || atual.uf,
        municipiosIbge: municipiosIds.length > 0 ? municipiosIds : uf ? [] : atual.municipiosIbge,
        bairro: s.bairro ?? atual.bairro,
        cnaesPrincipais: cnaesIds.length > 0 ? cnaesIds : atual.cnaesPrincipais,
        porteIds: (s.porteIds?.length ?? 0) > 0 ? (s.porteIds as string[]) : atual.porteIds,
        situacaoIds: (s.situacaoIds?.length ?? 0) > 0 ? (s.situacaoIds as string[]) : atual.situacaoIds,
        capitalMin: s.capitalMin != null ? String(s.capitalMin) : atual.capitalMin,
        capitalMax: s.capitalMax != null ? String(s.capitalMax) : atual.capitalMax,
        aberturaDe: s.aberturaDe ?? atual.aberturaDe,
        aberturaAte: s.aberturaAte ?? atual.aberturaAte,
        matrizFilial: s.matrizFilial ?? atual.matrizFilial,
        simples: s.simples ?? atual.simples,
        mei: s.mei ?? atual.mei,
        temTelefone: s.temTelefone ?? atual.temTelefone,
        temEmail: s.temEmail ?? atual.temEmail,
        ddd: s.ddd ?? atual.ddd,
        limite: s.limite != null ? String(s.limite) : atual.limite,
      }));
      toast.success(s.explicacao || "Filtros preenchidos pela IA. Revise antes de buscar.");
    },
    onError: (e: Error) => toast.error(e.message || "A IA não conseguiu responder."),
  });


  const mut = useMutation({
    mutationFn: (proximo: string | null) =>
      buscar({
        data: {
          nome: f.nome || null,
          uf: f.uf || null,
          municipioIbge: f.municipiosIbge.join(",") || null,
          bairro: f.bairro || null,
          cep: f.cep || null,
          cnaePrincipal: f.cnaesPrincipais.join(",") || null,
          cnaeQualquer: f.cnaeQualquer || null,
          porteIds: f.porteIds.join(",") || null,
          situacaoIds: f.situacaoIds.join(",") || null,
          capitalMin: num(f.capitalMin),
          capitalMax: num(f.capitalMax),
          aberturaDe: f.aberturaDe || null,
          aberturaAte: f.aberturaAte || null,
          nomeFantasia: f.nomeFantasia || null,
          excluirNomes: f.excluirNomes || null,
          logradouro: f.logradouro || null,
          cepDe: f.cepDe || null,
          cepAte: f.cepAte || null,
          cnaeSecundario: f.cnaeSecundario || null,
          cnaeExcluir: f.cnaeExcluir || null,
          situacaoDesde: f.situacaoDesde || null,
          situacaoAte: f.situacaoAte || null,
          matrizFilial: f.matrizFilial || null,
          simples: f.simples || null,
          mei: f.mei || null,
          temTelefone: f.temTelefone || null,
          telefoneTipo: f.telefoneTipo || null,
          ddd: f.ddd || null,
          temEmail: f.temEmail || null,
          emailDominio: f.emailDominio || null,
          emailTipo: f.emailTipo || null,
          somenteMatriz: false,
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
      consultarCnpjs({ data: { cnpjs, listId, completo: false, unitId: unidade ?? undefined } }),
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
        plano. Estados, municípios e atividades econômicas vêm das listas oficiais do IBGE.
      </p>

      <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Assistente de IA — converse até mandar aplicar
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto rounded-md bg-background/60 p-2">
          {conversa.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">
              Diga o que procura (ex.: “transportadoras em Salvador”). Eu pergunto os detalhes e só
              preencho os filtros quando você disser “aplicar”.
            </p>
          ) : (
            conversa.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground"
                    : "w-fit max-w-[85%] rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))
          )}
          {ia.isPending ? (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> pensando…
            </div>
          ) : null}
        </div>

        <Textarea
          value={pedidoIa}
          onChange={(e) => setPedidoIa(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!ia.isPending && pedidoIa.trim().length >= 2) ia.mutate(pedidoIa.trim());
            }
          }}
          placeholder="Ex.: transportadoras ativas em Salvador, capital acima de 100 mil… depois escreva “aplicar”"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => ia.mutate(pedidoIa.trim())}
            disabled={ia.isPending || pedidoIa.trim().length < 2}
          >
            {ia.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Enviar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => ia.mutate("aplicar")}
            disabled={ia.isPending || conversa.length === 0}
          >
            Aplicar filtros
          </Button>
          {conversa.length > 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setConversa([])}>
              Limpar conversa
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Nada é consultado na API até você clicar em buscar.
          </span>
        </div>
      </div>


      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            Filtros principais
            <ChevronDown
              className={`h-4 w-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">

        <div className="space-y-1">
          <Label>Nome / razão social contém</Label>
          <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: transportes" />
        </div>
        <div className="space-y-1">
          <Label>Estado (UF)</Label>
          <Combobox
            opcoes={UFS.map((u) => ({ value: u, label: u }))}
            valor={f.uf}
            onChange={(v) => setF((atual) => ({ ...atual, uf: v, municipiosIbge: [] }))}
            placeholder="Todos os estados"
            buscaPlaceholder="Buscar UF…"
          />
        </div>
        <div className="space-y-1">
          <Label>Municípios</Label>
          <ComboboxMulti
            opcoes={(municipios.data ?? []).map((m: MunicipioIbge) => ({ value: m.id, label: m.nome }))}
            valores={f.municipiosIbge}
            onChange={(v) => set("municipiosIbge", v)}
            disabled={!f.uf}
            loading={municipios.isLoading}
            placeholder={f.uf ? "Todos os municípios" : "Escolha a UF primeiro"}
            buscaPlaceholder="Buscar município…"
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
          <Label>Atividade econômica (CNAE principal)</Label>
          <ComboboxMulti
            opcoes={(cnaes.data ?? []).map((c: CnaeIbge) => ({
              value: c.id,
              label: `${c.id} — ${c.descricao}`,
            }))}
            valores={f.cnaesPrincipais}
            onChange={(v) => set("cnaesPrincipais", v)}
            loading={cnaes.isLoading}
            placeholder="Todas as atividades"
            buscaPlaceholder="Buscar atividade ou código…"
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
        </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={avancadosAbertos} onOpenChange={setAvancadosAbertos}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            Filtros avançados (contato, CNAE secundário, Simples, CEP…)
            <ChevronDown
              className={`h-4 w-4 transition-transform ${avancadosAbertos ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">

          <Label>Nome fantasia contém</Label>
          <Input value={f.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} placeholder="Ex.: farmácia" />
        </div>
        <div className="space-y-1">
          <Label>Excluir nomes que contenham</Label>
          <Input value={f.excluirNomes} onChange={(e) => set("excluirNomes", e.target.value)} placeholder="Ex.: condominio" />
        </div>
        <div className="space-y-1">
          <Label>Logradouro</Label>
          <Input value={f.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="AVENIDA PAULISTA" />
        </div>
        <div className="space-y-1">
          <Label>CEP de</Label>
          <Input value={f.cepDe} onChange={(e) => set("cepDe", e.target.value)} placeholder="01000000" />
        </div>
        <div className="space-y-1">
          <Label>CEP até</Label>
          <Input value={f.cepAte} onChange={(e) => set("cepAte", e.target.value)} placeholder="01999999" />
        </div>
        <div className="space-y-1">
          <Label>CNAE secundário</Label>
          <Input value={f.cnaeSecundario} onChange={(e) => set("cnaeSecundario", e.target.value)} placeholder="4712100" />
        </div>
        <div className="space-y-1">
          <Label>Excluir CNAEs</Label>
          <Input value={f.cnaeExcluir} onChange={(e) => set("cnaeExcluir", e.target.value)} placeholder="8888888" />
        </div>
        <div className="space-y-1">
          <Label>Situação alterada de</Label>
          <Input type="date" value={f.situacaoDesde} onChange={(e) => set("situacaoDesde", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Situação alterada até</Label>
          <Input type="date" value={f.situacaoAte} onChange={(e) => set("situacaoAte", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Matriz / filial</Label>
          <Select value={f.matrizFilial || "todos"} onValueChange={(v) => set("matrizFilial", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="matriz">Somente matriz</SelectItem>
              <SelectItem value="filial">Somente filial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Simples Nacional</Label>
          <Select value={f.simples || "todos"} onValueChange={(v) => set("simples", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tanto faz</SelectItem>
              <SelectItem value="sim">Optante</SelectItem>
              <SelectItem value="nao">Não optante</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>MEI</Label>
          <Select value={f.mei || "todos"} onValueChange={(v) => set("mei", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tanto faz</SelectItem>
              <SelectItem value="sim">Somente MEI</SelectItem>
              <SelectItem value="nao">Excluir MEI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Possui telefone</Label>
          <Select value={f.temTelefone || "todos"} onValueChange={(v) => set("temTelefone", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tanto faz</SelectItem>
              <SelectItem value="sim">Com telefone</SelectItem>
              <SelectItem value="nao">Sem telefone</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tipo de telefone</Label>
          <Select value={f.telefoneTipo || "todos"} onValueChange={(v) => set("telefoneTipo", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="MOBILE">Celular</SelectItem>
              <SelectItem value="LANDLINE">Fixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>DDD</Label>
          <Input value={f.ddd} onChange={(e) => set("ddd", e.target.value)} placeholder="11, 21" />
        </div>
        <div className="space-y-1">
          <Label>Possui e-mail</Label>
          <Select value={f.temEmail || "todos"} onValueChange={(v) => set("temEmail", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tanto faz</SelectItem>
              <SelectItem value="sim">Com e-mail</SelectItem>
              <SelectItem value="nao">Sem e-mail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Domínio do e-mail</Label>
          <Input value={f.emailDominio} onChange={(e) => set("emailDominio", e.target.value)} placeholder="gmail.com" />
        </div>
        <div className="space-y-1">
          <Label>Tipo de e-mail</Label>
          <Select value={f.emailTipo || "todos"} onValueChange={(v) => set("emailTipo", v === "todos" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="CORPORATE">Corporativo</SelectItem>
              <SelectItem value="ACCOUNTING">Contabilidade</SelectItem>
              <SelectItem value="PERSONAL">Pessoal</SelectItem>
            </SelectContent>
          </Select>
        </div>
          </div>
        </CollapsibleContent>
      </Collapsible>


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
