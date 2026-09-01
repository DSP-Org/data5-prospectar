import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { previaLoteFn } from "@/lib/previa.functions";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type ModoEscopo = "novos" | "novos_vencidos" | "tudo";

export type PlanoLote = {
  /** CNPJs que serão enviados para a consulta. */
  cnpjs: string[];
  /** Ignora a validade do cache. */
  forcar: boolean;
  /** Quantos podem chegar às fontes externas (custo potencial). */
  externos: number;
};

/**
 * Mostra, antes de qualquer consulta, o que já está na base local.
 * A leitura é só no banco: não chama fonte externa nem consome crédito.
 */
export function PreviaLote({
  cnpjs,
  onPlano,
  somenteResumo = false,
}: {
  cnpjs: string[];
  onPlano: (plano: PlanoLote | null) => void;
  /** Só os números, sem a escolha de escopo (usado na fila de importação). */
  somenteResumo?: boolean;
}) {
  const previaLote = useServerFn(previaLoteFn);
  const [modo, setModo] = useState<ModoEscopo>("novos_vencidos");
  const chave = cnpjs.join(",");

  const previa = useQuery({
    queryKey: ["previa-lote", chave],
    queryFn: () => previaLote({ data: { cnpjs } }),
    enabled: cnpjs.length > 0,
    staleTime: 30_000,
  });

  const dados = previa.data;

  useEffect(() => {
    if (!dados) {
      onPlano(null);
      return;
    }
    const todos = [...dados.vigentes, ...dados.vencidos, ...dados.novos];
    if (modo === "tudo") {
      onPlano({ cnpjs: todos, forcar: true, externos: todos.length });
      return;
    }
    if (modo === "novos") {
      onPlano({ cnpjs: dados.novos, forcar: false, externos: dados.novos.length });
      return;
    }
    onPlano({
      cnpjs: [...dados.novos, ...dados.vencidos, ...dados.vigentes],
      forcar: false,
      externos: dados.novos.length + dados.vencidos.length,
    });
  }, [dados, modo, onPlano]);

  if (cnpjs.length === 0) return null;

  if (previa.isPending)
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Conferindo o que já está na base…
      </p>
    );

  if (!dados) return null;

  const externos =
    modo === "tudo"
      ? dados.validos
      : modo === "novos"
        ? dados.novos.length
        : dados.novos.length + dados.vencidos.length;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{dados.validos} CNPJ(s) válido(s)</Badge>
        <Badge variant="secondary">
          <Database className="mr-1 h-3 w-3" />
          {dados.vigentes.length} na base (sem custo)
        </Badge>
        <Badge variant="outline">
          <RefreshCw className="mr-1 h-3 w-3" />
          {dados.vencidos.length} vencido(s)
        </Badge>
        <Badge variant={dados.novos.length > 0 ? "destructive" : "outline"}>
          <Sparkles className="mr-1 h-3 w-3" />
          {dados.novos.length} novo(s)
        </Badge>
        {dados.duplicados > 0 ? (
          <Badge variant="outline">{dados.duplicados} repetido(s) ignorado(s)</Badge>
        ) : null}
        {dados.invalidos.length > 0 ? (
          <Badge variant="outline">{dados.invalidos.length} inválido(s)</Badge>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {dados.ttlDias > 0
          ? `Validade do cache: ${dados.ttlDias} dias. Empresas dentro do prazo saem do banco, sem chamar as fontes.`
          : "O cache está desligado nas configurações: toda consulta vai às fontes."}
      </p>

      {somenteResumo ? null : (
      <div className="space-y-2">
        <Label className="text-xs">O que consultar</Label>
        <RadioGroup value={modo} onValueChange={(v) => setModo(v as ModoEscopo)} className="gap-2">
          <label className="flex items-start gap-2 text-xs">
            <RadioGroupItem value="novos" className="mt-0.5" />
            <span>
              Só os novos ({dados.novos.length}) — pula tudo que já está na base
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <RadioGroupItem value="novos_vencidos" className="mt-0.5" />
            <span>
              Novos + vencidos ({dados.novos.length + dados.vencidos.length}) — padrão do sistema
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <RadioGroupItem value="tudo" className="mt-0.5" />
            <span className="text-destructive">
              Forçar tudo ({dados.validos}) — ignora a validade, é o mais caro
            </span>
          </label>
        </RadioGroup>
      </div>
      )}

      <p className="text-xs text-muted-foreground">
        {somenteResumo ? (
          <>
            Na fila, até <strong>{dados.novos.length + dados.vencidos.length}</strong> empresa(s)
            podem chegar às fontes externas; o restante sai do banco sem custo.
          </>
        ) : (
          <>
            Até <strong>{externos}</strong> empresa(s) podem chegar às fontes externas nesta ação; o
            restante sai do banco sem custo.
          </>
        )}
      </p>

      {dados.invalidos.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Ignorados por não terem 14 dígitos: {dados.invalidos.slice(0, 5).join(", ")}
          {dados.invalidos.length > 5 ? "…" : ""}
        </p>
      ) : null}
    </div>
  );
}
