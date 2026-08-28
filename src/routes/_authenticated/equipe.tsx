import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { listarUnidadesFn, listarUsuariosFn, meFn, atualizarUsuarioFn } from "@/lib/auth.functions";
import { listarEquipeFn } from "@/lib/equipe.functions";

const PAPEL_LABEL: Record<string, string> = {
  master: "Master",
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
      { name: "description", content: "Pessoas que trabalham com os dados de cada unidade de negócio." },
      { property: "og:title", content: "Equipe | Prospectar360" },
      { property: "og:description", content: "Pessoas que trabalham com os dados de cada unidade de negócio." },
    ],
  }),
  component: EquipePage,
});

function EquipePage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const master = me?.master ?? false;
  const { data: equipe = [], isLoading } = useQuery({ queryKey: ["equipe"], queryFn: () => listarEquipeFn() });
  const { data: unidades = [] } = useQuery({ queryKey: ["unidades"], queryFn: () => listarUnidadesFn(), enabled: master });
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => listarUsuariosFn(), enabled: master });

  const vincular = useMutation({
    mutationFn: (input: { id: string; unidades: string[] }) => atualizarUsuarioFn({ data: input }),
    onSuccess: () => {
      toast.success("Vínculos atualizados.");
      void qc.invalidateQueries({ queryKey: ["equipe"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPessoas = new Set(equipe.flatMap((u) => u.membros.map((m) => m.id))).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Pessoas que trabalham com os dados de cada unidade de negócio / produto.
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

      {isLoading ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">Carregando equipe...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {equipe.map((unidade) => (
            <Card key={unidade.id || "sem-unidade"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: `var(--${unidade.cor}-500, currentColor)` }}
                    />
                    {unidade.nome}
                  </span>
                  <Badge variant="outline">{unidade.membros.length}</Badge>
                </CardTitle>
                {unidade.cidade || unidade.uf ? (
                  <p className="text-xs text-muted-foreground">
                    {[unidade.cidade, unidade.uf].filter(Boolean).join(" / ")}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {unidade.membros.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma pessoa vinculada.</p>
                ) : (
                  unidade.membros.map((m) => (
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
                      <Badge variant={m.papel === "master" ? "default" : "secondary"} className="gap-1 capitalize">
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

      {master ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vincular pessoas às unidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Marque as unidades de negócio / produto em que cada pessoa trabalha. Para cadastrar novos usuários, use a
              página <Link to="/usuarios" className="underline">Usuários</Link>.
            </p>
            <div className="space-y-3">
              {usuarios.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                  <div className="min-w-48 flex-1">
                    <div className="text-sm font-medium">{u.nome || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unidades.map((un) => {
                      const marcada = u.unidades.includes(un.id);
                      return (
                        <label key={un.id} className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs">
                          <Checkbox
                            checked={marcada}
                            disabled={vincular.isPending}
                            onCheckedChange={(c) =>
                              vincular.mutate({
                                id: u.id,
                                unidades: c ? [...u.unidades, un.id] : u.unidades.filter((id) => id !== un.id),
                              })
                            }
                          />
                          {un.nome}
                        </label>
                      );
                    })}
                    {unidades.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Cadastre uma unidade primeiro.</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
