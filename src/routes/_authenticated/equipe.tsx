import { useUnidadeAtiva } from "@/lib/unidade-ativa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Mail, Package, Plus, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listarUnidadesFn, listarUsuariosFn, meFn, atualizarUsuarioFn } from "@/lib/auth.functions";
import { listarEquipeFn } from "@/lib/equipe.functions";
import {
  criarEquipeFn,
  definirMembrosFn,
  definirProdutosEquipeFn,
  excluirEquipeFn,
  listarEquipesFn,
} from "@/lib/equipes.functions";
import { listarProdutosFn } from "@/lib/produtos.functions";

const PAPEL_LABEL: Record<string, string> = {
  master: "Master",
  admin_unidade: "Admin. da unidade",
  gestor: "Gestor",
  usuario: "Usuário",
};

function iniciais(nome: string, email: string) {
  const base = (nome || email).trim();
  const partes = base.split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || base.slice(0, 2).toUpperCase();
}

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe | Prospectar360" },
      { name: "description", content: "Monte equipes por unidade, vincule pessoas e atribua produtos e serviços." },
      { property: "og:title", content: "Equipe | Prospectar360" },
      {
        property: "og:description",
        content: "Monte equipes por unidade, vincule pessoas e atribua produtos e serviços.",
      },
    ],
  }),
  component: EquipePage,
});

function EquipePage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const master = me?.master ?? false;
  const podeGerenciar = master || me?.papel === "admin_unidade";
  const { unidade } = useUnidadeAtiva();

  const { data: equipe = [], isLoading } = useQuery({
    queryKey: ["equipe", unidade],
    queryFn: () => listarEquipeFn({ data: unidade ? { unidade } : {} }),
  });
  const { data: equipes = [] } = useQuery({
    queryKey: ["equipes", unidade],
    queryFn: () => listarEquipesFn({ data: unidade ? { unidade } : {} }),
  });
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos", unidade],
    queryFn: () => listarProdutosFn({ data: unidade ? { unidade } : {} }),
  });

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const invalidarEquipes = () => void qc.invalidateQueries({ queryKey: ["equipes"] });

  const criar = useMutation({
    mutationFn: () => criarEquipeFn({ data: { nome, descricao, unidade: unidade ?? null } }),
    onSuccess: () => {
      toast.success("Equipe criada.");
      setNome("");
      setDescricao("");
      invalidarEquipes();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirEquipeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Equipe excluída.");
      invalidarEquipes();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarMembros = useMutation({
    mutationFn: (input: { id: string; usuarios: string[] }) => definirMembrosFn({ data: input }),
    onSuccess: invalidarEquipes,
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarProdutos = useMutation({
    mutationFn: (input: { id: string; produtos: string[] }) => definirProdutosEquipeFn({ data: input }),
    onSuccess: invalidarEquipes,
    onError: (e: Error) => toast.error(e.message),
  });

  const vincular = useMutation({
    mutationFn: (input: { id: string; unidades: string[] }) => atualizarUsuarioFn({ data: input }),
    onSuccess: () => {
      toast.success("Vínculos atualizados.");
      void qc.invalidateQueries({ queryKey: ["equipe"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPessoas = new Set(equipe.flatMap((u) => u.membros.map((m) => m.id))).size;
  const pessoasDaUnidade = (unitId: string | null) =>
    equipe.find((u) => u.id === unitId)?.membros ?? equipe.flatMap((u) => u.membros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Monte equipes dentro da unidade, vincule as pessoas já cadastradas e atribua produtos e serviços.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <UsersRound className="h-3 w-3" /> {totalPessoas} {totalPessoas === 1 ? "pessoa" : "pessoas"}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Building2 className="h-3 w-3" /> {equipe.filter((u) => u.id).length} unidades
          </Badge>
        </div>
      </div>

      {podeGerenciar ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unidade ? null : (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Selecione uma unidade no topo da tela para criar a equipe nela.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Nome da equipe" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Textarea
                placeholder="Descrição (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={1}
              />
            </div>
            <Button
              onClick={() => criar.mutate()}
              disabled={!nome.trim() || !unidade || criar.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Criar equipe
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {equipes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma equipe criada nesta unidade.</p>
        ) : (
          equipes.map((eq) => {
            const membrosIds = eq.membros.map((m) => m.id);
            const produtosIds = eq.produtos.map((p) => p.id);
            const candidatos = pessoasDaUnidade(eq.unit_id);
            const produtosDaUnidade = produtos.filter((p) => !eq.unit_id || p.unit_id === eq.unit_id);
            return (
              <Card key={eq.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{eq.nome}</span>
                    {podeGerenciar ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => excluir.mutate(eq.id)}
                        disabled={excluir.isPending}
                        aria-label={`Excluir equipe ${eq.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </CardTitle>
                  {eq.descricao ? <p className="text-xs text-muted-foreground">{eq.descricao}</p> : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <UsersRound className="h-3 w-3" /> Pessoas ({eq.membros.length})
                    </div>
                    {candidatos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum usuário vinculado a esta unidade ainda.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {candidatos.map((m) => {
                          const marcado = membrosIds.includes(m.id);
                          return (
                            <label key={m.id} className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs">
                              <Checkbox
                                checked={marcado}
                                disabled={!podeGerenciar || salvarMembros.isPending}
                                onCheckedChange={(c) =>
                                  salvarMembros.mutate({
                                    id: eq.id,
                                    usuarios: c ? [...membrosIds, m.id] : membrosIds.filter((i) => i !== m.id),
                                  })
                                }
                              />
                              {m.nome || m.email}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Package className="h-3 w-3" /> Produtos e serviços ({eq.produtos.length})
                    </div>
                    {produtosDaUnidade.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Cadastre ofertas em{" "}
                        <Link to="/produtos" className="underline">
                          Produtos e serviços
                        </Link>
                        .
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {produtosDaUnidade.map((p) => {
                          const marcado = produtosIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs">
                              <Checkbox
                                checked={marcado}
                                disabled={!podeGerenciar || salvarProdutos.isPending}
                                onCheckedChange={(c) =>
                                  salvarProdutos.mutate({
                                    id: eq.id,
                                    produtos: c ? [...produtosIds, p.id] : produtosIds.filter((i) => i !== p.id),
                                  })
                                }
                              />
                              {p.nome}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {isLoading ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">Carregando equipe...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {equipe.map((un) => (
            <Card key={un.id || "sem-unidade"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: `var(--${un.cor}-500, currentColor)` }}
                    />
                    {un.nome}
                  </span>
                  <Badge variant="outline">{un.membros.length}</Badge>
                </CardTitle>
                {un.cidade || un.uf ? (
                  <p className="text-xs text-muted-foreground">{[un.cidade, un.uf].filter(Boolean).join(" / ")}</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {un.membros.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma pessoa vinculada.</p>
                ) : (
                  un.membros.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{iniciais(m.nome, m.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.nome || m.email}</div>
                        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" /> {m.email}
                        </div>
                      </div>
                      <Badge variant={m.papel === "master" ? "default" : "secondary"} className="gap-1">
                        {m.papel === "master" ? <ShieldCheck className="h-3 w-3" /> : null}
                        {PAPEL_LABEL[m.papel] ?? m.papel}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
