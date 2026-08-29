import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { comUnidadeAtiva, restringirUnidade } from "./escopo";
import { exigirAcesso } from "./autorizacao";

const statusSchema = z.enum(["novo", "em_contato", "qualificado", "cliente", "descartado"]);

export const testarConexaoFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/")])
  .handler(async () => {
    const { testarConexao } = await import("./repo.server");
    return testarConexao();
  });

export const consultarCnpjsFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/consulta", "/empresas")])
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
    return consultarCnpjs({ ...data, escopo: comUnidadeAtiva(context.escopo, data.unitId) });
  });

export const consultarChaveFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/consulta")])
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
    return consultarChave({ ...data, escopo: comUnidadeAtiva(context.escopo, data.unitId) });
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
  dono: z.enum(["meus", "sem_dono", "outros"]).optional(),
});

const cnpjsSchema = z.array(z.string().min(14).max(20)).min(1).max(500);

export const consultarChavesFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/consulta")])
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
    return consultarChaves({ ...data, escopo: comUnidadeAtiva(context.escopo, data.unitId) });
  });

export const opcoesFiltroFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/empresas")])
  .handler(async ({ context }) => {
    const { opcoesFiltro } = await import("./repo.server");
    return opcoesFiltro(context.escopo);
  });

export const listarEmpresasFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil")])
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
    return listarEmpresas({ ...data, escopo: context.escopo });
  });

export const obterEmpresaFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil")])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { obterEmpresa } = await import("./repo.server");
    return obterEmpresa(data.cnpj, context.escopo);
  });

export const atualizarEmpresaFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/funil")])
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
    return atualizarEmpresa({ ...data, escopo: context.escopo });
  });

export const excluirEmpresaFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas")])
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirEmpresa } = await import("./repo.server");
    return excluirEmpresa(data.cnpj, context.escopo);
  });

export const vincularEmpresasListaFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/listas")])
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
    return vincularEmpresasLista(data.cnpjs, data.listId, context.escopo);
  });

/** O vendedor assume o lead; quem já tem dono não é tocado. */
export const assumirLeadsFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil")])
  .inputValidator((d: unknown) => z.object({ cnpjs: cnpjsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { assumirLeads } = await import("./repo.server");
    return assumirLeads(data.cnpjs, context.escopo);
  });

/** Devolve o lead para a base. */
export const liberarLeadsFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil")])
  .inputValidator((d: unknown) => z.object({ cnpjs: cnpjsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { liberarLeads } = await import("./repo.server");
    return liberarLeads(data.cnpjs, context.escopo);
  });

/** Transferência de carteira entre vendedores (gestor para cima). */
export const definirDonoFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/equipe")])
  .inputValidator((d: unknown) =>
    z.object({ cnpjs: cnpjsSchema, ownerId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { definirDono } = await import("./repo.server");
    return definirDono(data.cnpjs, data.ownerId, context.escopo);
  });

export const marcarProspectarFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas", "/clientes-potenciais", "/funil")])
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
    return marcarProspectar(data.cnpjs, data.valor, context.escopo);
  });

export const listarListasFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/empresas", "/listas", "/clientes-potenciais", "/consulta", "/funil", "/importacoes")])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { listarListas } = await import("./repo.server");
    return listarListas(restringirUnidade(context.escopo, data.unidade));
  });

export const criarListaFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/listas")])
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
    const escopo = comUnidadeAtiva(context.escopo, data.unitId);
    return criarLista(data.name, data.color ?? "slate", escopo, data.unitId ?? null);
  });

export const excluirListaFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/listas")])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirLista } = await import("./repo.server");
    return excluirLista(data.id, context.escopo);
  });

export const obterPainelFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/", "/relatorios")])
  .inputValidator((d: unknown) => z.object({ unidade: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { obterPainel } = await import("./repo.server");
    return obterPainel(restringirUnidade(context.escopo, data.unidade));
  });

export const exportarEmpresasFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/empresas")])
  .inputValidator((d: unknown) => filtrosSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { exportarEmpresas } = await import("./repo.server");
    return exportarEmpresas({ ...data, escopo: context.escopo });
  });

export const contarSemListaFn = createServerFn({ method: "GET" })
  .middleware([exigirAcesso("/listas")])
  .handler(async ({ context }) => {
    const { contarSemLista } = await import("./repo.server");
    return contarSemLista(context.escopo);
  });
