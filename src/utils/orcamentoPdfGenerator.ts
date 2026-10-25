import { jsPDF } from 'jspdf';
import { Orcamento } from '../types';

/**
 * Loads an image from URL and returns a base64 Data URL
 */
export async function getLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/enat-logo.png?v=4');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Formats a number as European Euro currency (e.g. 1.250,00 €)
 */
function formatEuro(val: number): string {
  return (
    (val || 0).toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  );
}

/**
 * Generates an executive, formal commercial proposal PDF for Enat Energias
 * Meets exact user requirements:
 * 1. App logo on top left
 * 2. "Orçamento nº X" on top right with date
 * 3. Title: "Orçamento para: [selected options]"
 * 4. Materials and equipment list (WITHOUT unit or line prices!)
 * 5. Installation / labor specification (WITHOUT individual prices!)
 * 6. Financial summary like TOC Online (small subtotal s/IVA, tax breakdown, BIG total c/IVA)
 * 7. Standard legal & warranty terms: 15 days validity, delivery to agree, 50% payment on adjudication,
 *    work in charge of Enat Energias, 2 years installation warranty, equipment warranty per technical sheet
 * 8. Sign-off: "Ponte de Lima, [Date]" & "Responsável comercial: João Lima"
 */
export async function generateOrcamentoPDF(orcamento: Orcamento): Promise<jsPDF> {
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

  // Enat Brand Colors
  const primaryNavy: [number, number, number] = [15, 34, 64]; // #0F2240
  const emeraldGreen: [number, number, number] = [16, 185, 129]; // #10B981
  const blueAccent: [number, number, number] = [37, 99, 235]; // #2563EB
  const textDark: [number, number, number] = [20, 24, 33];
  const textMuted: [number, number, number] = [90, 100, 115];
  const bgSoft: [number, number, number] = [247, 249, 252];
  const borderLight: [number, number, number] = [226, 232, 240];

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      currentY = margin;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Enat Energias • Proposta Comercial', margin, currentY);
    doc.text(orcamento.number || 'Orçamento', pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
    doc.setDrawColor(...borderLight);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
  };

  // Try to load logo image
  const logoData = await getLogoBase64();
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, currentY, 40, 14, undefined, 'FAST');
    } catch {
      drawTextLogo();
    }
  } else {
    drawTextLogo();
  }

  function drawTextLogo() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...emeraldGreen);
    doc.text('ENAT', margin, currentY + 8);
    doc.setFontSize(10);
    doc.setTextColor(...primaryNavy);
    doc.text('ENERGIAS', margin + 22, currentY + 8);
  }

  // Top Right: Orçamento nº X & Metadata Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryNavy);
  doc.text(`ORÇAMENTO Nº ${orcamento.number || 'ORÇ-2026/001'}`, pageWidth - margin, currentY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  const formattedDate = orcamento.date
    ? new Date(orcamento.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Data de Emissão: ${formattedDate}`, pageWidth - margin, currentY + 9, { align: 'right' });
  doc.text(`Validade: ${orcamento.validityDays || 15} dias`, pageWidth - margin, currentY + 13, { align: 'right' });

  currentY += 22;

  // Thin separator line
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Company and Client info cards side-by-side
  const colWidth = (contentWidth - 6) / 2;

  // Company Box (Left)
  doc.setFillColor(...bgSoft);
  doc.roundedRect(margin, currentY, colWidth, 34, 2, 2, 'F');
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, currentY, colWidth, 34, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryNavy);
  doc.text('ENAT ENERGIAS', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('Climatização, Energias Renováveis & Instalações Técnicas', margin + 4, currentY + 11);
  doc.text('Localidade: Ponte de Lima - Portugal', margin + 4, currentY + 16);
  doc.text('Contacto: info@enat.pt / 910 000 000', margin + 4, currentY + 21);
  doc.text(`Responsável Comercial: ${orcamento.commercialResponsible || 'João Lima'}`, margin + 4, currentY + 26);
  doc.text(`Obra e Execução a cargo de: ${orcamento.workInChargeOf || 'Enat Energias'}`, margin + 4, currentY + 31);

  // Client Box (Right)
  const clientX = margin + colWidth + 6;
  doc.setFillColor(...bgSoft);
  doc.roundedRect(clientX, currentY, colWidth, 34, 2, 2, 'F');
  doc.setDrawColor(...borderLight);
  doc.roundedRect(clientX, currentY, colWidth, 34, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryNavy);
  doc.text('DADOS DO CLIENTE', clientX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  const clientName = orcamento.client.name ? orcamento.client.name.trim() : 'Exmo.(a) Sr.(a) Cliente';
  doc.setFont('helvetica', 'bold');
  doc.text(clientName, clientX + 4, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  const clientAddr = orcamento.client.address ? orcamento.client.address.trim() : 'Morada da Obra: A indicar pelo cliente';
  doc.text(clientAddr, clientX + 4, currentY + 16, { maxWidth: colWidth - 8 });

  const clientContact = orcamento.client.contact ? `Contacto: ${orcamento.client.contact.trim()}` : 'Contacto: Conforme registo';
  doc.text(clientContact, clientX + 4, currentY + 24);

  const clientNif = orcamento.client.nif ? `NIF: ${orcamento.client.nif.trim()}` : 'NIF: Consumidor Final';
  doc.text(clientNif, clientX + 4, currentY + 29);

  currentY += 40;

  // Title Box: "Orçamento para: ..."
  doc.setFillColor(...primaryNavy);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  const orcamentoTitle = orcamento.title || 'Orçamento para: Fornecimento e Instalação de Equipamentos';
  doc.text(orcamentoTitle.toUpperCase(), margin + 5, currentY + 7.5, { maxWidth: contentWidth - 10 });

  currentY += 16;

  // Intro text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text(
    'Apresentamos a nossa melhor proposta comercial e técnica para o fornecimento e instalação das soluções abaixo discriminadas:',
    margin,
    currentY
  );
  currentY += 6;

  // Section 1: Materials & Equipment Table (WITHOUT PRICES PER USER INSTRUCTION)
  // Header row
  doc.setFillColor(...bgSoft);
  doc.setDrawColor(...borderLight);
  doc.rect(margin, currentY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryNavy);
  doc.text('#', margin + 3, currentY + 4.8);
  doc.text('DESCRIÇÃO DOS EQUIPAMENTOS, MATERIAIS E COMPONENTES', margin + 12, currentY + 4.8);
  doc.text('QUANTIDADE', pageWidth - margin - 22, currentY + 4.8, { align: 'right' });
  doc.text('UNIDADE', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });

  currentY += 7;

  if (!orcamento.items || orcamento.items.length === 0) {
    doc.rect(margin, currentY, contentWidth, 8, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Equipamentos e materiais especificados conforme solução técnica a definir.', margin + 4, currentY + 5);
    currentY += 8;
  } else {
    orcamento.items.forEach((item, index) => {
      checkPageBreak(12);

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(252, 253, 254);
        doc.rect(margin, currentY, contentWidth, 8, 'F');
      }

      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text(String(index + 1), margin + 3, currentY + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textDark);
      const nameText = item.name || 'Equipamento / Material';
      doc.text(nameText, margin + 12, currentY + 5, { maxWidth: contentWidth - 45 });

      // Quantity & unit on the right
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.quantity || 1), pageWidth - margin - 22, currentY + 5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text(item.unit || 'un', pageWidth - margin - 4, currentY + 5, { align: 'right' });

      currentY += 8;
    });
  }

  currentY += 4;

  // Section 2: Labor & Installation Works
  checkPageBreak(25);
  doc.setFillColor(...bgSoft);
  doc.setDrawColor(...borderLight);
  doc.rect(margin, currentY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryNavy);
  doc.text('TRABALHOS DE MONTAGEM, MÃO DE OBRA & COMISSIONAMENTO', margin + 4, currentY + 4.8);
  doc.text('ESTADO', pageWidth - margin - 4, currentY + 4.8, { align: 'right' });

  currentY += 7;

  const defaultLaborList =
    orcamento.laborItems && orcamento.laborItems.length > 0
      ? orcamento.laborItems
      : [
          {
            id: 'l1',
            description:
              'Mão de obra especializada de montagem mecânica, ligações frigoríficas e elétricas.',
            quantity: 1,
            unit: 'serviço',
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            id: 'l2',
            description:
              'Ensaios de estanquicidade, vácuo com vacuómetro digital, teste de drenagem e comissionamento.',
            quantity: 1,
            unit: 'serviço',
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            id: 'l3',
            description:
              'Parametrização de controlos, arranque dos sistemas e formação do utilizador.',
            quantity: 1,
            unit: 'serviço',
            unitPrice: 0,
            totalPrice: 0,
          },
        ];

  defaultLaborList.forEach((labor) => {
    checkPageBreak(8);
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textDark);
    doc.text(`• ${labor.description}`, margin + 4, currentY + 4.5, { maxWidth: contentWidth - 30 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...emeraldGreen);
    doc.text('INCLUÍDO', pageWidth - margin - 4, currentY + 4.5, { align: 'right' });

    currentY += 7;
  });

  currentY += 6;

  // Section 3: Financial Summary Box (Style TOC Online / Accounting Software)
  checkPageBreak(38);

  const summaryWidth = 92;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(...bgSoft);
  doc.roundedRect(summaryX, currentY, summaryWidth, 34, 2, 2, 'F');
  doc.setDrawColor(...borderLight);
  doc.roundedRect(summaryX, currentY, summaryWidth, 34, 2, 2, 'S');

  // Subtotal sem IVA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text('Total Ilíquido (s/ IVA):', summaryX + 4, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(formatEuro(orcamento.subtotalWithoutTax), summaryX + summaryWidth - 4, currentY + 6, { align: 'right' });

  // Linha IVA
  const taxRatePercent = orcamento.taxRate !== undefined ? orcamento.taxRate : 23;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Incidência de IVA (${taxRatePercent}%):`, summaryX + 4, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(formatEuro(orcamento.taxAmount), summaryX + summaryWidth - 4, currentY + 12, { align: 'right' });

  // Divisória no resumo
  doc.setDrawColor(...emeraldGreen);
  doc.setLineWidth(0.5);
  doc.line(summaryX + 4, currentY + 16, summaryX + summaryWidth - 4, currentY + 16);

  // TOTAL COM IVA (MAIOR E DESTACADO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryNavy);
  doc.text('VALOR TOTAL (c/ IVA):', summaryX + 4, currentY + 23);

  doc.setFontSize(14);
  doc.setTextColor(...emeraldGreen);
  doc.text(formatEuro(orcamento.totalWithTax), summaryX + summaryWidth - 4, currentY + 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text('Imposto sobre o Valor Acrescentado incluído à taxa legal.', summaryX + 4, currentY + 30);

  currentY += 38;

  // Section 4: Condições Gerais & Observações
  checkPageBreak(50);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, currentY, contentWidth, 44, 2, 2, 'S');

  doc.setFillColor(...bgSoft);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryNavy);
  doc.text('CONDIÇÕES COMERCIAIS & GARANTIAS', margin + 4, currentY + 4.2);

  let condY = currentY + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);

  const bulletItems = [
    `Validade da Proposta: Válido por ${orcamento.validityDays || 15} dias a contar da data de emissão.`,
    `Prazo de Entrega e Execução: ${orcamento.deliveryTerm || 'A combinar com o cliente mediante disponibilidade de agenda.'}`,
    `Condições de Pagamento: ${orcamento.paymentConditions || '50% na adjudicação, 40% na entrega dos equipamentos / início dos trabalhos, 10% no final após testes.'}`,
    `Obra a Cargo de: ${orcamento.workInChargeOf || 'Enat Energias'}.`,
    `Garantia da Instalação: ${orcamento.installationWarranty || '2 anos sobre a mão de obra especializada.'}`,
    `Garantia dos Equipamentos: ${orcamento.equipmentWarranty || 'Conforme ficha técnica do fabricante (2 a 5 anos).'}.`,
  ];

  bulletItems.forEach((bullet) => {
    doc.text(`• ${bullet}`, margin + 4, condY);
    condY += 4.5;
  });

  // Additional custom notes if present
  if (orcamento.notes && orcamento.notes.trim()) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textMuted);
    doc.text(`Nota adicional: ${orcamento.notes.trim()}`, margin + 4, condY, { maxWidth: contentWidth - 8 });
  }

  currentY += 48;

  // Section 5: Sign-off & Footer
  checkPageBreak(25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  const locDate = `${orcamento.location || 'Ponte de Lima'}, ${formattedDate}`;
  doc.text(locDate, margin, currentY);

  currentY += 8;

  // Commercial Representative Sign Block (Right)
  const signX = pageWidth - margin - 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryNavy);
  doc.text('ENAT ENERGIAS', signX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`Responsável Comercial: ${orcamento.commercialResponsible || 'João Lima'}`, signX, currentY + 4.5);

  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.line(signX, currentY + 14, signX + 65, currentY + 14);

  doc.setFontSize(7);
  doc.text('Assinatura / Carimbo', signX + 20, currentY + 18);

  return doc;
}

/**
 * Downloads the generated PDF directly in the browser
 */
export async function downloadOrcamentoPDF(orcamento: Orcamento): Promise<void> {
  const doc = await generateOrcamentoPDF(orcamento);
  const cleanNumber = (orcamento.number || 'Orcamento').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanClient = (orcamento.client?.name || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
  const filename = `Orcamento_ENAT_${cleanNumber}_${cleanClient}.pdf`;
  doc.save(filename);
}
