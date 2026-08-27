import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const statusSchema = z.enum(["novo", "em_contato", "qualificado", "cliente", "descartado"]);

export const testarConexaoFn = createServerFn({ method: "GET" }).handler(async () => {
  const { testarConexao } = await import("./repo.server");
  return testarConexao();
});

export const consultarCnpjsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpjs: z.array(z.string()).min(1).max(300),
        listId: z.string().uuid().nullable().optional(),
        salvar: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { consultarCnpjs } = await import("./repo.server");
    return consultarCnpjs(data);
  });

export const consultarChaveFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        site: z.string().max(200).optional(),
        email: z.string().max(200).optional(),
        listId: z.string().uuid().nullable().optional(),
        salvar: z.boolean().optional(),
      })
      .refine((v) => Boolean(v.site || v.email), { message: "Informe um site ou e-mail." })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { consultarChave } = await import("./repo.server");
    return consultarChave(data);
  });

const filtrosSchema = z.object({
  busca: z.string().max(120).optional(),
  status: z.string().max(30).optional(),
  uf: z.string().max(10).optional(),
  listId: z.string().max(40).optional(),
  cidade: z.string().max(80).optional(),
  bairro: z.string().max(80).optional(),
  cnae: z.string().max(80).optional(),
  porte: z.string().max(40).optional(),
  situacao: z.string().max(40).optional(),
  naturezaJuridica: z.string().max(120).optional(),
  setor: z.string().max(80).optional(),
  comTelefone: z.boolean().optional(),
  comEmail: z.boolean().optional(),
  comSite: z.boolean().optional(),
  comDecisor: z.boolean().optional(),
  capitalMin: z.number().nonnegative().optional(),
  capitalMax: z.number().nonnegative().optional(),
  aberturaDe: z.string().max(10).optional(),
  aberturaAte: z.string().max(10).optional(),
});

export const consultarChavesFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        chaves: z.array(z.string().max(200)).min(1).max(100),
        listId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { consultarChaves } = await import("./repo.server");
    return consultarChaves(data);
  });

export const opcoesFiltroFn = createServerFn({ method: "GET" }).handler(async () => {
  const { opcoesFiltro } = await import("./repo.server");
  return opcoesFiltro();
});

export const listarEmpresasFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    filtrosSchema
      .extend({
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { listarEmpresas } = await import("./repo.server");
    return listarEmpresas(data);
  });

export const obterEmpresaFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { obterEmpresa } = await import("./repo.server");
    return obterEmpresa(data.cnpj);
  });

export const atualizarEmpresaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        cnpj: z.string().min(14).max(20),
        status: statusSchema.optional(),
        notas: z.string().max(5000).optional(),
        listId: z.string().uuid().nullable().optional(),
        tags: z.array(z.string().max(40)).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { atualizarEmpresa } = await import("./repo.server");
    return atualizarEmpresa(data);
  });

export const excluirEmpresaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ cnpj: z.string().min(14).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { excluirEmpresa } = await import("./repo.server");
    return excluirEmpresa(data.cnpj);
  });

export const listarListasFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listarListas } = await import("./repo.server");
  return listarListas();
});

export const criarListaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(60), color: z.string().max(20).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { criarLista } = await import("./repo.server");
    return criarLista(data.name, data.color ?? "slate");
  });

export const excluirListaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { excluirLista } = await import("./repo.server");
    return excluirLista(data.id);
  });

export const obterPainelFn = createServerFn({ method: "GET" }).handler(async () => {
  const { obterPainel } = await import("./repo.server");
  return obterPainel();
});

export const exportarEmpresasFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => filtrosSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { exportarEmpresas } = await import("./repo.server");
    return exportarEmpresas(data);
  });

export const contarSemListaFn = createServerFn({ method: "GET" }).handler(async () => {
  const { contarSemLista } = await import("./repo.server");
  return contarSemLista();
});
