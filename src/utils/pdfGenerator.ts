import { jsPDF } from 'jspdf';
import { Obra, Invoice, LaborRecord, ManualExpense, ClientPayment } from '../types';
import { ObraFinancialSummary } from './obraAnalytics';

/**
 * Generates an executive iOS-styled PDF financial report for an Obra
 */
export function generateObraPDFReport(
  obra: Obra,
  finances: ObraFinancialSummary,
  invoices: Invoice[],
  labor: LaborRecord[],
  expenses: ManualExpense[],
  payments: ClientPayment[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Colors
  const darkBg: [number, number, number] = [18, 18, 22];
  const primaryBlue: [number, number, number] = [37, 99, 235];
  const emeraldGreen: [number, number, number] = [16, 185, 129];
  const roseRed: [number, number, number] = [239, 68, 68];
  const slateCard: [number, number, number] = [248, 250, 252];
  const slateCardBorder: [number, number, number] = [226, 232, 240];
  const textDark: [number, number, number] = [15, 23, 42];
  const textMuted: [number, number, number] = [100, 116, 139];

  const formatCurrency = (val: number) => {
    return (
      (val || 0).toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' €'
    );
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = margin;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Enat app • Relatório Financeiro de Obra', margin, currentY);
    doc.text(obra.name, pageWidth - margin, currentY, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 7;
  };

  // ================= 1. HEADER & HERO BLOCK =================
  // Top brand bar
  doc.setFillColor(...darkBg);
  doc.roundedRect(margin, currentY, contentWidth, 38, 4, 4, 'F');

  // App Logo / Name Badge
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(margin + 5, currentY + 5, 22, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ENAT APP', margin + 7.5, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('RELATÓRIO FINANCEIRO & EXECUTIVO DE OBRA', margin + 30, currentY + 9.5);

  // Status Badge on the right
  const isFinished = obra.status === 'concluida';
  if (isFinished) {
    doc.setFillColor(...emeraldGreen);
  } else {
    doc.setFillColor(...primaryBlue);
  }
  const statusLabel = isFinished ? 'OBRA CONCLUÍDA' : 'OBRA EM CURSO';
  doc.roundedRect(pageWidth - margin - 35, currentY + 5, 30, 6.5, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pageWidth - margin - 20, currentY + 9.5, { align: 'center' });

  // Obra Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  // Truncate title if too long
  const maxTitleWidth = contentWidth - 10;
  const splitTitle = doc.splitTextToSize(obra.name, maxTitleWidth);
  doc.text(splitTitle[0] || obra.name, margin + 5, currentY + 20);

  // Subtitle info: Cliente, Morada, Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const infoText = `Cliente: ${obra.client || 'Particular'}  •  Local: ${obra.address || 'Portugal'}  •  Início: ${obra.startDate || 'N/A'}`;
  doc.text(infoText, margin + 5, currentY + 28);

  const dateStr = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emitido em: ${dateStr}`, margin + 5, currentY + 34);

  currentY += 44;

  // ================= 2. PRINCIPAIS KPIS FINANCEIROS (CARTOES ESTILO IOS) =================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text('Resumo Financeiro & Rentabilidade Global', margin, currentY);
  currentY += 4;

  const kpiCardWidth = (contentWidth - 9) / 4;
  const kpiCardHeight = 25;

  const totalOrcadoCategorias = (finances.topicFinances || []).reduce((acc, t) => acc + (t.budget || 0), 0);
  const orcamentoRef = totalOrcadoCategorias > 0 ? totalOrcadoCategorias : finances.budget;

  const kpis = [
    {
      title: 'ORÇAMENTO GLOBAL',
      value: formatCurrency(orcamentoRef),
      sub: `${finances.percentOrcamentoGasto}% consumido`,
      color: textDark,
    },
    {
      title: 'TOTAL REAL GASTO',
      value: formatCurrency(finances.totalGastoObra),
      sub: 'Materiais + Mão de Obra',
      color: primaryBlue,
    },
    {
      title: isFinished ? 'LUCRO FINAL' : 'LUCRO PREVISTO',
      value: (finances.lucroTotalObra >= 0 ? '+' : '') + formatCurrency(finances.lucroTotalObra),
      sub: `${finances.margemPercentualPrevista}% de margem`,
      color: finances.lucroTotalObra >= 0 ? emeraldGreen : roseRed,
      highlight: true,
    },
    {
      title: 'TOTAL COBRADO',
      value: formatCurrency(finances.totalRecebidoCliente),
      sub: `Pendente: ${formatCurrency(finances.saldoAReceber)}`,
      color: textDark,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (kpiCardWidth + 3);
    doc.setFillColor(...slateCard);
    doc.setDrawColor(...slateCardBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, currentY, kpiCardWidth, kpiCardHeight, 3, 3, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.title, cardX + 3.5, currentY + 5.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, cardX + 3.5, currentY + 14);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, cardX + 3.5, currentY + 20.5);
  });

  currentY += kpiCardHeight + 7;

  // ================= 3. DECOMPOSIÇÃO DE CUSTOS POR TÓPICO / CATEGORIA TÉCNICA =================
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text('Análise por Especialidade Técnica (VMC, Bombas de Calor, AC, UPAC, etc.)', margin, currentY);
  currentY += 4.5;

  // Table Header
  const colWidths = [52, 28, 28, 28, 30, 16];
  const colHeaders = ['ESPECIALIDADE / TÓPICO', 'ORÇADO', 'GASTO', 'SALDO', 'LUCRO ESTIMADO', 'MARGEM'];

  doc.setFillColor(...darkBg);
  doc.roundedRect(margin, currentY, contentWidth, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  colHeaders.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'right';
    const textX = i === 0 ? curX + 3 : curX + colWidths[i] - 2;
    doc.text(h, textX, currentY + 4.8, { align });
    curX += colWidths[i];
  });

  currentY += 8;

  // Table Rows for Topics
  const topicFinances = finances.topicFinances || [];
  let sumBudgets = 0;
  let sumGastos = 0;

  topicFinances.forEach((item, rIdx) => {
    checkPageBreak(8);

    sumBudgets += item.budget || 0;
    sumGastos += item.totalGasto || 0;

    const remaining = (item.budget || 0) - (item.totalGasto || 0);
    const profit = item.lucro !== undefined ? item.lucro : (item.budget || 0) - (item.totalGasto || 0);
    const profitPercent = item.margemPercent !== undefined ? item.margemPercent : (item.budget > 0 ? Number(((profit / item.budget) * 100).toFixed(1)) : 0);

    const rowBg: [number, number, number] = rIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...rowBg);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 7, margin + contentWidth, currentY + 7);

    curX = margin;

    // Col 0: Topic Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...textDark);
    doc.text(item.topic, curX + 3, currentY + 4.8);
    curX += colWidths[0];

    // Col 1: Budget
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(formatCurrency(item.budget), curX + colWidths[1] - 2, currentY + 4.8, { align: 'right' });
    curX += colWidths[1];

    // Col 2: Gasto
    doc.text(formatCurrency(item.totalGasto), curX + colWidths[2] - 2, currentY + 4.8, { align: 'right' });
    curX += colWidths[2];

    // Col 3: Saldo
    const remainingColor = remaining >= 0 ? textDark : roseRed;
    doc.setTextColor(...remainingColor);
    doc.text(formatCurrency(remaining), curX + colWidths[3] - 2, currentY + 4.8, { align: 'right' });
    curX += colWidths[3];

    // Col 4: Lucro
    const profitColor = profit >= 0 ? emeraldGreen : roseRed;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...profitColor);
    doc.text(
      (profit >= 0 ? '+' : '') + formatCurrency(profit),
      curX + colWidths[4] - 2,
      currentY + 4.8,
      { align: 'right' }
    );
    curX += colWidths[4];

    // Col 5: Margem %
    doc.text(`${profitPercent}%`, curX + colWidths[5] - 2, currentY + 4.8, { align: 'right' });

    currentY += 7.2;
  });

  // Table Totals / Somatório de Todas as Categorias
  const sumLucro = sumBudgets - sumGastos;
  const sumMargem = sumBudgets > 0 ? Number(((sumLucro / sumBudgets) * 100).toFixed(1)) : 0;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setDrawColor(...slateCardBorder);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  doc.line(margin, currentY + 8, margin + contentWidth, currentY + 8);

  curX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('TOTAL CATEGORIAS SOMADAS', curX + 3, currentY + 5.3);
  curX += colWidths[0];

  doc.text(formatCurrency(sumBudgets), curX + colWidths[1] - 2, currentY + 5.3, { align: 'right' });
  curX += colWidths[1];

  doc.text(formatCurrency(sumGastos), curX + colWidths[2] - 2, currentY + 5.3, { align: 'right' });
  curX += colWidths[2];

  doc.text(formatCurrency(sumBudgets - sumGastos), curX + colWidths[3] - 2, currentY + 5.3, { align: 'right' });
  curX += colWidths[3];

  doc.setTextColor(...(sumLucro >= 0 ? emeraldGreen : roseRed));
  doc.text(
    (sumLucro >= 0 ? '+' : '') + formatCurrency(sumLucro),
    curX + colWidths[4] - 2,
    currentY + 5.3,
    { align: 'right' }
  );
  curX += colWidths[4];

  doc.text(`${sumMargem}%`, curX + colWidths[5] - 2, currentY + 5.3, { align: 'right' });

  currentY += 13;

  // ================= 4. RESUMO DE FATURAS DE MATERIAIS =================
  checkPageBreak(40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text(`Faturas de Materiais Registadas (${invoices.length})`, margin, currentY);
  currentY += 4.5;

  if (invoices.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text('Nenhuma fatura de fornecedor associada a esta obra até ao momento.', margin, currentY + 3);
    currentY += 10;
  } else {
    // Invoice Table Header
    const invColWidths = [50, 32, 24, 38, 22, 26];
    const invHeaders = ['FORNECEDOR / LOJA', 'Nº FATURA', 'DATA', 'TÓPICO / SISTEMA', 'IVA', 'TOTAL C/ IVA'];

    doc.setFillColor(...darkBg);
    doc.roundedRect(margin, currentY, contentWidth, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let iCurX = margin;
    invHeaders.forEach((h, i) => {
      const align = i === 0 || i === 1 || i === 3 ? 'left' : 'right';
      const textX = align === 'left' ? iCurX + 2.5 : iCurX + invColWidths[i] - 2;
      doc.text(h, textX, currentY + 4.8, { align });
      iCurX += invColWidths[i];
    });

    currentY += 8;

    // Show up to 25 most recent invoices to keep document crisp and structured
    const displayedInvoices = invoices.slice(0, 30);

    displayedInvoices.forEach((inv, idx) => {
      checkPageBreak(7.5);

      const rowBg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...rowBg);
      doc.rect(margin, currentY, contentWidth, 6.5, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY + 6.5, margin + contentWidth, currentY + 6.5);

      iCurX = margin;

      // Fornecedor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);
      doc.text((inv.storeName || 'Fornecedor').substring(0, 26), iCurX + 2.5, currentY + 4.5);
      iCurX += invColWidths[0];

      // Nº Fatura
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text((inv.invoiceNumber || 'S/N').substring(0, 16), iCurX + 2, currentY + 4.5);
      iCurX += invColWidths[1];

      // Data
      doc.text(inv.date || '-', iCurX + invColWidths[2] - 2, currentY + 4.5, { align: 'right' });
      iCurX += invColWidths[2];

      // Tópico
      doc.text((inv.topic || 'Geral / Outros').substring(0, 20), iCurX + 2, currentY + 4.5);
      iCurX += invColWidths[3];

      // IVA
      doc.text(formatCurrency(inv.taxAmount), iCurX + invColWidths[4] - 2, currentY + 4.5, { align: 'right' });
      iCurX += invColWidths[4];

      // Total com IVA
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textDark);
      doc.text(formatCurrency(inv.totalWithTax), iCurX + invColWidths[5] - 2, currentY + 4.5, { align: 'right' });

      currentY += 6.5;
    });

    if (invoices.length > displayedInvoices.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...textMuted);
      doc.text(`... e mais ${invoices.length - displayedInvoices.length} faturas registadas no arquivo digital.`, margin + 2, currentY + 4);
      currentY += 6;
    }

    currentY += 6;
  }

  // ================= 5. MÃO DE OBRA & DESPESAS (SE HOUVER) =================
  if (labor.length > 0 || expenses.length > 0) {
    checkPageBreak(35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...textDark);
    doc.text('Registo de Mão de Obra e Despesas Diretas', margin, currentY);
    currentY += 4.5;

    // Split in two cards if both exist
    const subCardWidth = labor.length > 0 && expenses.length > 0 ? (contentWidth - 4) / 2 : contentWidth;

    if (labor.length > 0) {
      doc.setFillColor(...slateCard);
      doc.setDrawColor(...slateCardBorder);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, subCardWidth, 22, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);
      doc.text(`MÃO DE OBRA (${labor.length} registos)`, margin + 4, currentY + 6);

      const totalHoras = labor.reduce((acc, l) => acc + (l.unitType === 'horas' ? l.hoursOrDays : l.hoursOrDays * 8), 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...textMuted);
      doc.text(`Horas equivalentes: ~${totalHoras.toFixed(1)}h`, margin + 4, currentY + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryBlue);
      doc.text(`Total: ${formatCurrency(finances.totalMaoDeObra)}`, margin + 4, currentY + 18);
    }

    if (expenses.length > 0) {
      const expX = labor.length > 0 ? margin + subCardWidth + 4 : margin;
      doc.setFillColor(...slateCard);
      doc.setDrawColor(...slateCardBorder);
      doc.setLineWidth(0.3);
      doc.roundedRect(expX, currentY, subCardWidth, 22, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);
      doc.text(`DESPESAS SEM FATURA (${expenses.length} registos)`, expX + 4, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...textMuted);
      doc.text('Pequenos consumíveis, combustível ou refeições', expX + 4, currentY + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryBlue);
      doc.text(`Total: ${formatCurrency(finances.totalDespesasManuais)}`, expX + 4, currentY + 18);
    }

    currentY += 28;
  }

  // ================= 6. NOTAS FINAIS & ASSINATURA =================
  checkPageBreak(25);
  doc.setFillColor(...slateCard);
  doc.setDrawColor(...slateCardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 20, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  doc.text('VALIDAÇÃO & CONTROLO DE GESTÃO', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textMuted);
  const disclaimer = `Este documento foi gerado automaticamente pela aplicação Enat app e consolida os dados de faturas fiscais, registos de trabalho e orçamentos da obra.
Relatório emitido para fins de controlo financeiro, auditoria e apuramento de lucro por especialidade técnica.`;
  doc.text(disclaimer, margin + 4, currentY + 11);

  // Footer for each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(
      `Enat app • Gestão Integrada de Obras e AVAC  •  Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}
