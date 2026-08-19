import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { consultarChaveFn, consultarCnpjsFn, listarListasFn } from "@/lib/econodata.functions";
import { formatCnpj, type LookupItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/consulta")({
  head: () => ({
    meta: [
      { title: "Consulta de empresas | Econodata Hub" },
      {
        name: "description",
        content:
          "Consulte empresas por CNPJ (individual ou em lote), site ou e-mail direto na API Econodata e salve na sua base.",
      },
      { property: "og:title", content: "Consulta de empresas | Econodata Hub" },
      {
        property: "og:description",
        content: "Consulta de CNPJ, site e e-mail na base Econodata com salvamento automático.",
      },
    ],
  }),
  component: Consulta,
});

function Consulta() {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [chave, setChave] = useState("");
  const [modo, setModo] = useState<"site" | "email">("site");
  const [listId, setListId] = useState("nenhuma");
  const [itens, setItens] = useState<LookupItem[]>([]);

  const listas = useQuery({ queryKey: ["listas"], queryFn: () => listarListasFn() });
  const consultarCnpjs = useServerFn(consultarCnpjsFn);
  const consultarChave = useServerFn(consultarChaveFn);

  const alvoLista = listId === "nenhuma" ? null : listId;

  const mutCnpjs = useMutation({
    mutationFn: (cnpjs: string[]) => consultarCnpjs({ data: { cnpjs, listId: alvoLista } }),
    onSuccess: (res) => {
      setItens(res.itens);
      const ok = res.itens.filter((i) => i.encontrada).length;
      toast.success(`${ok} empresa(s) encontrada(s) e salva(s).`);
      void qc.invalidateQueries({ queryKey: ["painel"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutChave = useMutation({
    mutationFn: () =>
      consultarChave({
        data: modo === "site" ? { site: chave, listId: alvoLista } : { email: chave, listId: alvoLista },
      }),
    onSuccess: (item) => {
      setItens([item]);
      if (item.encontrada) toast.success("Empresa encontrada e salva.");
      else toast.error(item.erro ?? "Nada encontrado.");
      void qc.invalidateQueries({ queryKey: ["painel"] });
      void qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cnpjs = texto
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);

  const carregando = mutCnpjs.isPending || mutChave.isPending;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Consulta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque empresas na Econodata por CNPJ (até 100 por vez), site ou e-mail. Todo resultado é
          salvo automaticamente na sua base.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="cnpj">
              <TabsList>
                <TabsTrigger value="cnpj">Por CNPJ</TabsTrigger>
                <TabsTrigger value="chave">Por site ou e-mail</TabsTrigger>
              </TabsList>

              <TabsContent value="cnpj" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpjs">CNPJs</Label>
                  <Textarea
                    id="cnpjs"
                    rows={6}
                    className="font-mono text-sm"
                    placeholder={"38.024.964/0001-42\n03076832000180"}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe por linha, vírgula ou espaço. {cnpjs.length} identificado(s).
                  </p>
                </div>
                <Button
                  disabled={cnpjs.length === 0 || carregando}
                  onClick={() => mutCnpjs.mutate(cnpjs)}
                >
                  {mutCnpjs.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Consultar {cnpjs.length > 1 ? `${cnpjs.length} CNPJs` : "CNPJ"}
                </Button>
              </TabsContent>

              <TabsContent value="chave" className="space-y-4 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select value={modo} onValueChange={(v) => setModo(v as "site" | "email")}>
                    <SelectTrigger className="sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={chave}
                    onChange={(e) => setChave(e.target.value)}
                    placeholder={modo === "site" ? "empresa.com.br" : "contato@empresa.com.br"}
                  />
                </div>
                <Button disabled={!chave.trim() || carregando} onClick={() => mutChave.mutate()}>
                  {mutChave.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salvar na lista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={listId} onValueChange={setListId}>
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
            <p className="text-xs text-muted-foreground">
              Crie e organize listas em{" "}
              <Link to="/listas" className="text-accent underline underline-offset-4">
                Listas
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      {itens.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Resultados</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {itens.map((item) => (
              <Card key={item.cnpj + String(item.encontrada)}>
                <CardContent className="p-4">
                  {item.encontrada && item.company ? (
                    <Link
                      to="/empresas/$cnpj"
                      params={{ cnpj: item.company.cnpj.replace(/\D/g, "") }}
                      className="block"
                    >
                      <p className="font-medium">{item.company.razao_social}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatCnpj(item.company.cnpj)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.company.cnae_descricao ?? "—"} · {item.company.cidade ?? "—"}/
                        {item.company.uf ?? "—"}
                      </p>
                      <p className="mt-2 text-xs text-accent">Ver ficha completa →</p>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-mono text-sm">{item.cnpj}</p>
                        <p className="text-xs text-destructive">{item.erro}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
