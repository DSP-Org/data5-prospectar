// Tabela oficial de Natureza Jurídica 2021 (IBGE/CONCLA).
// Usada para normalizar o campo `natureza_juridica`, que chega em formatos
// diferentes conforme a fonte (código "2062", "206-2" ou só a descrição).

export const GRUPOS_NATUREZA = {
  "1": "Administração Pública",
  "2": "Entidades Empresariais",
  "3": "Entidades sem Fins Lucrativos",
  "4": "Pessoas Físicas",
  "5": "Instituições Extraterritoriais",
} as const;

export type GrupoNatureza = keyof typeof GRUPOS_NATUREZA;

export const NATUREZAS: Record<string, string> = {
  "1015": "Órgão Público do Poder Executivo Federal",
  "1023": "Órgão Público do Poder Executivo Estadual ou do Distrito Federal",
  "1031": "Órgão Público do Poder Executivo Municipal",
  "1040": "Órgão Público do Poder Legislativo Federal",
  "1058": "Órgão Público do Poder Legislativo Estadual ou do Distrito Federal",
  "1066": "Órgão Público do Poder Legislativo Municipal",
  "1074": "Órgão Público do Poder Judiciário Federal",
  "1082": "Órgão Público do Poder Judiciário Estadual",
  "1104": "Autarquia Federal",
  "1112": "Autarquia Estadual ou do Distrito Federal",
  "1120": "Autarquia Municipal",
  "1139": "Fundação Pública de Direito Público Federal",
  "1147": "Fundação Pública de Direito Público Estadual ou do Distrito Federal",
  "1155": "Fundação Pública de Direito Público Municipal",
  "1163": "Órgão Público Autônomo Federal",
  "1171": "Órgão Público Autônomo Estadual ou do Distrito Federal",
  "1180": "Órgão Público Autônomo Municipal",
  "1198": "Comissão Polinacional",
  "1210": "Consórcio Público de Direito Público (Associação Pública)",
  "1228": "Consórcio Público de Direito Privado",
  "1236": "Estado ou Distrito Federal",
  "1244": "Município",
  "1252": "Fundação Pública de Direito Privado Federal",
  "1260": "Fundação Pública de Direito Privado Estadual ou do Distrito Federal",
  "1279": "Fundação Pública de Direito Privado Municipal",
  "1287": "Fundo Público da Administração Indireta Federal",
  "1295": "Fundo Público da Administração Indireta Estadual ou do Distrito Federal",
  "1309": "Fundo Público da Administração Indireta Municipal",
  "1317": "Fundo Público da Administração Direta Federal",
  "1325": "Fundo Público da Administração Direta Estadual ou do Distrito Federal",
  "1333": "Fundo Público da Administração Direta Municipal",
  "1341": "União",

  "2011": "Empresa Pública",
  "2038": "Sociedade de Economia Mista",
  "2046": "Sociedade Anônima Aberta",
  "2054": "Sociedade Anônima Fechada",
  "2062": "Sociedade Empresária Limitada",
  "2070": "Sociedade Empresária em Nome Coletivo",
  "2089": "Sociedade Empresária em Comandita Simples",
  "2097": "Sociedade Empresária em Comandita por Ações",
  "2105": "Sociedade em Conta de Participação",
  "2135": "Empresário (Individual)",
  "2143": "Cooperativa",
  "2151": "Consórcio de Sociedades",
  "2160": "Grupo de Sociedades",
  "2178": "Estabelecimento, no Brasil, de Sociedade Estrangeira",
  "2194": "Estabelecimento, no Brasil, de Empresa Binacional Argentino-Brasileira",
  "2216": "Empresa Domiciliada no Exterior",
  "2224": "Clube/Fundo de Investimento",
  "2232": "Sociedade Simples Pura",
  "2240": "Sociedade Simples Limitada",
  "2259": "Sociedade Simples em Nome Coletivo",
  "2267": "Sociedade Simples em Comandita Simples",
  "2275": "Empresa Binacional",
  "2283": "Consórcio de Empregadores",
  "2291": "Consórcio Simples",
  "2305": "Empresa Individual de Responsabilidade Limitada (de Natureza Empresária)",
  "2313": "Empresa Individual de Responsabilidade Limitada (de Natureza Simples)",
  "2321": "Sociedade Unipessoal de Advogados",
  "2330": "Cooperativas de Consumo",
  "2348": "Empresa Simples de Inovação - Inova Simples",
  "2356": "Investidor Não Residente",

  "3034": "Serviço Notarial e Registral (Cartório)",
  "3069": "Fundação Privada",
  "3077": "Serviço Social Autônomo",
  "3085": "Condomínio Edilício",
  "3107": "Comissão de Conciliação Prévia",
  "3115": "Entidade de Mediação e Arbitragem",
  "3131": "Entidade Sindical",
  "3204": "Estabelecimento, no Brasil, de Fundação ou Associação Estrangeiras",
  "3212": "Fundação ou Associação Domiciliada no Exterior",
  "3220": "Organização Religiosa",
  "3239": "Comunidade Indígena",
  "3247": "Fundo Privado",
  "3255": "Órgão de Direção Nacional de Partido Político",
  "3263": "Órgão de Direção Regional de Partido Político",
  "3271": "Órgão de Direção Local de Partido Político",
  "3280": "Comitê Financeiro de Partido Político",
  "3298": "Frente Plebiscitária ou Referendária",
  "3301": "Organização Social (OS)",
  "3310": "Demais Condomínios",
  "3999": "Associação Privada",

  "4014": "Empresa Individual Imobiliária",
  "4022": "Segurado Especial",
  "4081": "Contribuinte Individual",
  "4090": "Candidato a Cargo Político Eletivo",
  "4111": "Leiloeiro",
  "4120": "Produtor Rural (Pessoa Física)",

  "5010": "Organização Internacional",
  "5029": "Representação Diplomática Estrangeira",
  "5037": "Outras Instituições Extraterritoriais",
};

function slug(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const POR_DESCRICAO = new Map<string, string>();
for (const [codigo, descricao] of Object.entries(NATUREZAS)) {
  POR_DESCRICAO.set(slug(descricao), codigo);
}
// apelidos comuns vindos das fontes
const APELIDOS: Record<string, string> = {
  "sociedade empresaria limitada ltda": "2062",
  "ltda": "2062",
  "sociedade limitada": "2062",
  "empresario individual": "2135",
  "empresario": "2135",
  "mei": "2135",
  "microempreendedor individual": "2135",
  "sociedade anonima": "2054",
  "sa": "2054",
  "eireli": "2305",
  "empresa individual de responsabilidade limitada": "2305",
  "sociedade simples": "2232",
  "associacao privada": "3999",
  "sociedade unipessoal de advocacia": "2321",
  "cartorio": "3034",
};
for (const [k, v] of Object.entries(APELIDOS)) POR_DESCRICAO.set(k, v);

export type NaturezaNormalizada = {
  codigo: string; // "2062"
  formatado: string; // "206-2"
  descricao: string;
  grupo: GrupoNatureza;
  grupoLabel: string;
  /** valor canônico guardado no banco: "206-2 - Sociedade Empresária Limitada" */
  canonico: string;
};

export function normalizarNatureza(valor?: string | null): NaturezaNormalizada | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  let codigo: string | undefined;

  const digitos = texto.replace(/\D/g, "");
  if (digitos.length >= 4 && NATUREZAS[digitos.slice(0, 4)]) codigo = digitos.slice(0, 4);

  if (!codigo) {
    const s = slug(texto.replace(/^\d{3}-?\d?\s*[-–]?\s*/, ""));
    codigo = POR_DESCRICAO.get(s);
    if (!codigo) {
      for (const [desc, cod] of POR_DESCRICAO) {
        if (s.includes(desc) || desc.includes(s)) {
          codigo = cod;
          break;
        }
      }
    }
  }

  if (!codigo) return null;

  const descricao = NATUREZAS[codigo]!;
  const grupo = codigo[0] as GrupoNatureza;
  const formatado = `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
  return {
    codigo,
    formatado,
    descricao,
    grupo,
    grupoLabel: GRUPOS_NATUREZA[grupo],
    canonico: `${formatado} - ${descricao}`,
  };
}

/** Texto pronto para salvar; devolve o valor original quando não reconhecido. */
export function canonizarNatureza(valor?: string | null): string | null {
  const n = normalizarNatureza(valor);
  return n ? n.canonico : (valor?.trim() || null);
}

/** Grupo (1..5) de um valor já salvo. */
export function grupoDaNatureza(valor?: string | null): GrupoNatureza | null {
  return normalizarNatureza(valor)?.grupo ?? null;
}
