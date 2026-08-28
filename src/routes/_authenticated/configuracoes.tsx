import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, RefreshCw, Save, Settings2, ShieldAlert, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  obterStatusChaveApiFn,
  salvarChaveApiFn,
  testarChaveApiFn,
  migrarChaveDoAmbienteFn,
} from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FontesDados } from "@/components/FontesDados";


export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Prospectar360" },
      {
        name: "description",
        content: "Configure as fontes de dados e chaves de integração do Prospectar360.",
      },
      { property: "og:title", content: "Configurações | Prospectar360" },
      {
        property: "og:description",
        content: "Gerencie as fontes de dados usadas para enriquecer empresas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://data5-prospectar.lovable.app/configuracoes" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://data5-prospectar.lovable.app/configuracoes" }],
  }),

  component: Configuracoes,
});

function Configuracoes() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["settings", "api-key"],
    queryFn: () => obterStatusChaveApiFn(),
  });

  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);

  const salvar = useServerFn(salvarChaveApiFn);
  const testar = useServerFn(testarChaveApiFn);
  const migrar = useServerFn(migrarChaveDoAmbienteFn);

  const mutTestar = useMutation({
    mutationFn: async () => {
      if (!key.trim()) throw new Error("Cole a chave da API primeiro.");
      return testar({ data: { key: key.trim() } });
    },
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Chave válida — integração ${res.integracao ?? ""}`.trim());
      } else {
        toast.error(res.erro);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutSalvar = useMutation({
    mutationFn: async () => {
      if (!key.trim()) throw new Error("Cole a chave da API primeiro.");
      const teste = await testar({ data: { key: key.trim() } });
      if (!teste.ok) throw new Error(teste.erro);
      await salvar({ data: { key: key.trim() } });
      return teste;
    },
    onSuccess: (res) => {
      setKey("");
      void qc.invalidateQueries({ queryKey: ["settings", "api-key"] });
      toast.success(`Chave salva e conectada — ${res.integracao ?? ""}`.trim());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutMigrar = useMutation({
    mutationFn: () => migrar({}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings", "api-key"] });
      toast.success("Chave do ambiente salva no banco.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const configured = status.data?.configured ?? false;
  const source = status.data?.source ?? "none";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie as fontes de dados e as chaves de integração do Prospectar360.
        </p>
      </header>


      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle>Chave de enriquecimento B2B</CardTitle>
          </div>
          <CardDescription>
            Token da fonte de enriquecimento com contatos e decisores. As demais fontes (cadastrais e
            gratuitas) são configuradas abaixo, em Fontes de dados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={configured ? "default" : "destructive"}>
              {configured ? "Conectado" : "Não configurado"}
            </Badge>
            {configured && source === "database" && (
              <Badge variant="outline">salvo no banco</Badge>
            )}
            {configured && source === "env" && <Badge variant="outline">variável de ambiente</Badge>}
            {status.data?.masked && (
              <span className="text-xs text-muted-foreground">{status.data.masked}</span>
            )}
            {source === "env" && (
              <Button
                variant="outline"
                size="sm"
                disabled={mutMigrar.isPending}
                onClick={() => mutMigrar.mutate()}
              >
                <UploadCloud className="mr-1 h-4 w-4" />
                Salvar chave no banco
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Token de integração</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={show ? "text" : "password"}
                  placeholder="00000000-0000-4000-0000-000000000000"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Ocultar chave" : "Mostrar chave"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="secondary"
                disabled={mutTestar.isPending || mutSalvar.isPending || !key.trim()}
                onClick={() => mutTestar.mutate()}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Testar
              </Button>
              <Button
                disabled={mutTestar.isPending || mutSalvar.isPending || !key.trim()}
                onClick={() => mutSalvar.mutate()}
              >
                <Save className="mr-1 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Essa chave é sensível. Ela nunca é enviada ao navegador em texto plano e só pode ser
              usada pelas funções de servidor. Se você publicar o app publicamente, qualquer pessoa
              com acesso à URL poderá alterar essa chave, pois o app não exige login.
            </p>
          </div>
        </CardContent>
      </Card>

      <FontesDados />

    </div>
  );
}
