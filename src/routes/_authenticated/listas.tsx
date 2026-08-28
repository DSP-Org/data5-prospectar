import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useListas } from "@/lib/use-listas";
import { useUnidadeAtiva } from "@/lib/unidade-ativa";

import {
  contarSemListaFn,
  criarListaFn,
  excluirListaFn,
} from "@/lib/econodata.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/listas")({
  head: () => ({
    meta: [
      { title: "Listas | Prospectar360" },
      {
        name: "description",
        content: "Organize as empresas consultadas em listas de prospecção, carteiras e campanhas.",
      },
      { property: "og:title", content: "Listas | Prospectar360" },
      {
        property: "og:description",
        content: "Crie listas para agrupar empresas por campanha ou carteira no Prospectar360.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/listas" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/listas" }],
  }),
  component: Listas,
});

function Listas() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const { unidade } = useUnidadeAtiva();
  const listas = useListas();
  const semLista = useQuery({ queryKey: ["sem-lista"], queryFn: () => contarSemListaFn() });
  const criar = useServerFn(criarListaFn);
  const excluir = useServerFn(excluirListaFn);

  const mutCriar = useMutation({
    mutationFn: () => criar({ data: { name: nome.trim(), unitId: unidade } }),
    onSuccess: () => {
      setNome("");
      toast.success("Lista criada.");
      void qc.invalidateQueries({ queryKey: ["listas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Lista removida.");
      void qc.invalidateQueries({ queryKey: ["listas"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Listas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrupe empresas por campanha, carteira ou território. Remover uma lista não apaga as
          empresas.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            placeholder="Nome da lista (ex.: Indústrias SP)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nome.trim()) mutCriar.mutate();
            }}
          />
          <Button disabled={!nome.trim() || mutCriar.isPending} onClick={() => mutCriar.mutate()}>
            <Plus className="h-4 w-4" /> Criar lista
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(listas.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma lista criada ainda.</p>
        )}
        {(listas.data ?? []).map((l) => (
          <Card key={l.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {l.total ?? 0} empresa(s) · criada em{" "}
                  {new Date(l.created_at).toLocaleDateString("pt-BR")}
                </p>
                <Link
                  to="/empresas"
                  search={{ lista: l.id }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Ver empresas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => mutExcluir.mutate(l.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="font-medium">Sem lista</p>
            <p className="text-xs text-muted-foreground">
              {semLista.data ?? 0} empresa(s) ainda não agrupadas
            </p>
            <Link
              to="/empresas"
              search={{ lista: "sem_lista" }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver empresas <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
