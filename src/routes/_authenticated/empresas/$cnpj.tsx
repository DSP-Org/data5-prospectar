import { useListas } from "@/lib/use-listas";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  atualizarEmpresaFn,
  consultarCnpjsFn,
  excluirEmpresaFn,
  obterEmpresaFn,
} from "@/lib/econodata.functions";
import {
  criarAtividadeFn,
  listarAtividadesFn,
  atualizarAtividadeFn,
} from "@/lib/prospection.functions";
import {
  STATUS_LABEL,
  ACTIVITY_LABEL,
  ACTIVITY_TYPES,
  formatCnpj,
  classificarTelefone,
  possuiWhatsapp,
  isEmailContabil,
  ordenarComAdministradorNoTopo,
  TIPO_TELEFONE_LABEL,
  type ActivityType,
  type Contato,
  type Status,
} from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { FichaImpressao } from "@/components/FichaImpressao";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABEL } from "@/lib/sources/catalog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/_authenticated/empresas/$cnpj")({
  head: () => ({
    meta: [
      { title: "Ficha da empresa | Prospectar360" },
      {
        name: "description",
        content:
          "Ficha completa da empresa: cadastro, CNAE, porte, telefones, sites, sócios e anotações comerciais.",
      },
      { property: "og:title", content: "Ficha da empresa | Prospectar360" },
      {
        property: "og:description",
        content: "Dados cadastrais, contatos e gestão comercial da empresa no Prospectar360.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Detalhe,
});

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{valor && valor.trim() !== "" ? valor : "—"}</p>
    </div>
  );
}

function txt(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function emailsDe(c: Contato): string[] {
  const raw = c.emails ?? c.email;
  if (Array.isArray(raw)) return raw.filter((e): e is string => typeof e === "string" && e !== "");
  return typeof raw === "string" && raw ? [raw] : [];
}

function Detalhe() {
  const { cnpj } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const empresa = useQuery({
    queryKey: ["empresa", cnpj],
    queryFn: () => obterEmpresaFn({ data: { cnpj } }),
  });
  const listas = useListas();

  const atualizar = useServerFn(atualizarEmpresaFn);
  const excluir = useServerFn(excluirEmpresaFn);
  const reconsultar = useServerFn(consultarCnpjsFn);

  const [notas, setNotas] = useState("");
  const [tipoAtividade, setTipoAtividade] = useState<ActivityType>("ligacao");
  const [obsAtividade, setObsAtividade] = useState("");
  const [respAtividade, setRespAtividade] = useState("");
  const [agendadaAtividade, setAgendadaAtividade] = useState("");
  const e = empresa.data;

  useEffect(() => {
    if (e) setNotas(e.notas);
  }, [e]);

  const atividades = useQuery({
    queryKey: ["atividades", cnpj],
    queryFn: () => listarAtividadesFn({ data: { cnpj, limit: 50 } }),
    enabled: Boolean(e),
  });

  const mutSalvar = useMutation({
    mutationFn: (patch: { status?: Status; notas?: string; listId?: string | null }) =>
      atualizar({ data: { cnpj, ...patch } }),
    onSuccess: () => {
      toast.success("Empresa atualizada.");
      void qc.invalidateQueries({ queryKey: ["empresa", cnpj] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
      void qc.invalidateQueries({ queryKey: ["painel"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const criarAtividade = useServerFn(criarAtividadeFn);
  const mutAtividade = useMutation({
    mutationFn: () =>
      criarAtividade({
        data: {
          company_cnpj: cnpj,
          tipo: tipoAtividade,
          observacao: obsAtividade,
          responsavel: respAtividade || null,
          scheduled_at: agendadaAtividade ? new Date(agendadaAtividade).toISOString() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Atividade registrada.");
      setObsAtividade("");
      setRespAtividade("");
      setAgendadaAtividade("");
      void qc.invalidateQueries({ queryKey: ["atividades", cnpj] });
      void qc.invalidateQueries({ queryKey: ["funil"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const atualizarAtividade = useServerFn(atualizarAtividadeFn);
  const mutConcluir = useMutation({
    mutationFn: (id: string) =>
      atualizarAtividade({
        data: { id, completed_at: new Date().toISOString() },
      }),
    onSuccess: () => {
      toast.success("Atividade concluída.");
      void qc.invalidateQueries({ queryKey: ["atividades", cnpj] });
    },
    onError: (err: Error) => toast.error(err.message),
  });


  const mutSync = useMutation({
    mutationFn: (completo: boolean) =>
      reconsultar({ data: { cnpjs: [cnpj], forcar: true, completo } }),
    onSuccess: () => {
      toast.success("Dados atualizados nas fontes ativas.");
      void qc.invalidateQueries({ queryKey: ["empresa", cnpj] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutExcluir = useMutation({
    mutationFn: () => excluir({ data: { cnpj } }),
    onSuccess: () => {
      toast.success("Empresa removida da base.");
      void qc.invalidateQueries({ queryKey: ["empresas"] });
      void navigate({ to: "/empresas" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (empresa.isLoading) {
    return <p className="text-muted-foreground">Carregando ficha…</p>;
  }

  if (!e) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Empresa não encontrada na sua base.</p>
        <Button asChild variant="outline">
          <Link to="/empresas">Voltar para a base</Link>
        </Button>
      </div>
    );
  }

  const endereco = [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.complemento,
    e.bairro,
    [e.cidade, e.uf].filter(Boolean).join("/"),
    e.cep,
  ]
    .filter((p) => p && String(p).trim() !== "")
    .join(" · ");

  const pessoas = ordenarComAdministradorNoTopo([...(e.contatos ?? []), ...(e.decisores ?? [])]);

  const raw = ((e as unknown as { raw?: Record<string, unknown> }).raw ?? {}) as Record<string, unknown>;
  const ex = ((raw["cnpja"] as Record<string, unknown> | undefined)?.["extras"] ?? {}) as Record<
    string,
    unknown
  >;
  const trib = ex["tributario"] as
    | {
        simples_optante?: boolean | null;
        simples_desde?: string | null;
        mei_optante?: boolean | null;
        mei_desde?: string | null;
      }
    | undefined;
  const inscricoes = (ex["inscricoes_estaduais"] ?? []) as Array<{
    uf?: string | null;
    numero?: string | null;
    situacao?: string | null;
    tipo?: string | null;
  }>;
  const suframa = (ex["suframa"] ?? []) as Array<{
    numero?: string | null;
    situacao?: string | null;
    aprovado?: boolean | null;
  }>;
  const secundarias = (ex["atividades_secundarias"] ?? []) as Array<{
    codigo?: string | null;
    descricao?: string | null;
  }>;
  const geo = ex["geo"] as { lat?: number; lng?: number } | undefined;
  const comprovantes = (ex["comprovantes"] ?? []) as Array<{ tipo?: string | null; url?: string | null }>;
  const temExtras =
    Boolean(trib) ||
    inscricoes.length > 0 ||
    suframa.length > 0 ||
    secundarias.length > 0 ||
    Boolean(geo) ||
    comprovantes.length > 0 ||
    Boolean(ex["situacao_motivo"] ?? ex["situacao_data"]);

  return (
    <div className="space-y-6">
      <Link
        to="/empresas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Base de empresas
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-border bg-card p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{e.razao_social}</h1>
            <StatusBadge status={e.status as Status} />
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{formatCnpj(e.cnpj)}</p>
          {e.nome_fantasia && <p className="text-sm text-muted-foreground">{e.nome_fantasia}</p>}
          {(e.fontes?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground">Fontes:</span>
              {e.fontes.map((f) => (
                <Badge key={f} variant={f === e.fonte_principal ? "default" : "outline"}>
                  {SOURCE_LABEL[f] ?? f}
                </Badge>
              ))}
            </div>
          )}

        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => mutSync.mutate(false)}
            disabled={mutSync.isPending}
          >
            {mutSync.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reconsultar
          </Button>
          <Button
            onClick={() => mutSync.mutate(true)}
            disabled={mutSync.isPending}
            title="Consulta todas as fontes em tempo real com os módulos extras (consome mais créditos)"
          >
            <Sparkles className="h-4 w-4" /> Buscar tudo
          </Button>
          {e.link_detalhe && (
            <Button variant="outline" asChild>
              <a href={e.link_detalhe} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Econodata
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir ficha
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => mutExcluir.mutate()}
            disabled={mutExcluir.isPending}
          >
            <Trash2 className="h-4 w-4" /> Remover
          </Button>
        </div>
      </header>

      <FichaImpressao
        empresa={e}
        endereco={endereco}
        pessoas={pessoas}
        statusLabel={STATUS_LABEL[e.status as Status] ?? String(e.status ?? "")}
        secundarias={secundarias}
        regime={[
          trib?.simples_optante ? "Simples Nacional" : null,
          trib?.mei_optante ? "MEI" : null,
        ].filter(Boolean) as string[]}
        fontes={(e.fontes ?? []).map((f) => SOURCE_LABEL[f] ?? f)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Campo label="Situação" valor={e.situacao} />
              <Campo label="Tipo de unidade" valor={e.tipo_unidade} />
              <Campo label="Natureza jurídica" valor={e.natureza_juridica} />
              <Campo
                label="Abertura"
                valor={e.data_abertura ? new Date(e.data_abertura).toLocaleDateString("pt-BR") : null}
              />
              <Campo label="CNAE principal" valor={[e.cnae_codigo, e.cnae_descricao].filter(Boolean).join(" — ")} />
              <Campo label="Setores" valor={e.setores.join(", ")} />
              <div className="sm:col-span-2">
                <Campo label="Endereço" valor={endereco} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Porte e finanças</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Campo label="Porte estimado" valor={e.porte_estimado} />
              <Campo label="Enquadramento" valor={e.enquadramento_porte.join(", ")} />
              <Campo label="Faturamento presumido" valor={e.faturamento_presumido} />
              <Campo label="Funcionários estimados" valor={e.qtd_funcionarios_estimada} />
              <Campo
                label="Capital social"
                valor={
                  e.capital_social != null
                    ? e.capital_social.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : null
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Telefones</p>
                  {e.telefones.length === 0 && <p className="text-sm">—</p>}
                  {e.telefones.map((t) => {
                    const whatsapp = possuiWhatsapp(t);
                    return (
                      <a
                        key={t}
                        href={`tel:${t}`}
                        className="flex items-center gap-2 py-0.5 text-sm hover:text-accent"
                      >
                        {whatsapp ? (
                          <Smartphone className="h-3.5 w-3.5 shrink-0 text-green-600" />
                        ) : (
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span>{t}</span>
                        <Badge
                          variant="outline"
                          className={whatsapp ? "border-green-600 text-green-700" : "text-muted-foreground"}
                        >
                          {whatsapp ? "WhatsApp" : TIPO_TELEFONE_LABEL[classificarTelefone(t)]}
                        </Badge>
                      </a>
                    );
                  })}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mails</p>
                  {e.emails.length === 0 && <p className="text-sm">—</p>}
                  {e.emails.map((m) => {
                    const contabil = isEmailContabil(m);
                    return (
                      <div key={m} className="flex flex-wrap items-center gap-2 py-0.5">
                        <a href={`mailto:${m}`} className="break-all text-sm hover:text-accent">
                          {m}
                        </a>
                        {contabil && (
                          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            E-mail Contábil
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Sites</p>
                  {e.sites.length === 0 && <p className="text-sm">—</p>}
                  {e.sites.map((s) => (
                    <a
                      key={s}
                      href={s.startsWith("http") ? s : `https://${s}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-sm hover:text-accent"
                    >
                      {s}
                    </a>
                  ))}
                </div>
              </div>

              {pessoas.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Sócios e decisores
                  </p>
                  {pessoas.map((p, i) => (
                    <div
                      key={`${p.nome ?? "pessoa"}-${i}`}
                      className={
                        p.is_administrador
                          ? "rounded-sm border border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/20"
                          : "rounded-sm border border-border p-3"
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{txt(p.nome) || "Sem nome"}</p>
                        {p.is_administrador && (
                          <Badge className="gap-1 border-transparent bg-amber-500 text-white hover:bg-amber-500">
                            <Crown className="h-3 w-3" />
                            Administrador
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {txt(p.qualificacao) || txt(p.cargo) || txt(p.key) || "—"}
                      </p>
                      {emailsDe(p).map((m) => (
                        <a
                          key={m}
                          href={`mailto:${m}`}
                          className="block break-all text-xs text-accent"
                        >
                          {m}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {temExtras && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados complementares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {Boolean(ex["situacao_data"] ?? ex["situacao_motivo"]) && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Situação cadastral
                    </p>
                    <p>
                      {String(ex["situacao"] ?? e.situacao ?? "—")}
                      {ex["situacao_data"] ? ` desde ${String(ex["situacao_data"]).slice(0, 10)}` : ""}
                    </p>
                    {ex["situacao_motivo"] ? (
                      <p className="text-xs text-muted-foreground">{String(ex["situacao_motivo"])}</p>
                    ) : null}
                  </div>
                )}

                {trib && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Regime tributário
                    </p>
                    <p>
                      Simples Nacional: {trib.simples_optante ? "optante" : "não optante"}
                      {trib.simples_desde ? ` (desde ${String(trib.simples_desde).slice(0, 10)})` : ""}
                    </p>
                    <p>
                      MEI: {trib.mei_optante ? "optante" : "não optante"}
                      {trib.mei_desde ? ` (desde ${String(trib.mei_desde).slice(0, 10)})` : ""}
                    </p>
                  </div>
                )}

                {inscricoes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Inscrições estaduais
                    </p>
                    {inscricoes.map((i, idx) => (
                      <p key={`${i.uf ?? "uf"}-${idx}`} className="text-sm">
                        {i.uf} · {i.numero} · {i.situacao ?? "—"}
                        {i.tipo ? ` · ${i.tipo}` : ""}
                      </p>
                    ))}
                  </div>
                )}

                {suframa.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">SUFRAMA</p>
                    {suframa.map((s2, idx) => (
                      <p key={`${s2.numero ?? "s"}-${idx}`} className="text-sm">
                        {s2.numero} · {s2.situacao ?? "—"} · {s2.aprovado ? "aprovada" : "não aprovada"}
                      </p>
                    ))}
                  </div>
                )}

                {secundarias.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Atividades secundárias
                    </p>
                    {secundarias.slice(0, 15).map((a, idx) => (
                      <p key={`${a.codigo ?? "c"}-${idx}`} className="text-xs text-muted-foreground">
                        {a.codigo} · {a.descricao}
                      </p>
                    ))}
                  </div>
                )}

                {geo?.lat != null && geo?.lng != null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Geolocalização
                    </p>
                    <a
                      className="text-sm text-accent"
                      href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {geo.lat}, {geo.lng}
                    </a>
                  </div>
                )}

                {comprovantes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Comprovantes
                    </p>
                    {comprovantes.map((c, idx) =>
                      c.url ? (
                        <a
                          key={`${c.tipo ?? "l"}-${idx}`}
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-accent"
                        >
                          {c.tipo ?? "Comprovante"}
                        </a>
                      ) : null,
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={e.status}
                  onValueChange={(v) => mutSalvar.mutate({ status: v as Status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lista</Label>
                <Select
                  value={e.list_id ?? "nenhuma"}
                  onValueChange={(v) => mutSalvar.mutate({ listId: v === "nenhuma" ? null : v })}
                >
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Anotações</Label>
                <Textarea
                  id="notas"
                  rows={6}
                  value={notas}
                  onChange={(ev) => setNotas(ev.target.value)}
                  placeholder="Histórico de contato, próximos passos…"
                />
                <Button
                  size="sm"
                  onClick={() => mutSalvar.mutate({ notas })}
                  disabled={mutSalvar.isPending}
                >
                  <Save className="h-4 w-4" /> Salvar anotações
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Sincronizado em {new Date(e.synced_at).toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Nova atividade</Label>
                <Select value={tipoAtividade} onValueChange={(v) => setTipoAtividade(v as ActivityType)}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACTIVITY_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs">Observação</Label>
                <Textarea
                  id="obs"
                  rows={3}
                  value={obsAtividade}
                  onChange={(ev) => setObsAtividade(ev.target.value)}
                  placeholder="Resumo da ligação, e-mail enviado, próxima ação…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resp">Responsável</Label>
                <input
                  id="resp"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={respAtividade}
                  onChange={(ev) => setRespAtividade(ev.target.value)}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agendada">Agendada para</Label>
                <input
                  id="agendada"
                  type="datetime-local"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={agendadaAtividade}
                  onChange={(ev) => setAgendadaAtividade(ev.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={() => mutAtividade.mutate()}
                disabled={mutAtividade.isPending || !obsAtividade.trim()}
              >
                <Plus className="h-4 w-4" /> Registrar atividade
              </Button>

              {atividades.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando atividades…</p>
              ) : atividades.data && atividades.data.length > 0 ? (
                <div className="space-y-2">
                  {atividades.data.slice(0, 6).map((a) => (
                    <div key={a.id} className="rounded-sm border border-border p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{ACTIVITY_LABEL[a.tipo]}</span>
                        {!a.completed_at && (
                          <button
                            onClick={() => mutConcluir.mutate(a.id)}
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                            title="Marcar como concluída"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </p>
                      {a.observacao && <p className="text-xs">{a.observacao}</p>}
                      {a.scheduled_at && (
                        <p className="text-xs text-amber-600">
                          Agendada: {new Date(a.scheduled_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                      {a.completed_at && (
                        <p className="text-xs text-green-600">Concluída</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
