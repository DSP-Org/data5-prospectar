/** Exportação da Base de Empresas em Excel (.xlsx) e em relatório PDF. */

export type ColunaExport = [titulo: string, valor: () => string];

export type LinhaExport = string[];

export type ResumoFiltro = { rotulo: string; valor: string };

/** Paleta da marca (aproximação RGB dos tokens do tema). */
const AZUL: [number, number, number] = [42, 59, 92];
const LARANJA: [number, number, number] = [224, 138, 46];
const CINZA: [number, number, number] = [110, 118, 132];

function nomeArquivo(ext: string) {
  return `base-empresas-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export async function baixarExcel(cabecalhos: string[], linhas: LinhaExport[]) {
  const XLSX = await import("xlsx");
  const dados = [cabecalhos, ...linhas];
  const ws = XLSX.utils.aoa_to_sheet(dados);

  ws["!cols"] = cabecalhos.map((h, i) => {
    const largura = Math.max(
      h.length,
      ...linhas.slice(0, 500).map((l) => (l[i] ?? "").length),
    );
    return { wch: Math.min(Math.max(largura + 2, 10), 45) };
  });
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: linhas.length, c: Math.max(cabecalhos.length - 1, 0) },
    }),
  };

  for (let c = 0; c < cabecalhos.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[ref];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
        fill: { patternType: "solid", fgColor: { rgb: "2A3B5C" } },
        alignment: { vertical: "center" },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");
  XLSX.writeFile(wb, nomeArquivo("xlsx"), { compression: true });
}

export async function baixarPdf(opcoes: {
  cabecalhos: string[];
  linhas: LinhaExport[];
  filtros: ResumoFiltro[];
  indicadores: Array<{ rotulo: string; valor: string }>;
}) {
  const { cabecalhos, linhas, filtros, indicadores } = opcoes;
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const emitido = new Date().toLocaleString("pt-BR");

  // Cabeçalho da marca
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, larguraPagina, 62, "F");
  doc.setFillColor(...LARANJA);
  doc.rect(0, 60, larguraPagina, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Prospectar360", 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Relatório da base de empresas", 40, 46);
  doc.setFontSize(9);
  doc.text(`Emitido em ${emitido}`, larguraPagina - 40, 30, { align: "right" });
  doc.text(`${linhas.length} empresa(s)`, larguraPagina - 40, 46, { align: "right" });

  let y = 86;

  // Indicadores
  if (indicadores.length > 0) {
    const largura = (larguraPagina - 80 - (indicadores.length - 1) * 10) / indicadores.length;
    indicadores.forEach((ind, i) => {
      const x = 40 + i * (largura + 10);
      doc.setFillColor(243, 245, 249);
      doc.roundedRect(x, y, largura, 44, 4, 4, "F");
      doc.setTextColor(...CINZA);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(ind.rotulo.toUpperCase(), x + 10, y + 16);
      doc.setTextColor(...AZUL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(ind.valor, x + 10, y + 35);
    });
    y += 58;
  }

  // Filtros aplicados
  if (filtros.length > 0) {
    doc.setTextColor(...CINZA);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const texto = `Filtros: ${filtros
      .map((f) => (f.rotulo ? `${f.rotulo}: ${f.valor}` : f.valor))
      .join("  •  ")}`;
    const linhasTexto = doc.splitTextToSize(texto, larguraPagina - 80) as string[];
    doc.text(linhasTexto, 40, y);
    y += linhasTexto.length * 11 + 6;
  }

  // Textos longos são encurtados para a tabela caber com linhas compactas.
  const corta = (v: string) => (v.length > 46 ? `${v.slice(0, 45)}…` : v);

  autoTable(doc, {
    head: [cabecalhos],
    body: linhas.map((l) => l.map(corta)),
    startY: y,
    margin: { left: 40, right: 40, top: 40, bottom: 40 },
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      minCellWidth: 34,
      valign: "top",
      overflow: "linebreak",
      textColor: [35, 40, 52],
      lineColor: [225, 229, 236],
      lineWidth: 0.4,
    },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      const pagina = doc.getNumberOfPages();
      const altura = doc.internal.pageSize.getHeight();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...CINZA);
      doc.text("Prospectar360 · documento gerado automaticamente", 40, altura - 18);
      doc.text(`Página ${pagina}`, larguraPagina - 40, altura - 18, { align: "right" });
    },
  });

  doc.save(nomeArquivo("pdf"));
}
