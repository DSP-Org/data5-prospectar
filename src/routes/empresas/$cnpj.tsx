import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  atualizarEmpresaFn,
  consultarCnpjsFn,
  excluirEmpresaFn,
  listarListasFn,
  obterEmpresaFn,
} from "@/lib/econodata.functions";
import { STATUS_LABEL, formatCnpj, type Contato, type Status } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
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

export const Route = createFileRoute("/empresas/$cnpj")({
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
  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });

  const atualizar = useServerFn(atualizarEmpresaFn);
  const excluir = useServerFn(excluirEmpresaFn);
  const reconsultar = useServerFn(consultarCnpjsFn);

  const [notas, setNotas] = useState("");
  const e = empresa.data;

  useEffect(() => {
    if (e) setNotas(e.notas);
  }, [e]);

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

  const mutSync = useMutation({
    mutationFn: () => reconsultar({ data: { cnpjs: [cnpj] } }),
    onSuccess: () => {
      toast.success("Dados atualizados na Econodata.");
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

  const pessoas = [...(e.contatos ?? []), ...(e.decisores ?? [])];

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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mutSync.mutate()} disabled={mutSync.isPending}>
            {mutSync.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reconsultar
          </Button>
          {e.link_detalhe && (
            <Button variant="outline" asChild>
              <a href={e.link_detalhe} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Econodata
              </a>
            </Button>
          )}
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
                  {e.telefones.map((t) => (
                    <a key={t} href={`tel:${t}`} className="block text-sm hover:text-accent">
                      {t}
                    </a>
                  ))}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mails</p>
                  {e.emails.length === 0 && <p className="text-sm">—</p>}
                  {e.emails.map((m) => (
                    <a key={m} href={`mailto:${m}`} className="block break-all text-sm hover:text-accent">
                      {m}
                    </a>
                  ))}
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
                    <div key={`${p.nome ?? "pessoa"}-${i}`} className="rounded-sm border border-border p-3">
                      <p className="text-sm font-medium">{txt(p.nome) || "Sem nome"}</p>
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
        </div>
      </div>
    </div>
  );
}
