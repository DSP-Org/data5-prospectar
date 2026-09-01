import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";

/**
 * Anexa o bearer token em toda chamada de server function.
 * O cliente já renova a sessão automaticamente e serializa essa operação.
 * Chamar refreshSession() aqui cria uma segunda renovação concorrente e pode
 * invalidar o refresh token que acabou de ser usado.
 */
export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prospectar360:auth-required"));
    }
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  return next({ headers: { Authorization: `Bearer ${token}` } });
});
