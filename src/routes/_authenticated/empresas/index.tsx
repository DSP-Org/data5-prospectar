import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  FilterX,
  Loader2,
  Search,
  Smartphone,
  Star,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { useListas } from "@/lib/use-listas";
import { useUnidadeAtiva } from "@/lib/unidade-ativa";

import {
  assumirLeadsFn,
  consultarCnpjsFn,
  exportarEmpresasFn,
  liberarLeadsFn,
  listarEmpresasFn,
  marcarProspectarFn,
  opcoesFiltroFn,
  vincularEmpresasListaFn,
} from "@/lib/econodata.functions";
import { buscarCnpjaFn } from "@/lib/cnpja-busca.functions";
import { meFn } from "@/lib/auth.functions";
import { cn } from "@/lib/utils";
import {
  STATUS_LABEL,
  formatCnpj,
  isEmailContabil,
  possuiWhatsapp,
  type Company,
  type Status,
} from "@/lib/types";
import { GRUPOS_NATUREZA } from "@/lib/natureza-juridica";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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

export type BuscaEmpresas = {
  lista?: string;
  uf?: string;
  cidade?: string;
  cnae?: string;
  porte?: string;
  setor?: string;
  situacao?: string;
  status?: string;
  prospectar?: boolean;
  comTelefone?: boolean;
  comEmail?: boolean;
};

export const Route = createFileRoute("/_authenticated/empresas/")({
  validateSearch: (search: Record<string, unknown>): BuscaEmpresas => {
    const txt = (k: string) => (typeof search[k] === "string" && search[k] ? { [k]: search[k] as string } : {});
    const bool = (k: string) => (search[k] === true || search[k] === "true" ? { [k]: true } : {});
    return {
      ...txt("lista"),
      ...txt("uf"),
      ...txt("cidade"),
      ...txt("cnae"),
      ...txt("porte"),
      ...txt("setor"),
      ...txt("situacao"),
      ...txt("status"),
      ...bool("prospectar"),
      ...bool("comTelefone"),
      ...bool("comEmail"),
    } as BuscaEmpresas;
  },
  head: () => ({
    meta: [
      { title: "Base de empresas | Prospectar360" },
      {
        name: "description",
        content:
          "Filtre, acompanhe o status comercial e exporte em Excel ou PDF todas as empresas salvas.",
      },
      { property: "og:title", content: "Base de empresas | Prospectar360" },
      {
        property: "og:description",
        content: "Filtros por status, estado e lista, com exportação em Excel e relatório PDF da base de empresas.",
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

/** Dados que as células precisam além da própria empresa. */
type Contexto = { donos: Record<string, string>; meuId: string | null };

type Coluna = {
  key: string;
  label: string;
  padrao: boolean;
  cell: (c: Company, ctx: Contexto) => React.ReactNode;
  csv: Array<[string, (c: Company, ctx: Contexto) => string]>;
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
    cell: (c) => {
      if (c.melhor_telefone) {
        const whatsapp = possuiWhatsapp(c.melhor_telefone);
        return (
          <span className="inline-flex items-center gap-1.5">
            {whatsapp && <Smartphone className="h-3.5 w-3.5 shrink-0 text-green-600" />}
            {c.melhor_telefone}
            {whatsapp && (
              <Badge variant="outline" className="border-green-600 text-[10px] text-green-700">
                WhatsApp
              </Badge>
            )}
          </span>
        );
      }
      const primeiroEmail = c.emails[0];
      if (primeiroEmail) {
        const contabil = isEmailContabil(primeiroEmail);
        return (
          <span className="inline-flex items-center gap-1.5">
            {primeiroEmail}
            {contabil && (
              <Badge variant="outline" className="gap-1 border-amber-500 text-[10px] text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Contábil
              </Badge>
            )}
          </span>
        );
      }
      return "—";
    },
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
  {
    key: "dono",
    label: "Dono",
    padrao: true,
    cell: (c, ctx) => {
      if (!c.owner_id) return <span className="text-muted-foreground">Sem dono</span>;
      if (c.owner_id === ctx.meuId)
        return (
          <Badge variant="outline" className="border-chart-3 text-chart-3">
            <UserCheck className="mr-1 h-3 w-3" /> Você
          </Badge>
        );
      return <span>{ctx.donos[c.owner_id] ?? "Outro vendedor"}</span>;
    },
    csv: [["Dono", (c, ctx) => (c.owner_id ? (ctx.donos[c.owner_id] ?? "Outro vendedor") : "")]],
    className: "text-sm",
  },
];

/** Monta cabeçalhos e linhas conforme as colunas visíveis. */
function tabelaExport(rows: Company[], visiveis: string[], ctx: Contexto) {
  const cols: Array<[string, (c: Company, ctx: Contexto) => string]> = [
    ["CNPJ", (c) => formatCnpj(c.cnpj)],
    ["Razão social", (c) => c.razao_social],
    ["Cliente potencial", (c) => (c.prospectar ? "Sim" : "Não")],
    ...COLUNAS.filter((c) => visiveis.includes(c.key)).flatMap((c) => c.csv),
  ];
  return {
    cabecalhos: cols.map(([h]) => h),
    linhas: rows.map((r) => cols.map(([, f]) => f(r, ctx))),
  };
}


type Avancados = {
  cidade: string;
  bairro: string;
  cnae: string;
  porte: string;
  situacao: string;
  setor: string;
  capitalMin: string;
  capitalMax: string;
  aberturaDe: string;
  aberturaAte: string;
  simples: string;
  mei: string;
  comTelefone: boolean;
  comEmail: boolean;
  comSite: boolean;
  comDecisor: boolean;
};

const AVANCADOS_VAZIOS: Avancados = {
  cidade: "",
  bairro: "",
  cnae: "",
  porte: "todos",
  situacao: "todas",
  setor: "todos",
  capitalMin: "",
  capitalMax: "",
  aberturaDe: "",
  aberturaAte: "",
  simples: "todos",
  mei: "todos",
  comTelefone: false,
  comEmail: false,
  comSite: false,
  comDecisor: false,
};

function filtrosAvancadosAtivos(a: Avancados): boolean {
  return (Object.keys(AVANCADOS_VAZIOS) as Array<keyof Avancados>).some(
    (k) => a[k] !== AVANCADOS_VAZIOS[k],
  );
}

/** Converte o estado da tela no payload esperado pelo backend, omitindo o que não foi preenchido. */
function filtrosAvancados(a: Avancados) {
  const numero = (v: string) => {
    const n = Number(v.replace(",", "."));
    return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
  };
  const capitalMin = numero(a.capitalMin);
  const capitalMax = numero(a.capitalMax);
  return {
    ...(a.cidade.trim() ? { cidade: a.cidade.trim() } : {}),
    ...(a.bairro.trim() ? { bairro: a.bairro.trim() } : {}),
    ...(a.cnae.trim() ? { cnae: a.cnae.trim() } : {}),
    ...(a.porte !== "todos" ? { porte: a.porte } : {}),
    ...(a.situacao !== "todas" ? { situacao: a.situacao } : {}),
    ...(a.setor !== "todos" ? { setor: a.setor } : {}),
    ...(capitalMin != null ? { capitalMin } : {}),
    ...(capitalMax != null ? { capitalMax } : {}),
    ...(a.aberturaDe ? { aberturaDe: a.aberturaDe } : {}),
    ...(a.aberturaAte ? { aberturaAte: a.aberturaAte } : {}),
    ...(a.simples === "sim" || a.simples === "nao" ? { simples: a.simples } : {}),
    ...(a.mei === "sim" || a.mei === "nao" ? { mei: a.mei } : {}),
    ...(a.comTelefone ? { comTelefone: true } : {}),
    ...(a.comEmail ? { comEmail: true } : {}),
    ...(a.comSite ? { comSite: true } : {}),
    ...(a.comDecisor ? { comDecisor: true } : {}),
  };
}

function Empresas() {
  const inicial = Route.useSearch();
  const avancadosIniciais: Avancados = {
    ...AVANCADOS_VAZIOS,
    ...(inicial.cidade ? { cidade: inicial.cidade } : {}),
    ...(inicial.cnae ? { cnae: inicial.cnae } : {}),
    ...(inicial.porte ? { porte: inicial.porte } : {}),
    ...(inicial.setor ? { setor: inicial.setor } : {}),
    ...(inicial.situacao ? { situacao: inicial.situacao } : {}),
    ...(inicial.comTelefone ? { comTelefone: true } : {}),
    ...(inicial.comEmail ? { comEmail: true } : {}),
  };
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(inicial.status ?? "todos");
  const [uf, setUf] = useState(inicial.uf ?? "todos");
  const [lista, setLista] = useState(inicial.lista ?? "todas");
  const [grupo, setGrupo] = useState("todas");
  const [potencial, setPotencial] = useState(inicial.prospectar ? "sim" : "todas");
  const [carteira, setCarteira] = useState("todas");
  const [page, setPage] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [colunas, setColunas] = useState<string[]>(
    COLUNAS.filter((c) => c.padrao).map((c) => c.key),
  );
  const visiveis = COLUNAS.filter((c) => colunas.includes(c.key));

  const [avancadosAbertos, setAvancadosAbertos] = useState(
    filtrosAvancadosAtivos(avancadosIniciais),
  );
  const [av, setAv] = useState<Avancados>(avancadosIniciais);
  // Toda mudança de filtro volta para a primeira página.
  const setAvancado = <K extends keyof Avancados>(campo: K, valor: Avancados[K]) => {
    setAv((s) => ({ ...s, [campo]: valor }));
    setPage(1);
  };
  const avancadosAtivos = filtrosAvancadosAtivos(av);

  const { unidade } = useUnidadeAtiva();
  const filtros = {
    busca,
    status,
    uf,
    listId: lista,
    grupoNatureza: grupo,
    ...(potencial === "todas" ? {} : { prospectar: potencial === "sim" }),
    ...(carteira === "todas" ? {} : { dono: carteira as "meus" | "sem_dono" | "outros" }),
    ...filtrosAvancados(av),
    ...(unidade ? { unidade } : {}),
  };
  const listas = useListas();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const opcoes = useQuery({
    queryKey: ["opcoes-filtro", unidade],
    queryFn: () => opcoesFiltroFn({ data: unidade ? { unidade } : {} }),
    staleTime: 5 * 60 * 1000,
  });
  const empresas = useQuery({
    queryKey: ["empresas", filtros, page],
    queryFn: () => listarEmpresasFn({ data: { ...filtros, page, perPage: 25 } }),
    placeholderData: keepPreviousData,
  });
  const exportar = useServerFn(exportarEmpresasFn);
  const vincular = useServerFn(vincularEmpresasListaFn);
  const marcar = useServerFn(marcarProspectarFn);
  const qc = useQueryClient();
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const linhas = empresas.data?.empresas ?? [];
  const todosMarcados = linhas.length > 0 && linhas.every((e) => selecionados.includes(e.cnpj));

  const mutVincular = useMutation({
    mutationFn: (listId: string | null) =>
      vincular({ data: { cnpjs: selecionados, listId, unidade: unidade ?? undefined } }),
    onSuccess: (r) => {
      toast.success(`${r.total} empresa(s) atualizada(s).`);
      setSelecionados([]);
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["listas"] });
      qc.invalidateQueries({ queryKey: ["sem-lista"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const assumir = useServerFn(assumirLeadsFn);
  const liberar = useServerFn(liberarLeadsFn);

  const mutAssumir = useMutation({
    mutationFn: (cnpjs: string[]) => assumir({ data: { cnpjs, unidade: unidade ?? undefined } }),
    onSuccess: (r) => {
      if (r.assumidos === 0) toast.error("Nenhum lead assumido: todos já tinham dono.");
      else if (r.jaComDono > 0)
        toast.success(`${r.assumidos} lead(s) assumido(s). ${r.jaComDono} já tinha(m) dono.`);
      else toast.success(`${r.assumidos} lead(s) assumido(s).`);
      setSelecionados([]);
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mutLiberar = useMutation({
    mutationFn: (cnpjs: string[]) => liberar({ data: { cnpjs, unidade: unidade ?? undefined } }),
    onSuccess: (r) => {
      if (r.liberados === 0) toast.error("Nada liberado: estes leads não são seus.");
      else toast.success(`${r.liberados} lead(s) devolvido(s) para a base.`);
      setSelecionados([]);
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mutProspectar = useMutation({
    mutationFn: ({ cnpjs, valor }: { cnpjs: string[]; valor: boolean }) =>
      marcar({ data: { cnpjs, valor, unidade: unidade ?? undefined } }),
    onSuccess: (r, v) => {
      toast.success(
        v.valor
          ? `${r.total} empresa(s) marcada(s) como cliente potencial.`
          : `${r.total} empresa(s) removida(s) dos clientes potenciais.`,
      );
      void qc.invalidateQueries({ queryKey: ["empresas"] });
      void qc.invalidateQueries({ queryKey: ["clientes-potenciais"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const total = empresas.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / 25));
  const ctx: Contexto = { donos: empresas.data?.donos ?? {}, meuId: me?.userId ?? null };

  // Sem outros filtros: a busca externa não sabe honrar status/UF/lista/etc.,
  // então só oferece o atalho quando o único critério é o termo digitado.
  const semOutrosFiltros =
    status === "todos" &&
    uf === "todos" &&
    lista === "todas" &&
    grupo === "todas" &&
    potencial === "todas" &&
    carteira === "todas" &&
    !avancadosAtivos;
  // isFetching (não isLoading): com keepPreviousData, isLoading vira false após a
  // primeira busca e `total` passaria a refletir o resultado anterior (stale)
  // enquanto a busca atual do termo novo ainda está em andamento.
  const semResultadoLocal =
    !empresas.isFetching && total === 0 && busca.trim().length >= 3 && semOutrosFiltros;
  const cnpjDigitado = busca.replace(/\D/g, "");
  const ehCnpjCompleto = cnpjDigitado.length === 14;

  const nomeLista = listas.data?.find((l) => l.id === lista)?.name;

  /**
   * CNPJ completo que não está na base: busca nas fontes externas sem
   * perguntar. É uma única empresa, custo previsível — o mesmo caminho que
   * hoje só existe em /consulta, agora disponível direto na Base de Empresas
   * para o cliente não precisar ir à aba de atualização.
   */
  const consultarCnpj = useServerFn(consultarCnpjsFn);
  const [cnpjTentado, setCnpjTentado] = useState<string | null>(null);
  const buscarPorCnpj = useMutation({
    mutationFn: (cnpj: string) => consultarCnpj({ data: { cnpjs: [cnpj], unitId: unidade ?? undefined } }),
    onSuccess: (r) => {
      const item = r.itens[0];
      if (item?.encontrada) {
        toast.success(`${item.company?.razao_social ?? "Empresa"} encontrada e adicionada à base.`);
        void qc.invalidateQueries({ queryKey: ["empresas"] });
      } else {
        toast.error(item?.erro ?? "CNPJ não encontrado nas fontes externas.");
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const erroCnpj = buscarPorCnpj.isError
    ? (buscarPorCnpj.error as Error).message
    : !buscarPorCnpj.data?.itens[0]?.encontrada
      ? (buscarPorCnpj.data?.itens[0]?.erro ?? null)
      : null;

  useEffect(() => {
    if (semResultadoLocal && ehCnpjCompleto && cnpjTentado !== cnpjDigitado && !buscarPorCnpj.isPending) {
      setCnpjTentado(cnpjDigitado);
      buscarPorCnpj.mutate(cnpjDigitado);
    }
  }, [semResultadoLocal, ehCnpjCompleto, cnpjDigitado, cnpjTentado, buscarPorCnpj]);

  /**
   * Nome sem resultado local: aqui não dá para automatizar — a busca por
   * nome no CNPJá pode trazer dezenas de empresas e gasta crédito por
   * chamada, então exige um clique deliberado do cliente.
   */
  const buscarCnpja = useServerFn(buscarCnpjaFn);
  const [selecionadosExterno, setSelecionadosExterno] = useState<string[]>([]);
  const buscarPorNome = useMutation({
    mutationFn: () => buscarCnpja({ data: { nome: busca.trim(), limite: 20 } }),
    onSuccess: (r) => {
      setSelecionadosExterno([]);
      if (r.itens.length === 0) toast.info("Nada encontrado nas fontes externas para este termo.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const resultadoExterno = buscarPorNome.data?.itens ?? null;
  const salvarExterno = useMutation({
    mutationFn: (cnpjs: string[]) => consultarCnpj({ data: { cnpjs, unitId: unidade ?? undefined } }),
    onSuccess: (r) => {
      const salvas = r.itens.filter((i) => i.encontrada).length;
      toast.success(`${salvas} empresa(s) adicionada(s) à base.`);
      buscarPorNome.reset();
      setSelecionadosExterno([]);
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  useEffect(() => {
    buscarPorNome.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  /** Resumo dos filtros ativos, para o cabeçalho do PDF. */
  function resumoFiltros(): Array<{ rotulo: string; valor: string }> {
    const out: Array<{ rotulo: string; valor: string }> = [];
    if (busca.trim()) out.push({ rotulo: "Busca", valor: busca.trim() });
    if (status !== "todos")
      out.push({ rotulo: "Status", valor: STATUS_LABEL[status as Status] ?? status });
    if (uf !== "todos") out.push({ rotulo: "UF", valor: uf });
    if (lista !== "todas") out.push({ rotulo: "Lista", valor: nomeLista ?? lista });
    if (grupo !== "todas") out.push({ rotulo: "Natureza", valor: grupo });
    if (potencial !== "todas")
      out.push({ rotulo: "Cliente potencial", valor: potencial === "sim" ? "Sim" : "Não" });
    if (carteira !== "todas") out.push({ rotulo: "Carteira", valor: carteira });
    if (av.cidade.trim()) out.push({ rotulo: "Cidade", valor: av.cidade.trim() });
    if (av.bairro.trim()) out.push({ rotulo: "Bairro", valor: av.bairro.trim() });
    if (av.cnae.trim()) out.push({ rotulo: "CNAE", valor: av.cnae.trim() });
    if (av.porte !== "todos") out.push({ rotulo: "Porte", valor: av.porte });
    if (av.situacao !== "todas") out.push({ rotulo: "Situação", valor: av.situacao });
    if (av.setor !== "todos") out.push({ rotulo: "Setor", valor: av.setor });
    if (av.comTelefone) out.push({ rotulo: "Com telefone", valor: "Sim" });
    if (av.comEmail) out.push({ rotulo: "Com e-mail", valor: "Sim" });
    if (av.comSite) out.push({ rotulo: "Com site", valor: "Sim" });
    if (av.comDecisor) out.push({ rotulo: "Com decisor", valor: "Sim" });
    return out.length > 0 ? out : [{ rotulo: "", valor: "nenhum (base completa)" }];
  }

  /** Etiquetas do recorte ativo (vindo da calculadora ou do refino local). */
  const chipsFiltros = resumoFiltros().filter((r) => r.rotulo);

  function limparTudo() {
    setBusca("");
    setStatus("todos");
    setUf("todos");
    setLista("todas");
    setGrupo("todas");
    setPotencial("todas");
    setCarteira("todas");
    setAv({ ...AVANCADOS_VAZIOS });
    setPage(1);
  }

  async function exportarBase(formato: "excel" | "pdf") {
    setExportando(true);
    try {
      const rows = (await exportar({ data: filtros })) as Company[];
      if (rows.length === 0) {
        toast.error("Nenhuma empresa para exportar com estes filtros.");
        return;
      }
      const { cabecalhos, linhas } = tabelaExport(rows, colunas, ctx);
      if (formato === "excel") {
        const { baixarExcel } = await import("@/lib/exportar-base");
        await baixarExcel(cabecalhos, linhas);
      } else {
        const { baixarPdf } = await import("@/lib/exportar-base");
        const conta = (f: (c: Company) => boolean) => rows.filter(f).length;
        await baixarPdf({
          cabecalhos,
          linhas,
          filtros: resumoFiltros(),
          indicadores: [
            { rotulo: "Empresas", valor: String(rows.length) },
            { rotulo: "Clientes potenciais", valor: String(conta((c) => !!c.prospectar)) },
            { rotulo: "Com telefone", valor: String(conta((c) => (c.telefones ?? []).length > 0)) },
            { rotulo: "Com e-mail", valor: String(conta((c) => (c.emails ?? []).length > 0)) },
            { rotulo: "Com dono", valor: String(conta((c) => !!c.owner_id)) },
          ],
        });
      }
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
          <h1 className="text-3xl font-semibold">Base de Empresas - Geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} empresa(s) no recorte atual. Monte o recorte na{" "}
            <Link to="/" className="underline underline-offset-2 hover:text-accent">
              calculadora de mercado
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
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
        <Button
          variant="outline"
          disabled={exportando || total === 0}
          onClick={() => void exportarBase("excel")}
        >
          {exportando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Excel
        </Button>
        <Button disabled={exportando || total === 0} onClick={() => void exportarBase("pdf")}>
          {exportando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Gerar relatório PDF
        </Button>


        </div>

      </header>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[240px] flex-1"
              placeholder="Buscar por nome, CNPJ ou cidade"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(1);
              }}
            />
            <Button variant="outline" onClick={() => setPainelAberto((v) => !v)}>
              <ChevronDown className={cn("h-4 w-4 transition-transform", painelAberto && "rotate-180")} />
              Refinar aqui
            </Button>
            <Button asChild variant="secondary">
              <Link to="/">Ajustar recorte na calculadora</Link>
            </Button>
            {chipsFiltros.length > 0 && (
              <Button variant="ghost" onClick={limparTudo}>
                <FilterX className="h-4 w-4" /> Limpar recorte
              </Button>
            )}
          </div>

          {chipsFiltros.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chipsFiltros.map((c) => (
                <Badge key={`${c.rotulo}-${c.valor}`} variant="secondary">
                  {c.rotulo}: {c.valor}
                </Badge>
              ))}
            </div>
          )}

          <div className={cn("grid gap-3 md:grid-cols-4", !painelAberto && "hidden")}>
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
          <Select
            value={potencial}
            onValueChange={(v) => {
              setPotencial(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Clientes potenciais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              <SelectItem value="sim">Somente clientes potenciais</SelectItem>
              <SelectItem value="nao">Sem marcação de prospectar</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={carteira}
            onValueChange={(v) => {
              setCarteira(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Carteira" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda a base</SelectItem>
              <SelectItem value="meus">Meus leads</SelectItem>
              <SelectItem value="sem_dono">Sem dono</SelectItem>
              <SelectItem value="outros">De outros vendedores</SelectItem>
            </SelectContent>
          </Select>

          <div className="md:col-span-4">
            <Collapsible open={avancadosAbertos} onOpenChange={setAvancadosAbertos}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between">
                    Filtros avançados (situação, cidade, CNAE, porte, capital, contato…)
                    {avancadosAtivos && (
                      <Badge variant="secondary" className="ml-2">
                        ativos
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        avancadosAbertos && "rotate-180",
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                {avancadosAtivos && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAv({ ...AVANCADOS_VAZIOS });
                      setPage(1);
                    }}
                  >
                    <FilterX className="h-4 w-4" /> Limpar
                  </Button>
                )}
              </div>
              <CollapsibleContent>
                <div className="mt-2 grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Situação cadastral</Label>
                    <Select
                      value={av.situacao}
                      onValueChange={(v) => setAvancado("situacao", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Situação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as situações</SelectItem>
                        {(opcoes.data?.situacoes ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Cidade</Label>
                    <Input
                      value={av.cidade}
                      onChange={(e) => setAvancado("cidade", e.target.value)}
                      placeholder="Ex.: Salvador"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Bairro</Label>
                    <Input
                      value={av.bairro}
                      onChange={(e) => setAvancado("bairro", e.target.value)}
                      placeholder="Ex.: Pituba"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CNAE principal (código ou descrição)</Label>
                    <Input
                      value={av.cnae}
                      onChange={(e) => setAvancado("cnae", e.target.value)}
                      placeholder="Ex.: 4712 ou mercearia"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Porte</Label>
                    <Select value={av.porte} onValueChange={(v) => setAvancado("porte", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Porte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os portes</SelectItem>
                        {(opcoes.data?.portes ?? []).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Setor</Label>
                    <Select value={av.setor} onValueChange={(v) => setAvancado("setor", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os setores</SelectItem>
                        {(opcoes.data?.setores ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Capital social mínimo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={av.capitalMin}
                      onChange={(e) => setAvancado("capitalMin", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Capital social máximo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={av.capitalMax}
                      onChange={(e) => setAvancado("capitalMax", e.target.value)}
                      placeholder="Sem limite"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Aberta a partir de</Label>
                    <Input
                      type="date"
                      value={av.aberturaDe}
                      onChange={(e) => setAvancado("aberturaDe", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Aberta até</Label>
                    <Input
                      type="date"
                      value={av.aberturaAte}
                      onChange={(e) => setAvancado("aberturaAte", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Simples Nacional</Label>
                    <Select value={av.simples} onValueChange={(v) => setAvancado("simples", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Simples Nacional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Tanto faz</SelectItem>
                        <SelectItem value="sim">Somente optantes</SelectItem>
                        <SelectItem value="nao">Excluir optantes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>MEI</Label>
                    <Select value={av.mei} onValueChange={(v) => setAvancado("mei", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="MEI" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Tanto faz</SelectItem>
                        <SelectItem value="sim">Somente MEI</SelectItem>
                        <SelectItem value="nao">Excluir MEI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Somente empresas com</Label>
                    <div className="flex flex-wrap gap-4">
                      {(
                        [
                          ["comTelefone", "Telefone"],
                          ["comEmail", "E-mail"],
                          ["comSite", "Site"],
                          ["comDecisor", "Decisor"],
                        ] as Array<[keyof Avancados, string]>
                      ).map(([campo, rotulo]) => (
                        <label key={campo} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={av[campo] as boolean}
                            onCheckedChange={(v) => setAvancado(campo, Boolean(v) as never)}
                          />
                          {rotulo}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          </div>
        </CardContent>
      </Card>

      {semResultadoLocal && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-3 p-4">
            {ehCnpjCompleto ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {buscarPorCnpj.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Não está na base — buscando este CNPJ nas fontes externas…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 text-primary" />
                    {erroCnpj ?? "CNPJ não encontrado nas fontes externas."}
                    <button
                      type="button"
                      onClick={() => setCnpjTentado(null)}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      tentar novamente
                    </button>
                  </>
                )}
              </div>
            ) : resultadoExterno === null ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Search className="h-4 w-4 text-primary" />
                  Não encontramos "{busca.trim()}" na base local.
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={buscarPorNome.isPending}
                  onClick={() => buscarPorNome.mutate()}
                >
                  {buscarPorNome.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Buscar nas fontes externas
                </Button>
              </div>
            ) : resultadoExterno.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada encontrado nas fontes externas para "{busca.trim()}".
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {resultadoExterno.length} empresa(s) encontrada(s) fora da base. Selecione para
                    trazer para cá (consome créditos das fontes pagas).
                  </p>
                  <Button
                    size="sm"
                    disabled={selecionadosExterno.length === 0 || salvarExterno.isPending}
                    onClick={() => salvarExterno.mutate(selecionadosExterno)}
                  >
                    {salvarExterno.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Adicionar {selecionadosExterno.length || ""} à base
                  </Button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {resultadoExterno.map((item) => (
                    <label
                      key={item.cnpj}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={selecionadosExterno.includes(item.cnpj)}
                        onCheckedChange={(v) =>
                          setSelecionadosExterno((s) =>
                            v ? [...s, item.cnpj] : s.filter((c) => c !== item.cnpj),
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.razaoSocial || item.cnpj}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatCnpj(item.cnpj)} · {[item.cidade, item.uf].filter(Boolean).join("/")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <Button
              size="sm"
              variant="secondary"
              disabled={mutAssumir.isPending}
              onClick={() => mutAssumir.mutate(selecionados)}
            >
              <UserCheck className="h-4 w-4" /> Assumir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={mutLiberar.isPending}
              onClick={() => mutLiberar.mutate(selecionados)}
            >
              <UserMinus className="h-4 w-4" /> Liberar
            </Button>
            <Button
              size="sm"
              disabled={mutProspectar.isPending}
              onClick={() => mutProspectar.mutate({ cnpjs: selecionados, valor: true })}
            >
              <Star className="h-4 w-4" /> Marcar como prospectar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={mutProspectar.isPending}
              onClick={() => mutProspectar.mutate({ cnpjs: selecionados, valor: false })}
            >
              Desmarcar
            </Button>
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
                <TableRow key={`${e.cnpj}:${e.unit_id}`}>
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
                    <button
                      type="button"
                      onClick={() => mutProspectar.mutate({ cnpjs: [e.cnpj], valor: !e.prospectar })}
                      disabled={mutProspectar.isPending}
                      aria-label={
                        e.prospectar ? "Remover dos clientes potenciais" : "Marcar como cliente potencial"
                      }
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                        e.prospectar ? "text-chart-3" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", e.prospectar && "fill-current")} />
                      {e.prospectar ? "Cliente potencial" : "Prospectar"}
                    </button>
                  </TableCell>
                  {visiveis.map((col) => (
                    <TableCell key={col.key} className={col.className ?? ""}>
                      {col.cell(e, ctx)}
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
