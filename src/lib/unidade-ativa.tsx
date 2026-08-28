import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const CHAVE = "prospectar360:unidade-ativa";

type Ctx = {
  /** Unidade selecionada no seletor global; null = todas as unidades permitidas. */
  unidade: string | null;
  setUnidade: (id: string | null) => void;
};

const UnidadeContext = createContext<Ctx>({ unidade: null, setUnidade: () => {} });

export function UnidadeAtivaProvider({ children }: { children: ReactNode }) {
  const [unidade, setUnidadeState] = useState<string | null>(null);

  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE);
    if (salvo) setUnidadeState(salvo);
  }, []);

  const setUnidade = useCallback((id: string | null) => {
    setUnidadeState(id);
    if (id) window.localStorage.setItem(CHAVE, id);
    else window.localStorage.removeItem(CHAVE);
  }, []);

  const value = useMemo(() => ({ unidade, setUnidade }), [unidade, setUnidade]);
  return <UnidadeContext.Provider value={value}>{children}</UnidadeContext.Provider>;
}

export function useUnidadeAtiva() {
  return useContext(UnidadeContext);
}
