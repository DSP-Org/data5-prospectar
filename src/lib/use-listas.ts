import { useQuery } from "@tanstack/react-query";

import { listarListasFn } from "@/lib/econodata.functions";
import { useUnidadeAtiva } from "@/lib/unidade-ativa";

/** Listas visíveis na unidade selecionada no seletor global. */
export function useListas() {
  const { unidade } = useUnidadeAtiva();
  return useQuery({
    queryKey: ["listas", unidade],
    queryFn: () => listarListasFn({ data: unidade ? { unidade } : {} }),
  });
}
