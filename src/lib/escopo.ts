// Parte pura do escopo de acesso: sem banco, sem service role.
// Fica fora de escopo.server.ts para que as server functions possam importar
// estes ajustes diretamente, sem arrastar o cliente admin do Supabase.

export type Papel = "master" | "admin_unidade" | "gestor" | "usuario";

export type Escopo = {
  userId: string;
  master: boolean;
  papel: Papel;
  papeis: Papel[];
  /** Unidades que o usuário pode enxergar. */
  unitIds: string[];
  /** Unidade usada para gravar novos registros. */
  unidadeAtiva: string | null;
  /** Páginas que o usuário pode acessar. */
  rotas: string[];
  /** Quando true, o escopo foi restrito a uma única unidade escolhida na interface. */
  restrito?: boolean;
};

/**
 * Define a unidade de gravação sem restringir o que o usuário enxerga.
 * Equivale ao que `obterEscopo` faz com `unidadeSolicitada`, mas sem ir ao banco:
 * o escopo já vem montado pelo middleware de autorização.
 */
export function comUnidadeAtiva(escopo: Escopo, unitId?: string | null): Escopo {
  if (!unitId || !escopo.unitIds.includes(unitId)) return escopo;
  return { ...escopo, unidadeAtiva: unitId };
}

/** Restringe o escopo a uma unidade específica (seletor de unidade da interface). */
export function restringirUnidade(escopo: Escopo, unitId?: string | null): Escopo {
  if (!unitId) return escopo;
  if (!escopo.unitIds.includes(unitId)) return escopo;
  return { ...escopo, unitIds: [unitId], unidadeAtiva: unitId, restrito: true };
}

/** Lista de unidades para filtrar, ou null quando o usuário vê tudo (master). */
export function unidadesFiltro(escopo: Escopo): string[] | null {
  if (escopo.restrito) return escopo.unitIds.length ? escopo.unitIds : null;
  if (escopo.master) return null;
  return escopo.unitIds.length ? escopo.unitIds : ["00000000-0000-0000-0000-000000000000"];
}

/** Garante que o usuário pode gravar na unidade informada. */
export function unidadeDeGravacao(escopo: Escopo, unitId?: string | null): string | null {
  if (unitId && escopo.unitIds.includes(unitId)) return unitId;
  return escopo.unidadeAtiva;
}

export function exigirMaster(escopo: Escopo) {
  if (!escopo.master) throw new Error("Apenas o usuário master pode executar esta ação.");
}
