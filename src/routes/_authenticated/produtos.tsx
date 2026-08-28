import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { listarUnidadesFn, meFn } from "@/lib/auth.functions";
import { useUnidadeAtiva } from "@/lib/unidade-ativa";
import {
  atualizarProdutoFn,
  criarProdutoFn,
  excluirProdutoFn,
  listarProdutosFn,
} from "@/lib/produtos.functions";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e serviços | Prospectar360" },
      {
        name: "description",
        content: "Cadastre os produtos e serviços de cada unidade de negócio que a equipe vai prospectar.",
      },
      { property: "og:title", content: "Produtos e serviços | Prospectar360" },
      {
        property: "og:description",
        content: "Cadastre os produtos e serviços de cada unidade de negócio que a equipe vai prospectar.",
      },
    ],
  }),
  component: ProdutosPage,
});

function moeda(v: number | null) {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProdutosPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const podeGerenciar = (me?.master ?? false) || me?.papel === "admin_unidade";
  const { data: unidades = [] } = useQuery({ queryKey: ["unidades"], queryFn: () => listarUnidadesFn() });
  const { unidade } = useUnidadeAtiva();
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", unidade],
    queryFn: () => listarProdutosFn({ data: unidade ? { unidade } : {} }),
  });

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"produto" | "servico">("servico");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const unidadeFormulario = unitId || unidade || "";

  const invalidar = () => void qc.invalidateQueries({ queryKey: ["produtos"] });

  const criar = useMutation({
    mutationFn: () =>
      criarProdutoFn({
        data: {
          nome: nome.trim(),
          tipo,
          descricao: descricao.trim() || undefined,
          valor_referencia: valor ? Number(valor.replace(",", ".")) : null,
          unit_id: unidadeFormulario || null,
        },
      }),
    onSuccess: () => {
      toast.success("Cadastro criado.");
      setNome("");
      setDescricao("");
      setValor("");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: (input: { id: string; ativo?: boolean }) => atualizarProdutoFn({ data: input }),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirProdutoFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nomeUnidade = (id: string | null) => unidades.find((u) => u.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Produtos e serviços</h1>
        <p className="text-sm text-muted-foreground">
          Cada unidade de negócio tem sua carteira de ofertas. A equipe prospecta empresas para esses produtos e
          serviços.
        </p>
      </div>

      {podeGerenciar ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova oferta</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nome.trim()) {
                  toast.error("Informe o nome do produto ou serviço.");
                  return;
                }
                if (!unidadeFormulario && unidades.length > 1) {
                  toast.error("Selecione a unidade de negócio.");
                  return;
                }
                criar.mutate();
              }}
            >
              <div className="min-w-56 flex-1 space-y-1">
                <Label htmlFor="produto-nome">Nome</Label>
                <Input id="produto-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="w-40 space-y-1">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as "produto" | "servico")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48 space-y-1">
                <Label>Unidade de negócio</Label>
                <Select value={unidadeFormulario} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40 space-y-1">
                <Label htmlFor="produto-valor">Ticket de referência</Label>
                <Input
                  id="produto-valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="min-w-56 flex-1 space-y-1">
                <Label htmlFor="produto-desc">Descrição</Label>
                <Textarea
                  id="produto-desc"
                  rows={1}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={criar.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Cadastrar
              </Button>
            </form>
            {unidades.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Cadastre uma unidade em Administração → Unidades antes de criar ofertas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" /> Carteira de ofertas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Oferta</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-48">Unidade</TableHead>
                <TableHead className="w-40">Ticket</TableHead>
                <TableHead className="w-28">Ativa</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum produto ou serviço cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.nome}</div>
                      {p.descricao ? (
                        <div className="text-xs text-muted-foreground">{p.descricao}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.tipo === "produto" ? "Produto" : "Serviço"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{nomeUnidade(p.unit_id)}</TableCell>
                    <TableCell className="text-sm">{moeda(p.valor_referencia)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={p.ativo}
                        disabled={!podeGerenciar}
                        onCheckedChange={(c) => atualizar.mutate({ id: p.id, ativo: c })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {podeGerenciar ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remover ${p.nome}?`)) excluir.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
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
