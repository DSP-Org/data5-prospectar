import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDown, ArrowUp, Database, RefreshCw, Save, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  listarFontesFn,
  resumoConsumoFn,
  salvarEconomiaFn,
  salvarFonteFn,
  salvarModulosCnpjaFn,
  salvarPrioridadeFn,
  testarFonteFn,
} from "@/lib/sources.functions";
import {
  MODULOS_CNPJA_META,
  type ModoConsulta,
  type ModulosCnpja,
  type SourceId,
} from "@/lib/sources/catalog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function FontesDados() {
  const qc = useQueryClient();
  const fontes = useQuery({ queryKey: ["fontes"], queryFn: () => listarFontesFn() });
  const salvarFonte = useServerFn(salvarFonteFn);
  const testarFonte = useServerFn(testarFonteFn);
  const salvarPrioridade = useServerFn(salvarPrioridadeFn);
  const salvarEconomia = useServerFn(salvarEconomiaFn);
  const salvarModulosCnpja = useServerFn(salvarModulosCnpjaFn);

  const [chaves, setChaves] = useState<Record<string, string>>({});
  const [ttl, setTtl] = useState<number | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["fontes"] });

  const mutSalvar = useMutation({
    mutationFn: (v: { id: SourceId; key?: string | null; enabled?: boolean }) =>
      salvarFonte({ data: v }),
    onSuccess: (_r, v) => {
      setChaves((c) => ({ ...c, [v.id]: "" }));
      invalidate();
      toast.success("Fonte atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutTestar = useMutation({
    mutationFn: (v: { id: SourceId; key?: string | null }) => testarFonte({ data: v }),
    onSuccess: (res) => (res.ok ? toast.success(res.mensagem) : toast.error(res.mensagem)),
    onError: (e: Error) => toast.error(e.message),
  });

  const mutOrdem = useMutation({
    mutationFn: (ordem: SourceId[]) => salvarPrioridade({ data: { ordem } }),
    onSuccess: () => {
      invalidate();
      toast.success("Prioridade atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutEconomia = useMutation({
    mutationFn: (v: { modo?: ModoConsulta; ttlDias?: number }) => salvarEconomia({ data: v }),
    onSuccess: () => {
      invalidate();
      toast.success("Preferências de consulta salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutModulos = useMutation({
    mutationFn: (v: Partial<ModulosCnpja>) => salvarModulosCnpja({ data: v }),
    onSuccess: () => {
      invalidate();
      toast.success("Módulos da CNPJá atualizados.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const economia = fontes.data?.economia;
  const modulos = fontes.data?.modulosCnpja;
  const lista = fontes.data?.fontes ?? [];


  const mover = (idx: number, delta: number) => {
    const ordem = lista.map((f) => f.id as SourceId);
    const alvo = idx + delta;
    if (alvo < 0 || alvo >= ordem.length) return;
    const copia = [...ordem];
    const atual = copia[idx]!;
    copia[idx] = copia[alvo]!;
    copia[alvo] = atual;
    mutOrdem.mutate(copia);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Fontes de dados</CardTitle>
        </div>
        <CardDescription>
          As fontes ativas são consultadas em paralelo e os dados são mesclados. Quando há conflito,
          vence a fonte de maior prioridade (mais acima na lista).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fontes.isLoading && <p className="text-sm text-muted-foreground">Carregando fontes…</p>}

        {economia && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-md">
                <p className="text-sm font-medium">Modo econômico</p>
                <p className="text-xs text-muted-foreground">
                  Consulta primeiro as fontes gratuitas e só aciona as pagas para os CNPJs que
                  ficarem sem telefone, e-mail ou decisor. Desligado, todas as fontes ativas são
                  consultadas sempre.
                </p>
              </div>
              <Switch
                checked={economia.modo === "economico"}
                aria-label="Ativar modo econômico"
                onCheckedChange={(v) =>
                  mutEconomia.mutate({ modo: v ? "economico" : "completo" })
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="ttl-cache">
                  Validade do cache (dias) — 0 desliga
                </label>
                <Input
                  id="ttl-cache"
                  type="number"
                  min={0}
                  max={365}
                  className="mt-1 w-32"
                  value={ttl ?? economia.ttlDias}
                  onChange={(e) => setTtl(Number(e.target.value))}
                />
              </div>
              <Button
                size="sm"
                disabled={mutEconomia.isPending || ttl === null || ttl === economia.ttlDias}
                onClick={() => mutEconomia.mutate({ ttlDias: ttl ?? economia.ttlDias })}
              >
                <Save className="mr-1 h-4 w-4" />
                Salvar cache
              </Button>
              <p className="text-xs text-muted-foreground">
                Empresas sincronizadas dentro do prazo não são reconsultadas; a reconsulta manual na
                ficha sempre ignora o cache.
              </p>
            </div>
          </div>
        )}

        {modulos && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Módulos adicionais da CNPJá</p>
            <p className="text-xs text-muted-foreground">
              Cada módulo ligado traz mais dados na consulta, porém consome créditos extras do plano
              da CNPJá. Deixe desligado o que não for usar.
            </p>
            <div className="mt-3 space-y-3">
              {MODULOS_CNPJA_META.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-4">
                  <div className="max-w-md">
                    <p className="text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.descricao}</p>
                  </div>
                  <Switch
                    checked={modulos[m.id]}
                    aria-label={`Ativar módulo ${m.label}`}
                    onCheckedChange={(v) => mutModulos.mutate({ [m.id]: v })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}



        {lista.map((f, idx) => (
          <div key={f.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-semibold">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.label}</span>
                    {f.contatos && <Badge variant="outline">contatos</Badge>}
                    {!f.requiresKey && <Badge variant="outline">sem chave</Badge>}
                    <Badge variant={f.custo === "gratis" ? "secondary" : "default"}>
                      {f.custo === "gratis" ? "gratuita" : "paga"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.descricao}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Subir prioridade"
                  disabled={idx === 0 || mutOrdem.isPending}
                  onClick={() => mover(idx, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Descer prioridade"
                  disabled={idx === lista.length - 1 || mutOrdem.isPending}
                  onClick={() => mover(idx, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Switch
                  checked={f.enabled}
                  aria-label={`Ativar ${f.label}`}
                  onCheckedChange={(v) => mutSalvar.mutate({ id: f.id as SourceId, enabled: v })}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                type="password"
                placeholder={f.hasKey ? (f.maskedKey ?? "chave salva") : "Chave da API (opcional)"}
                value={chaves[f.id] ?? ""}
                onChange={(e) => setChaves((c) => ({ ...c, [f.id]: e.target.value }))}
                className="max-w-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={mutTestar.isPending}
                onClick={() =>
                  mutTestar.mutate({ id: f.id as SourceId, key: chaves[f.id]?.trim() || null })
                }
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Testar
              </Button>
              <Button
                size="sm"
                disabled={mutSalvar.isPending || !(chaves[f.id] ?? "").trim()}
                onClick={() =>
                  mutSalvar.mutate({ id: f.id as SourceId, key: (chaves[f.id] ?? "").trim() })
                }
              >
                <Save className="mr-1 h-4 w-4" />
                Salvar chave
              </Button>
              {f.hasKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mutSalvar.mutate({ id: f.id as SourceId, key: null })}
                >
                  Remover chave
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
