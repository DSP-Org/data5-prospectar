import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { toast } from "sonner";

import { GestaoUsuarios } from "@/components/GestaoUsuarios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listarUsuariosFn, meFn } from "@/lib/auth.functions";
import { PAGINAS, PAPEIS_MATRIZ, PAPEL_LABEL } from "@/lib/permissoes";
import {
  definirPermissaoPapelFn,
  definirPermissaoUsuarioFn,
  listarPermissoesFn,
} from "@/lib/permissoes.functions";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões e rotas | Prospectar360" },
      {
        name: "description",
        content: "Defina quais páginas cada papel acessa, ajuste exceções por usuário e gerencie os colaboradores.",
      },
      { property: "og:title", content: "Permissões e rotas | Prospectar360" },
      {
        property: "og:description",
        content: "Defina quais páginas cada papel acessa, ajuste exceções por usuário e gerencie os colaboradores.",
      },
    ],
  }),
  component: PermissoesPage,
});

function PermissoesPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const master = me?.master ?? false;

  const { data } = useQuery({
    queryKey: ["permissoes"],
    queryFn: () => listarPermissoesFn(),
    enabled: master,
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listarUsuariosFn(),
    enabled: master,
  });

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["permissoes"] });
    void qc.invalidateQueries({ queryKey: ["me"] });
  };

  const salvarPapel = useMutation({
    mutationFn: (input: { role: string; rota: string; permitido: boolean }) =>
      definirPermissaoPapelFn({ data: input as never }),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarUsuario = useMutation({
    mutationFn: (input: { userId: string; rota: string; efeito: "permitir" | "negar" | null }) =>
      definirPermissaoUsuarioFn({ data: input }),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  if (!master) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        Apenas o usuário master pode gerenciar permissões e rotas.
      </div>
    );
  }

  const matriz = data?.matriz ?? [];
  const excecoes = data?.usuarios ?? [];
  const temPapel = (role: string, rota: string) => matriz.some((m) => m.role === role && m.rota === rota);
  const excecaoDe = (userId: string, rota: string) =>
    excecoes.find((e) => e.user_id === userId && e.rota === rota)?.efeito ?? "padrao";

  const grupos = Array.from(new Set(PAGINAS.map((p) => p.grupo)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Permissões e rotas</h1>
        <p className="text-sm text-muted-foreground">
          Controle quais páginas cada papel alcança, crie exceções individuais e gerencie os colaboradores.
        </p>
      </div>

      <Tabs defaultValue="matriz">
        <TabsList>
          <TabsTrigger value="matriz">Matriz por papel</TabsTrigger>
          <TabsTrigger value="usuario">Exceções por usuário</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="matriz" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Páginas liberadas por papel</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    {PAPEIS_MATRIZ.map((p) => (
                      <TableHead key={p.id} className="w-44 text-center">
                        {p.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.map((grupo) => (
                    <Fragment key={grupo}>
                      <TableRow className="bg-muted/40">
                        <TableCell colSpan={PAPEIS_MATRIZ.length + 1} className="py-2 text-xs font-medium uppercase">
                          {grupo}
                        </TableCell>
                      </TableRow>
                      {PAGINAS.filter((p) => p.grupo === grupo).map((pagina) => (
                        <TableRow key={pagina.rota}>
                          <TableCell>
                            <div className="font-medium">{pagina.label}</div>
                            <div className="text-xs text-muted-foreground">{pagina.rota}</div>
                          </TableCell>
                          {PAPEIS_MATRIZ.map((papel) => (
                            <TableCell key={papel.id} className="text-center">
                              {pagina.masterOnly ? (
                                <Badge variant="outline" className="text-xs">
                                  master
                                </Badge>
                              ) : (
                                <Checkbox
                                  checked={temPapel(papel.id, pagina.rota)}
                                  onCheckedChange={(c) =>
                                    salvarPapel.mutate({
                                      role: papel.id,
                                      rota: pagina.rota,
                                      permitido: Boolean(c),
                                    })
                                  }
                                />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuario" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ajustes individuais</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    {PAGINAS.filter((p) => !p.masterOnly).map((p) => (
                      <TableHead key={p.rota} className="w-36 text-xs">
                        {p.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios
                    .filter((u) => u.papel !== "master")
                    .map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.nome || u.email}</div>
                          <div className="text-xs text-muted-foreground">{PAPEL_LABEL[u.papel] ?? u.papel}</div>
                        </TableCell>
                        {PAGINAS.filter((p) => !p.masterOnly).map((p) => (
                          <TableCell key={p.rota}>
                            <Select
                              value={excecaoDe(u.id, p.rota)}
                              onValueChange={(v) =>
                                salvarUsuario.mutate({
                                  userId: u.id,
                                  rota: p.rota,
                                  efeito: v === "padrao" ? null : (v as "permitir" | "negar"),
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="padrao">Padrão do papel</SelectItem>
                                <SelectItem value="permitir">Liberar</SelectItem>
                                <SelectItem value="negar">Bloquear</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={PAGINAS.length} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum colaborador cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <GestaoUsuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
}
