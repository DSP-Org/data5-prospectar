/** Catálogo de páginas do sistema usado no controle de acesso (client-safe). */

export type Papel = "master" | "admin_unidade" | "gestor" | "usuario";

export const PAPEIS: Array<{ id: Papel; label: string; descricao: string }> = [
  { id: "master", label: "Master", descricao: "Acesso total ao sistema" },
  { id: "admin_unidade", label: "Administrador de Unidade", descricao: "Gerencia produtos, equipe e dados da unidade" },
  { id: "gestor", label: "Gestor de Equipe", descricao: "Opera a prospecção e acompanha relatórios" },
  { id: "usuario", label: "Usuário Prospector", descricao: "Opera consulta, base, funil e atividades" },
];

export const PAPEL_LABEL: Record<string, string> = Object.fromEntries(
  PAPEIS.map((p) => [p.id, p.label]),
);

/** Papéis que podem ser atribuídos na matriz (o master sempre acessa tudo). */
export const PAPEIS_MATRIZ = PAPEIS.filter((p) => p.id !== "master");

export type Pagina = { rota: string; label: string; grupo: string; masterOnly?: boolean };

export const PAGINAS: Pagina[] = [
  { rota: "/", label: "Painel", grupo: "Geral" },
  { rota: "/consulta", label: "Atualização Novas", grupo: "Geral" },
  { rota: "/empresas", label: "Base de Empresas - Geral", grupo: "Geral" },
  { rota: "/listas", label: "Listas", grupo: "Geral" },
  { rota: "/calculadora", label: "Calculadora", grupo: "Geral" },
  { rota: "/clientes-potenciais", label: "Clientes potenciais", grupo: "Prospectar" },
  { rota: "/funil", label: "Funil", grupo: "Prospectar" },
  { rota: "/atividades", label: "Atividades", grupo: "Prospectar" },
  { rota: "/produtos", label: "Produtos e serviços", grupo: "Prospectar" },
  { rota: "/equipe", label: "Equipe", grupo: "Prospectar" },
  { rota: "/relatorios", label: "Relatórios", grupo: "Prospectar" },
  { rota: "/unidades", label: "Unidades", grupo: "Administração" },
  { rota: "/permissoes", label: "Permissões e rotas", grupo: "Administração", masterOnly: true },
  { rota: "/configuracoes", label: "Configurações", grupo: "Administração", masterOnly: true },
];

export const ROTAS = PAGINAS.map((p) => p.rota);

export function labelDaRota(rota: string) {
  return PAGINAS.find((p) => p.rota === rota)?.label ?? rota;
}
