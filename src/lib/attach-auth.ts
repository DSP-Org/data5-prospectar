import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";

/**
 * Anexa o bearer token em toda chamada de server function.
 * Substitui o `attachSupabaseAuth` gerado porque tenta renovar a sessão
 * quando o token expirou (o gerado apenas lê getSession e envia vazio,
 * gerando "Unauthorized: No authorization header provided").
 */
export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;

  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;

    if (!token) {
      const { data: renovada } = await supabase.auth.refreshSession();
      token = renovada.session?.access_token;
    }
  } catch {
    token = undefined;
  }

  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
