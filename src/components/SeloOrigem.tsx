import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, RefreshCw } from "lucide-react";

import { validadeCacheFn } from "@/lib/previa.functions";
import { Badge } from "@/components/ui/badge";

export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.floor((Date.now() - at) / 86400000));
}

/**
 * Indica se o dado veio da base local (sem custo) ou de uma consulta às
 * fontes, e há quantos dias a empresa foi sincronizada.
 */
export function SeloOrigem({
  origem,
  syncedAt,
}: {
  origem?: "base" | "fontes" | undefined;
  syncedAt?: string | null | undefined;
}) {
  const validadeCache = useServerFn(validadeCacheFn);
  const cfg = useQuery({
    queryKey: ["validade-cache"],
    queryFn: () => validadeCache(),
    staleTime: 5 * 60_000,
  });

  const dias = diasDesde(syncedAt);
  const ttl = cfg.data?.ttlDias ?? 30;
  const vencido = ttl > 0 && dias !== null && dias >= ttl;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {origem === "fontes" ? (
        <Badge variant="outline">
          <RefreshCw className="mr-1 h-3 w-3" />
          consultado agora
        </Badge>
      ) : origem === "base" ? (
        <Badge variant="secondary">
          <Database className="mr-1 h-3 w-3" />
          da base local (sem custo)
        </Badge>
      ) : null}
      {dias !== null ? (
        <Badge variant={vencido ? "destructive" : "outline"}>
          {dias === 0 ? "atualizada hoje" : `atualizada há ${dias} dia(s)`}
          {ttl > 0 ? (vencido ? " · fora da validade" : " · dentro da validade") : ""}
        </Badge>
      ) : null}
    </span>
  );
}
