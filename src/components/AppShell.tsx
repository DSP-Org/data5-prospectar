import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building,
  Building2,
  Calculator,
  Kanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Search,
  Settings2,
  Tags,
  Target,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { meFn } from "@/lib/auth.functions";

const grupos = [
  {
    id: "geral",
    label: "Geral",
    items: [
      { to: "/", label: "Painel", icon: LayoutDashboard },
      { to: "/consulta", label: "Consulta", icon: Search },
      { to: "/empresas", label: "Base de empresas", icon: Building2 },
      { to: "/listas", label: "Listas", icon: Tags },
      { to: "/calculadora", label: "Calculadora", icon: Calculator },
    ],
  },
  {
    id: "prospectar",
    label: "Prospectar",
    items: [
      { to: "/funil", label: "Funil", icon: Kanban },
      { to: "/atividades", label: "Atividades", icon: ListTodo },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    id: "admin",
    label: "Administração",
    items: [
      { to: "/unidades", label: "Unidades", icon: Building },
      { to: "/usuarios", label: "Usuários", icon: Users, masterOnly: true },
      { to: "/configuracoes", label: "Configurações", icon: Settings2, masterOnly: true },
    ],
  },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  async function sair() {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/" className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                    <Target className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-base font-semibold leading-none">Prospectar360</span>
                    <span className="text-xs text-sidebar-foreground/60">Inteligência de empresas</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {grupos.map((grupo) => {
            const items = grupo.items.filter(
              (item) => !("masterOnly" in item && item.masterOnly) || me?.master,
            );
            if (items.length === 0) return null;
            const aberto = abertos[grupo.id] !== false;
            return (
              <Collapsible
                key={grupo.id}
                open={aberto}
                onOpenChange={(v) => setAbertos((s) => ({ ...s, [grupo.id]: v }))}
              >
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      {grupo.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${aberto ? "" : "-rotate-90"}`}
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarMenu>
                      {items.map((item) => (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton asChild tooltip={item.label}>
                            <Link
                              to={item.to}
                              activeOptions={{ exact: item.to === "/" }}
                              className="flex items-center gap-2"
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="text-xs text-sidebar-foreground/50">
          Prospectar360 © {new Date().getFullYear()}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger className="-ml-2" />
          <span className="text-sm text-muted-foreground">Prospectar360</span>
          <div className="ml-auto flex items-center gap-3">
            {me ? (
              <>
                <span className="hidden text-xs text-muted-foreground sm:inline">{me.nome || me.email}</span>
                <Badge variant={me.master ? "default" : "secondary"} className="capitalize">
                  {me.master ? "master" : me.papel}
                </Badge>
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {me.unidades.length === 0
                    ? "sem unidade"
                    : me.unidades.length === 1
                      ? me.unidades[0]?.nome
                      : `${me.unidades.length} unidades`}
                </span>
              </>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => void sair()}>
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
