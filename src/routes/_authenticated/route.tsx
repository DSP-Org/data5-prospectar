import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm">
      <p className="font-medium">Não foi possível carregar esta página.</p>
      <p className="mt-1 text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      <a className="mt-4 inline-block underline" href="/auth">
        Entrar novamente
      </a>
    </div>
  ),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
