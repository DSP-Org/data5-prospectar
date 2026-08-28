import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({ pedido: z.string().trim().min(3).max(1000) });

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

const PROMPT = `Você converte pedidos em português para filtros de busca de empresas (base CNPJ).
Responda SOMENTE com JSON válido, sem markdown, no formato:
{"nome":null,"nomeFantasia":null,"uf":null,"municipios":[],"bairro":null,"cnaeTermos":[],"porteIds":[],"situacaoIds":[],"capitalMin":null,"capitalMax":null,"aberturaDe":null,"aberturaAte":null,"matrizFilial":null,"simples":null,"mei":null,"temTelefone":null,"temEmail":null,"ddd":null,"limite":null,"explicacao":""}
Regras:
- uf: sigla de 2 letras em maiúsculo (ex.: SP). municipios: nomes por extenso.
- cnaeTermos: SEMPRE preencha quando o pedido citar qualquer tipo de negócio, produto ou atividade (ex.: "padarias", "clínicas", "transportadoras"). Use de 1 a 3 termos curtos com o vocabulário oficial do CNAE/IBGE (ex.: "padaria" -> "fabricação de produtos de padaria", "confeitaria"; "transportadora" -> "transporte rodoviário de carga"). Códigos CNAE numéricos também são aceitos.
- porteIds: "1"=ME, "3"=EPP, "5"=Demais. situacaoIds: "2"=Ativa, "4"=Inapta, "8"=Baixada. Se o pedido não citar, use ["2"].
- matrizFilial: "matriz", "filial" ou "" (ambos).
- simples/mei/temTelefone/temEmail: "sim", "nao" ou "" quando não citado.
- datas em AAAA-MM-DD. capital em reais (número).
- explicacao: uma frase curta em português dizendo o que foi entendido.
Campos não citados no pedido devem ficar null ou lista vazia.`;

export const sugerirFiltrosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => entrada.parse(d))
  .handler(async ({ data }): Promise<SugestaoFiltros> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistente de IA indisponível no momento.");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: data.pedido },
        ],
      }),
    });

    if (resp.status === 429) throw new Error("Muitas solicitações à IA. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Recarregue no painel da Lovable.");
    if (!resp.ok) throw new Error("A IA não conseguiu interpretar o pedido agora.");

    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const bruto = json.choices?.[0]?.message?.content ?? "";
    const limpo = bruto.replace(/```json/gi, "").replace(/```/g, "").trim();
    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");
    if (inicio < 0 || fim < 0) throw new Error("A IA não retornou filtros válidos.");

    try {
      return sugestaoSchema.parse(JSON.parse(limpo.slice(inicio, fim + 1)));
    } catch {
      throw new Error("A IA não retornou filtros válidos.");
    }
  });
