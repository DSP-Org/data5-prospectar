import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { exigirAcesso } from "./autorizacao";

const mensagem = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const entrada = z.object({
  mensagens: z.array(mensagem).min(1).max(30),
});

const texto = z.string().trim().max(200).optional().nullable();

export const sugestaoSchema = z.object({
  nome: texto,
  nomeFantasia: texto,
  uf: texto,
  municipios: z.array(z.string().max(120)).max(20).optional().nullable(),
  bairro: texto,
  cnaeTermos: z.array(z.string().max(120)).max(10).optional().nullable(),
  porteIds: z.array(z.string().max(4)).max(6).optional().nullable(),
  situacaoIds: z.array(z.string().max(4)).max(6).optional().nullable(),
  capitalMin: z.number().nonnegative().optional().nullable(),
  capitalMax: z.number().nonnegative().optional().nullable(),
  aberturaDe: texto,
  aberturaAte: texto,
  matrizFilial: texto,
  simples: texto,
  mei: texto,
  temTelefone: texto,
  temEmail: texto,
  ddd: texto,
  limite: z.number().int().min(1).max(100).optional().nullable(),
  explicacao: z.string().max(600).optional().nullable(),
});

export type SugestaoFiltros = z.infer<typeof sugestaoSchema>;

const respostaSchema = z.object({
  mensagem: z.string().max(1200).default(""),
  aplicar: z.boolean().default(false),
  filtros: sugestaoSchema.optional().nullable(),
});

export type RespostaIaFiltros = z.infer<typeof respostaSchema>;

const PROMPT = `Você é um assistente que conversa em português com um vendedor para montar filtros de busca de empresas (base CNPJ da CNPJá).

Converse normalmente: faça perguntas curtas para esclarecer o que falta (região, atividade, porte, situação, período de abertura, capital, matriz/filial, contatos) e confirme o que já entendeu. Seja breve (no máximo 3 frases ou uma lista curta).

Responda SEMPRE somente com JSON válido, sem markdown, no formato:
{"mensagem":"texto da conversa","aplicar":false,"filtros":null}

Quando (e somente quando) o usuário mandar aplicar/preencher/pode aplicar/manda ver/buscar, responda com "aplicar": true e preencha "filtros":
{"nome":null,"nomeFantasia":null,"uf":null,"municipios":[],"bairro":null,"cnaeTermos":[],"porteIds":[],"situacaoIds":[],"capitalMin":null,"capitalMax":null,"aberturaDe":null,"aberturaAte":null,"matrizFilial":null,"simples":null,"mei":null,"temTelefone":null,"temEmail":null,"ddd":null,"limite":null,"explicacao":""}

Regras dos filtros:
- uf: sigla de 2 letras em maiúsculo (ex.: SP). municipios: nomes por extenso.
- cnaeTermos: SEMPRE preencha quando houver qualquer tipo de negócio, produto ou atividade citado na conversa (ex.: "padarias", "clínicas", "transportadoras"). Use de 1 a 3 termos curtos com o vocabulário oficial do CNAE/IBGE (ex.: "padaria" -> "fabricação de produtos de padaria", "confeitaria"; "transportadora" -> "transporte rodoviário de carga"). Códigos CNAE numéricos também são aceitos.
- porteIds: "1"=ME, "3"=EPP, "5"=Demais. situacaoIds: "2"=Ativa, "4"=Inapta, "8"=Baixada. Se não citado, use ["2"].
- matrizFilial: "matriz", "filial" ou "" (ambos).
- simples/mei/temTelefone/temEmail: "sim", "nao" ou "" quando não citado.
- datas em AAAA-MM-DD. capital em reais (número).
- explicacao: uma frase curta dizendo o que foi aplicado.
Considere toda a conversa anterior ao montar os filtros. Campos não citados ficam null ou lista vazia.`;

export const conversarFiltrosFn = createServerFn({ method: "POST" })
  .middleware([exigirAcesso("/consulta")])
  .inputValidator((d: unknown) => entrada.parse(d))
  .handler(async ({ data }): Promise<RespostaIaFiltros> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistente de IA indisponível no momento.");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [{ role: "system", content: PROMPT }, ...data.mensagens],
      }),
    });

    if (resp.status === 429) throw new Error("Muitas solicitações à IA. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Recarregue no painel da Lovable.");
    if (!resp.ok) throw new Error("A IA não conseguiu responder agora.");

    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const bruto = json.choices?.[0]?.message?.content ?? "";
    const limpo = bruto.replace(/```json/gi, "").replace(/```/g, "").trim();
    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");

    if (inicio < 0 || fim < 0) {
      return { mensagem: limpo || "Pode detalhar um pouco mais o que você procura?", aplicar: false, filtros: null };
    }

    try {
      return respostaSchema.parse(JSON.parse(limpo.slice(inicio, fim + 1)));
    } catch {
      return { mensagem: limpo.slice(inicio, fim + 1), aplicar: false, filtros: null };
    }
  });
