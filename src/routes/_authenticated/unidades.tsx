import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { criarUnidadeFn, excluirUnidadeFn, listarUnidadesFn, meFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/unidades")({
  head: () => ({
    meta: [
      { title: "Unidades | Prospectar360" },
      { name: "description", content: "Cadastre unidades e organize a base de empresas por operação." },
      { property: "og:title", content: "Unidades | Prospectar360" },
      { property: "og:description", content: "Cadastre unidades e organize a base de empresas por operação." },
    ],
  }),
  component: UnidadesPage,
});

function UnidadesPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data: unidades = [], isLoading } = useQuery({ queryKey: ["unidades"], queryFn: () => listarUnidadesFn() });

  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const criar = useMutation({
    mutationFn: () => criarUnidadeFn({ data: { nome: nome.trim(), cidade: cidade.trim() || undefined, uf: uf.trim().toUpperCase() || undefined } }),
    onSuccess: () => {
      toast.success("Unidade criada.");
      setNome("");
      setCidade("");
      setUf("");
      void qc.invalidateQueries({ queryKey: ["unidades"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirUnidadeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Unidade excluída.");
      void qc.invalidateQueries({ queryKey: ["unidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Unidades</h1>
        <p className="text-sm text-muted-foreground">
          Cada empresa, lista e atividade pertence a uma unidade. Usuários só enxergam as unidades em que estão vinculados.
        </p>
      </div>

      {me?.master ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nome.trim()) return;
                criar.mutate();
              }}
            >
              <div className="min-w-52 flex-1 space-y-1">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Filial São Paulo" />
              </div>
              <div className="w-44 space-y-1">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="w-20 space-y-1">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
              </div>
              <Button type="submit" disabled={criar.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Criar
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Unidades cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Local</TableHead>
                <TableHead className="text-right">Empresas</TableHead>
                <TableHead className="text-right">Usuários</TableHead>
                {me?.master ? <TableHead className="w-16" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : unidades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma unidade disponível.
                  </TableCell>
                </TableRow>
              ) : (
                unidades.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {u.nome}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[u.cidade, u.uf].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{u.total_empresas ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.total_usuarios ?? 0}</TableCell>
                    {me?.master ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Excluir a unidade "${u.nome}"?`)) excluir.mutate(u.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
