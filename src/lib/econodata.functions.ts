import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusSchema = z.enum(["novo", "em_contato", "qualificado", "cliente", "descartado"]);

async function escopoDe(userId: string, unitId?: string | null) {
  const { obterEscopo } = await import("./escopo.server");
  return obterEscopo(userId, unitId ?? null);
}

/** Escopo restrito a uma unidade escolhida no seletor global. */
async function escopoNaUnidade(userId: string, unitId?: string | null) {
  const { restringirUnidade } = await import("./escopo.server");
  return restringirUnidade(await escopoDe(userId, unitId), unitId ?? null);
}

export const testarConexaoFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { testarConexao } = await import("./repo.server");
    return testarConexao();
  });

export const consultarCnpjsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpjs: z.array(z.string()).min(1).max(300),
        listId: z.string().uuid().nullable().optional(),
        unitId: z.string().uuid().nullable().optional(),
        salvar: z.boolean().optional(),
        forcar: z.boolean().optional(),
        completo: z.boolean().optional(),

      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { consultarCnpjs } = await import("./repo.server");
    return consultarCnpjs({ ...data, escopo: await escopoDe(context.userId, data.unitId) });
  });

export const consultarChaveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        site: z.string().max(200).optional(),
        email: z.string().max(200).optional(),
        listId: z.string().uuid().nullable().optional(),
        unitId: z.string().uuid().nullable().optional(),
        salvar: z.boolean().optional(),
      })
      .refine((v) => Boolean(v.site || v.email), { message: "Informe um site ou e-mail." })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { consultarChave } = await import("./repo.server");
    return consultarChave({ ...data, escopo: await escopoDe(context.userId, data.unitId) });
  });

const filtrosSchema = z.object({
  busca: z.string().max(120).optional(),
  status: z.string().max(30).optional(),
  uf: z.string().max(10).optional(),
  listId: z.string().max(40).optional(),
  productId: z.string().max(40).optional(),
  cidade: z.string().max(80).optional(),
  bairro: z.string().max(80).optional(),
  cnae: z.string().max(80).optional(),
  porte: z.string().max(40).optional(),
  situacao: z.string().max(40).optional(),
  naturezaJuridica: z.string().max(120).optional(),
  grupoNatureza: z.string().max(10).optional(),
  setor: z.string().max(80).optional(),
  comTelefone: z.boolean().optional(),
  comEmail: z.boolean().optional(),
  comSite: z.boolean().optional(),
  comDecisor: z.boolean().optional(),
  capitalMin: z.number().nonnegative().optional(),
  capitalMax: z.number().nonnegative().optional(),
  aberturaDe: z.string().max(10).optional(),
  aberturaAte: z.string().max(10).optional(),
  simples: z.enum(["sim", "nao"]).optional(),
  mei: z.enum(["sim", "nao"]).optional(),
  prospectar: z.boolean().optional(),
});

export const consultarChavesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        chaves: z.array(z.string().max(200)).min(1).max(100),
        listId: z.string().uuid().nullable().optional(),
        unitId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { consultarChaves } = await import("./repo.server");
    return consultarChaves({ ...data, escopo: await escopoDe(context.userId, data.unitId) });
  });

export const opcoesFiltroFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { opcoesFiltro } = await import("./repo.server");
    return opcoesFiltro(await escopoDe(context.userId));
  });

export const listarEmpresasFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    filtrosSchema
      .extend({
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { listarEmpresas } = await import("./repo.server");
    return listarEmpresas({ ...data, escopo: await escopoDe(context.userId) });
  });

export const obterEmpresaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { obterEmpresa } = await import("./repo.server");
    return obterEmpresa(data.cnpj, await escopoDe(context.userId));
  });

export const atualizarEmpresaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpj: z.string().min(14).max(20),
        status: statusSchema.optional(),
        notas: z.string().max(5000).optional(),
        listId: z.string().uuid().nullable().optional(),
        productId: z.string().uuid().nullable().optional(),
        tags: z.array(z.string().max(40)).max(20).optional(),
        prospectar: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { atualizarEmpresa } = await import("./repo.server");
    return atualizarEmpresa({ ...data, escopo: await escopoDe(context.userId) });
  });

export const excluirEmpresaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirEmpresa } = await import("./repo.server");
    return excluirEmpresa(data.cnpj, await escopoDe(context.userId));
  });

export const vincularEmpresasListaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpjs: z.array(z.string().min(14).max(20)).min(1).max(500),
        listId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { vincularEmpresasLista } = await import("./repo.server");
    return vincularEmpresasLista(data.cnpjs, data.listId, await escopoDe(context.userId));
  });

export const marcarProspectarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpjs: z.array(z.string().min(14).max(20)).min(1).max(500),
        valor: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { marcarProspectar } = await import("./repo.server");
    return marcarProspectar(data.cnpjs, data.valor, await escopoDe(context.userId));
  });

export const listarListasFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { listarListas } = await import("./repo.server");
    return listarListas(await escopoNaUnidade(context.userId, data.unidade));
  });

export const criarListaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(60),
        color: z.string().max(20).optional(),
        unitId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { criarLista } = await import("./repo.server");
    const escopo = await escopoDe(context.userId, data.unitId);
    return criarLista(data.name, data.color ?? "slate", escopo, data.unitId ?? null);
  });

export const excluirListaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirLista } = await import("./repo.server");
    return excluirLista(data.id, await escopoDe(context.userId));
  });

export const obterPainelFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { obterPainel } = await import("./repo.server");
    return obterPainel(await escopoNaUnidade(context.userId, data.unidade));
  });

export const exportarEmpresasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filtrosSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { exportarEmpresas } = await import("./repo.server");
    return exportarEmpresas({ ...data, escopo: await escopoDe(context.userId) });
  });

export const contarSemListaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { contarSemLista } = await import("./repo.server");
    return contarSemLista(await escopoDe(context.userId));
  });
