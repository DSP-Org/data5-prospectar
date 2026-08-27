import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  Calculator,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Search,
  Settings2,
  Tags,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";

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

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/consulta", label: "Consulta", icon: Search },
  { to: "/empresas", label: "Base de empresas", icon: Building2 },
  { to: "/listas", label: "Listas", icon: Tags },
  { to: "/funil", label: "Funil", icon: Kanban },
  { to: "/atividades", label: "Atividades", icon: ListTodo },
  { to: "/calculadora", label: "Calculadora", icon: Calculator },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
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
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarMenu>
              {nav.map((item) => (
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
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="text-xs text-sidebar-foreground/50">Prospectar360 © {new Date().getFullYear()}</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger className="-ml-2" />
          <span className="text-sm text-muted-foreground">Prospectar360</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
