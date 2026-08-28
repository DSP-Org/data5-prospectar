import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  atualizarUsuarioFn,
  criarUsuarioFn,
  excluirUsuarioFn,
  listarUnidadesFn,
  listarUsuariosFn,
  meFn,
} from "@/lib/auth.functions";
import { PAPEIS, PAPEL_LABEL, type Papel } from "@/lib/permissoes";

export function GestaoUsuarios() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const master = me?.master ?? false;
  const { data: unidades = [] } = useQuery({ queryKey: ["unidades"], queryFn: () => listarUnidadesFn() });
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listarUsuariosFn(),
    enabled: master,
  });

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("usuario");
  const [vinculos, setVinculos] = useState<string[]>([]);

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["usuarios"] });
    void qc.invalidateQueries({ queryKey: ["unidades"] });
    void qc.invalidateQueries({ queryKey: ["permissoes"] });
  };

  const criar = useMutation({
    mutationFn: () =>
      criarUsuarioFn({
        data: { email: email.trim(), senha, nome: nome.trim() || undefined, papel, unidades: vinculos },
      }),
    onSuccess: () => {
      toast.success("Usuário criado.");
      setEmail("");
      setNome("");
      setSenha("");
      setPapel("usuario");
      setVinculos([]);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: (input: { id: string; papel?: Papel; unidades?: string[] }) => atualizarUsuarioFn({ data: input }),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirUsuarioFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário removido.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!master) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        Apenas o usuário master pode gerenciar usuários.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Novo colaborador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim() || senha.length < 8) {
                toast.error("Informe e-mail e senha com pelo menos 8 caracteres.");
                return;
              }
              if (papel !== "master" && vinculos.length === 0) {
                toast.error("Selecione a unidade do colaborador. A unidade precisa existir antes do usuário.");
                return;
              }
              criar.mutate();
            }}
          >
            <div className="w-48 space-y-1">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="min-w-56 flex-1 space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="w-44 space-y-1">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="w-56 space-y-1">
              <Label>Papel</Label>
              <Select value={papel} onValueChange={(v) => setPapel(v as Papel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={criar.isPending}>
              <UserPlus className="mr-1 h-4 w-4" /> Criar
            </Button>
          </form>

          <div className="space-y-2">
            <Label>Unidade de negócio do colaborador (obrigatório)</Label>
            <div className="flex flex-wrap gap-3">
              {unidades.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={vinculos.includes(u.id)}
                    onCheckedChange={(c) =>
                      setVinculos((prev) => (c ? [...prev, u.id] : prev.filter((id) => id !== u.id)))
                    }
                  />
                  {u.nome}
                </label>
              ))}
              {unidades.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Cadastre uma unidade em Administração → Unidades antes de criar colaboradores.
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Colaboradores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="w-56">Papel</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.nome || u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.id === me?.userId ? (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="h-3 w-3" /> {PAPEL_LABEL[u.papel] ?? u.papel}
                        </Badge>
                      ) : (
                        <Select
                          value={u.papel}
                          onValueChange={(v) => atualizar.mutate({ id: u.id, papel: v as Papel })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAPEIS.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {unidades.map((un) => {
                          const marcada = u.unidades.includes(un.id);
                          return (
                            <label key={un.id} className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs">
                              <Checkbox
                                checked={marcada}
                                onCheckedChange={(c) =>
                                  atualizar.mutate({
                                    id: u.id,
                                    unidades: c
                                      ? [...u.unidades, un.id]
                                      : u.unidades.filter((id) => id !== un.id),
                                  })
                                }
                              />
                              {un.nome}
                            </label>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id === me?.userId ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remover ${u.email}?`)) excluir.mutate(u.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
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
