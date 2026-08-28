import { Target } from "lucide-react";

import { formatCnpj, type Contato } from "@/lib/types";

type Pessoa = Contato & Record<string, unknown>;

export interface FichaImpressaoProps {
  empresa: {
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string | null;
    situacao?: string | null;
    tipo_unidade?: string | null;
    natureza_juridica?: string | null;
    data_abertura?: string | null;
    cnae_codigo?: string | null;
    cnae_descricao?: string | null;
    setores?: string[];
    porte_estimado?: string | null;
    enquadramento_porte?: string[];
    faturamento_presumido?: string | null;
    qtd_funcionarios_estimada?: string | null;
    capital_social?: number | null;
    telefones?: string[];
    emails?: string[];
    sites?: string[];
    notas?: string | null;
    status?: string | null;
  };
  endereco: string;
  pessoas: Pessoa[];
  statusLabel: string;
  secundarias?: Array<{ codigo?: string | null; descricao?: string | null }>;
  regime?: string[];
  fontes?: string[];
}

function txt(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function Linha({ label, valor }: { label: string; valor?: string | null | undefined }) {
  return (
    <div className="ficha-linha">
      <span className="ficha-label">{label}</span>
      <span className="ficha-valor">{valor && valor.trim() !== "" ? valor : "—"}</span>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="ficha-secao">
      <h2 className="ficha-secao-titulo">{titulo}</h2>
      <div className="ficha-secao-corpo">{children}</div>
    </section>
  );
}

export function FichaImpressao({
  empresa: e,
  endereco,
  pessoas,
  statusLabel,
  secundarias = [],
  regime = [],
  fontes = [],
}: FichaImpressaoProps) {
  const emitido = new Date().toLocaleString("pt-BR");

  return (
    <div className="ficha-print" aria-hidden="true">
      <header className="ficha-cabecalho">
        <div className="ficha-marca">
          <Target className="ficha-logo" />
          <div>
            <p className="ficha-marca-nome">Prospectar360</p>
            <p className="ficha-marca-sub">Ficha cadastral da empresa</p>
          </div>
        </div>
        <div className="ficha-emissao">
          <p>Emitido em {emitido}</p>
          {fontes.length > 0 && <p>Fontes: {fontes.join(", ")}</p>}
        </div>
      </header>

      <div className="ficha-identificacao">
        <h1 className="ficha-razao">{e.razao_social}</h1>
        {e.nome_fantasia ? <p className="ficha-fantasia">{e.nome_fantasia}</p> : null}
        <div className="ficha-chips">
          <span className="ficha-chip ficha-chip-forte">{formatCnpj(e.cnpj)}</span>
          {e.situacao ? <span className="ficha-chip">{e.situacao}</span> : null}
          <span className="ficha-chip">{statusLabel}</span>
        </div>
      </div>

      <Secao titulo="Dados cadastrais">
        <div className="ficha-grid">
          <Linha label="Natureza jurídica" valor={e.natureza_juridica} />
          <Linha label="Tipo de unidade" valor={e.tipo_unidade} />
          <Linha
            label="Data de abertura"
            valor={e.data_abertura ? new Date(e.data_abertura).toLocaleDateString("pt-BR") : null}
          />
          <Linha
            label="CNAE principal"
            valor={[e.cnae_codigo, e.cnae_descricao].filter(Boolean).join(" — ")}
          />
          <Linha label="Setores" valor={(e.setores ?? []).join(", ")} />
          <Linha label="Regime tributário" valor={regime.join(" · ")} />
        </div>
        <div className="ficha-endereco">
          <span className="ficha-label">Endereço</span>
          <span className="ficha-valor">{endereco || "—"}</span>
        </div>
      </Secao>

      <Secao titulo="Porte e finanças">
        <div className="ficha-grid">
          <Linha label="Porte estimado" valor={e.porte_estimado} />
          <Linha label="Enquadramento" valor={(e.enquadramento_porte ?? []).join(", ")} />
          <Linha label="Faturamento presumido" valor={e.faturamento_presumido} />
          <Linha label="Funcionários estimados" valor={e.qtd_funcionarios_estimada} />
          <Linha
            label="Capital social"
            valor={
              e.capital_social != null
                ? e.capital_social.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : null
            }
          />
        </div>
      </Secao>

      <Secao titulo="Contatos">
        <div className="ficha-grid">
          <div className="ficha-linha">
            <span className="ficha-label">Telefones</span>
            <span className="ficha-valor">
              {(e.telefones ?? []).length > 0 ? (e.telefones ?? []).join(" · ") : "—"}
            </span>
          </div>
          <div className="ficha-linha">
            <span className="ficha-label">E-mails</span>
            <span className="ficha-valor">
              {(e.emails ?? []).length > 0 ? (e.emails ?? []).join(" · ") : "—"}
            </span>
          </div>
          <div className="ficha-linha ficha-col-2">
            <span className="ficha-label">Sites</span>
            <span className="ficha-valor">
              {(e.sites ?? []).length > 0 ? (e.sites ?? []).join(" · ") : "—"}
            </span>
          </div>
        </div>
      </Secao>

      {pessoas.length > 0 && (
        <Secao titulo="Sócios e decisores">
          <table className="ficha-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qualificação / cargo</th>
                <th>Contato</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.slice(0, 20).map((p, i) => {
                const raw = p.emails ?? p.email;
                const mails = Array.isArray(raw)
                  ? raw.filter((m): m is string => typeof m === "string")
                  : typeof raw === "string" && raw
                    ? [raw]
                    : [];
                return (
                  <tr key={`${txt(p.nome)}-${i}`}>
                    <td>
                      {txt(p.nome) || "Sem nome"}
                      {p.is_administrador ? <span className="ficha-tag">Administrador</span> : null}
                    </td>
                    <td>{txt(p.qualificacao) || txt(p.cargo) || "—"}</td>
                    <td>{mails.join(", ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Secao>
      )}

      {secundarias.length > 0 && (
        <Secao titulo="Atividades secundárias">
          <ul className="ficha-lista">
            {secundarias.slice(0, 20).map((a, i) => (
              <li key={`${a.codigo ?? "c"}-${i}`}>
                <strong>{a.codigo}</strong> {a.descricao}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Anotações comerciais">
        <p className="ficha-notas">{e.notas?.trim() ? e.notas : "—"}</p>
        <div className="ficha-assinaturas">
          <div>
            <span />
            <p>Responsável pela prospecção</p>
          </div>
          <div>
            <span />
            <p>Data / visto</p>
          </div>
        </div>
      </Secao>

      <footer className="ficha-rodape">
        Prospectar360 · documento gerado automaticamente a partir da base multi-fonte ·{" "}
        {formatCnpj(e.cnpj)}
      </footer>
    </div>
  );
}
