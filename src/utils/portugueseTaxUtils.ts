/**
 * Portuguese Tax (Autoridade Tributária) and Invoice Helpers
 */

export const KNOWN_PORTUGUESE_NIFS: Record<string, string> = {
  '500742118': 'Ernes - Equipamentos de Climatização e Refrigeração',
  '500170068': 'Rexel Portugal',
  '501280387': 'Sanitop',
  '502931448': 'Pecomark Portugal',
  '502123546': 'Worten',
  '501524310': 'Leroy Merlin',
  '500147635': 'Würth Portugal',
  '503254920': 'Hilti Portugal',
  '501438968': 'Sonepar Portugal',
  '501725675': 'Electro Siluz',
  '500051042': 'Galp Energia',
  '500273762': 'Repsol',
  '502447937': 'Cepsa',
  '500164289': 'EDP Comercial',
  '503023243': 'Baxi Portugal',
  '500192894': 'Vulcano / Bosch Termotecnologia',
  '507439160': 'Daikin Airconditioning Portugal',
  '501314982': 'Mitsubishi Electric Europe',
  '506637375': 'Brico Depôt Portugal',
  '503004516': 'Maxmat',
  '500858167': 'Sanitana',
  '500192770': 'Cifial',
  '504100609': 'Giacomini Portugal',
  '505929283': 'Tece Portugal',
  '501869898': 'Roth Portugal',
  '502016251': 'Uponor Portugal',
};

export interface PortugueseAtQrData {
  rawQr?: string;
  storeName: string;
  taxId: string;
  invoiceNumber: string;
  date: string;
  subtotalWithoutTax: number;
  taxAmount: number;
  totalWithTax: number;
  ivaRate?: number;
}

/**
 * Parses standard Portuguese AT QR Code:
 * Format: A:500742118*B:999999990*C:PT*D:FT*E:N*F:20260210*G:FT 2026/1842*H:0*I1:PT*I7:3250.00*I8:747.50*N:747.50*O:3997.50*...
 */
export function parsePortugueseAtQr(qrText: string): PortugueseAtQrData | null {
  if (!qrText || (!qrText.includes('*A:') && !qrText.startsWith('A:'))) {
    return null;
  }

  const parts = qrText.split('*');
  const fields: Record<string, string> = {};

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const key = part.substring(0, colonIdx).trim();
      const val = part.substring(colonIdx + 1).trim();
      fields[key] = val;
    }
  }

  const taxId = (fields['A'] || '').replace(/^PT/i, '').trim();
  const storeName = KNOWN_PORTUGUESE_NIFS[taxId] || (taxId ? `Fornecedor NIF ${taxId}` : 'Loja / Fornecedor');

  let date = '';
  if (fields['F'] && fields['F'].length === 8) {
    const y = fields['F'].substring(0, 4);
    const m = fields['F'].substring(4, 6);
    const d = fields['F'].substring(6, 8);
    date = `${y}-${m}-${d}`;
  }

  const invoiceNumber = fields['G'] || (fields['D'] ? `${fields['D']} ${Date.now().toString().slice(-6)}` : '');

  // Base tributável (I7 or I2)
  const baseTributavel = parseFloat(fields['I7'] || fields['I2'] || '0') || 0;

  // Total IVA (N or I8 or I3)
  const totalIva = parseFloat(fields['N'] || fields['I8'] || fields['I3'] || '0') || 0;

  // Total da fatura (O)
  let totalWithTax = parseFloat(fields['O'] || '0') || 0;
  let subtotalWithoutTax =
    baseTributavel > 0
      ? baseTributavel
      : totalWithTax > 0
      ? Number((totalWithTax - totalIva).toFixed(2))
      : 0;

  if (totalWithTax <= 0 && subtotalWithoutTax > 0) {
    totalWithTax = Number((subtotalWithoutTax + totalIva).toFixed(2));
  }

  if (totalWithTax <= 0) return null;

  return {
    rawQr: qrText,
    storeName,
    taxId,
    invoiceNumber: invoiceNumber.trim(),
    date: date || new Date().toISOString().split('T')[0],
    subtotalWithoutTax: Number(subtotalWithoutTax.toFixed(2)),
    taxAmount: totalIva > 0 ? Number(totalIva.toFixed(2)) : Number(Math.max(0, totalWithTax - subtotalWithoutTax).toFixed(2)),
    totalWithTax: Number(totalWithTax.toFixed(2)),
    ivaRate: 23,
  };
}

/**
 * Calculates contractor profit and VAT breakdown according to Portuguese tax rules:
 * - VAT standard rate: 23%
 * - Client invoice contains 23% VAT (IVA Liquidado) which belongs to the Tax Authority (Estado)
 * - Expense invoices contain VAT (IVA Suportado / Dedutível) which the contractor deducts
 * - VAT Balance to Pay to Estado: IVA Liquidado - IVA Suportado
 * - Real Profit: Client Revenue (excl. VAT) - Real Expenses (excl. VAT)
 */
export function calculateObraFiscalProfit(params: {
  valorFaturadoClienteComIva: number;
  totalIvaFaturasGastos: number;
  totalGastosMateriaisSemIva: number;
  totalMaoDeObra: number;
  totalOutrasDespesasManuais: number;
  ivaRate?: number;
}) {
  const rate = params.ivaRate || 23;
  const multiplier = 1 + rate / 100;

  // 1. Cliente: Valor total c/ IVA -> Decompõe em Base Líquida e IVA Liquidado
  const totalCobradoCliente = Math.max(0, params.valorFaturadoClienteComIva || 0);
  const receitaLiquidaCliente = Number((totalCobradoCliente / multiplier).toFixed(2));
  const ivaLiquidadoCliente = Number((totalCobradoCliente - receitaLiquidaCliente).toFixed(2));

  // 2. Gastos com Faturas: IVA Suportado / Dedutível
  const ivaSuportadoGastos = Math.max(0, params.totalIvaFaturasGastos || 0);
  const materiaisSemIva = Math.max(0, params.totalGastosMateriaisSemIva || 0);

  // 3. Saldo Fiscal de IVA a Pagar ao Estado
  // (Se positivo: o empreiteiro entrega a diferença ao Estado; se negativo: fica em crédito de IVA)
  const ivaAPagarAoEstado = Number((ivaLiquidadoCliente - ivaSuportadoGastos).toFixed(2));

  // 4. Custos Reais da Obra para o Empreiteiro (sem IVA, pois o IVA dos materiais é recuperado)
  const maoDeObra = Math.max(0, params.totalMaoDeObra || 0);
  const outrasDespesas = Math.max(0, params.totalOutrasDespesasManuais || 0);
  const totalCustosReaisLiquidos = Number((materiaisSemIva + maoDeObra + outrasDespesas).toFixed(2));

  // 5. Lucro Líquido Real da Obra (O que realmente rendeu e fica na empresa/bolso do empreiteiro)
  // Receita Líquida (s/ IVA) - Custos Reais (s/ IVA)
  const lucroLiquidoReal = Number((receitaLiquidaCliente - totalCustosReaisLiquidos).toFixed(2));

  // Margem real percentual sobre a receita líquida
  const margemLucroRealPercent =
    receitaLiquidaCliente > 0
      ? Number(((lucroLiquidoReal / receitaLiquidaCliente) * 100).toFixed(1))
      : 0;

  // Poupança fiscal obtida graças às faturas anexadas (o IVA suportado abateu diretamente o imposto)
  const poupancaFiscalIva = Math.min(ivaLiquidadoCliente, ivaSuportadoGastos);

  return {
    totalCobradoCliente,
    receitaLiquidaCliente,
    ivaLiquidadoCliente,
    ivaSuportadoGastos,
    materiaisSemIva,
    maoDeObra,
    outrasDespesas,
    totalCustosReaisLiquidos,
    ivaAPagarAoEstado,
    lucroLiquidoReal,
    margemLucroRealPercent,
    poupancaFiscalIva,
    isIvaCredito: ivaAPagarAoEstado < 0,
  };
}

export interface ObraRubricRow {
  name: string;
  baseWithoutTax: number;
  taxAmount: number;
  totalWithTax: number;
  notes?: string;
}

export interface ObraOfficialFinancialReportData {
  obraName: string;
  obraId: string;
  clientName?: string;
  // 1. Faturação ao Cliente
  totalCobradoClienteComIva: number;
  receitaLiquidaBase: number;
  ivaLiquidadoCliente: number;
  // 2. Gastos da Obra
  materiaisEquipamentos: ObraRubricRow;
  acessoriosConsumiveis: ObraRubricRow;
  maoDeObraTecnico: ObraRubricRow;
  totalGastos: ObraRubricRow;
  // 3. Acerto de IVA com as Finanças
  ivaCobradoCliente: number;
  ivaDedutivelDespesas: number;
  ivaEfetivoDevolverEstado: number; // Positivo = Pagar, Negativo = Crédito
  // 4. Lucro Real da Obra
  margemLucroBase: number; // Base Receita - Base Despesas
  margemPercentual: number;
  saldoFinalEmCaixa: number; // Total Recebido - Total Pago Fornecedores - IVA entregue ao Estado
  isCoerenteTesouraria: boolean; // Confirmação que Saldo em Caixa == Margem de Lucro Base
}

/**
 * Categorizes an obra's real records into the 3 official Portuguese construction rubrics:
 * 1. Materiais / Equipamentos
 * 2. Acessórios / Consumíveis
 * 3. Mão de Obra / Técnico
 */
export function calculateObraOfficialReport(params: {
  obraName: string;
  obraId: string;
  clientName?: string;
  totalCobradoClienteComIva: number;
  invoices: Array<{
    category?: string;
    subtotalWithoutTax: number;
    taxAmount: number;
    totalWithTax: number;
    items?: Array<{
      category?: string;
      totalWithoutTax: number;
      totalWithTax: number;
      taxRate?: number;
    }>;
  }>;
  expenses: Array<{
    amount: number;
    category?: string;
  }>;
  labor: Array<{
    totalCost: number;
    hoursOrDays?: number;
    unitType?: string;
  }>;
}): ObraOfficialFinancialReportData {
  const { obraName, obraId, clientName, totalCobradoClienteComIva, invoices, expenses, labor } = params;

  // 1. Faturação ao Cliente (considerando IVA 23%)
  const totalCobrado = Math.max(0, Number(totalCobradoClienteComIva || 0));
  const receitaLiquidaBase = Number((totalCobrado / 1.23).toFixed(2));
  const ivaLiquidadoCliente = Number((totalCobrado - receitaLiquidaBase).toFixed(2));

  // 2. Classificação de Faturas e Linhas em Materiais vs Acessórios
  let matBase = 0;
  let matIva = 0;
  let matTotal = 0;

  let acessBase = 0;
  let acessIva = 0;
  let acessTotal = 0;

  const acessoriosKeywords = [
    'acessórios & fixação',
    'acessorios',
    'fixação',
    'ferramentas & equipamento',
    'ferramentas',
    'consumíveis',
    'consumiveis',
    'construção civil',
    'combustível',
    'refeições',
    'outros',
  ];

  invoices.forEach((inv) => {
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach((item) => {
        const cat = (item.category || '').toLowerCase();
        const base = Number(item.totalWithoutTax) || 0;
        const total = Number(item.totalWithTax) || base;
        const iva = Number((total - base).toFixed(2));

        const isAcessorio = acessoriosKeywords.some((kw) => cat.includes(kw));
        if (isAcessorio) {
          acessBase += base;
          acessIva += iva;
          acessTotal += total;
        } else {
          matBase += base;
          matIva += iva;
          matTotal += total;
        }
      });
    } else {
      const cat = (inv.category || '').toLowerCase();
      const base = Number(inv.subtotalWithoutTax) || 0;
      const total = Number(inv.totalWithTax) || 0;
      const iva = Number(inv.taxAmount) || Number((total - base).toFixed(2));

      const isAcessorio = acessoriosKeywords.some((kw) => cat.includes(kw));
      if (isAcessorio) {
        acessBase += base;
        acessIva += iva;
        acessTotal += total;
      } else {
        matBase += base;
        matIva += iva;
        matTotal += total;
      }
    }
  });

  // Despesas manuais sem fatura (recibos simples/dinheiro/MBWay: o custo é integralmente imputado à obra como custo real sem IVA dedutível)
  expenses.forEach((exp) => {
    const total = Number(exp.amount) || 0;
    acessBase += total;
    // Sem fatura oficial com NIF não há direito a dedução de IVA perante o Estado
    acessTotal += total;
  });

  // Mão de Obra / Técnico
  const moTotal = labor.reduce((acc, l) => acc + (Number(l.totalCost) || 0), 0);
  const moBase = moTotal;
  const moIva = 0; // Mão de obra própria / prestação direta s/ IVA dedutível

  // Arredondamentos rigorosos a 2 casas decimais
  const materiaisEquipamentos: ObraRubricRow = {
    name: 'Materiais / Equipamentos',
    baseWithoutTax: Number(matBase.toFixed(2)),
    taxAmount: Number(matIva.toFixed(2)),
    totalWithTax: Number(matTotal.toFixed(2)),
  };

  const acessoriosConsumiveis: ObraRubricRow = {
    name: 'Acessórios / Consumíveis',
    baseWithoutTax: Number(acessBase.toFixed(2)),
    taxAmount: Number(acessIva.toFixed(2)),
    totalWithTax: Number(acessTotal.toFixed(2)),
  };

  const maoDeObraTecnico: ObraRubricRow = {
    name: 'Mão de Obra / Técnico',
    baseWithoutTax: Number(moBase.toFixed(2)),
    taxAmount: Number(moIva.toFixed(2)),
    totalWithTax: Number(moTotal.toFixed(2)),
  };

  const totalGastosBase = Number(
    (materiaisEquipamentos.baseWithoutTax + acessoriosConsumiveis.baseWithoutTax + maoDeObraTecnico.baseWithoutTax).toFixed(2)
  );
  const totalGastosIva = Number(
    (materiaisEquipamentos.taxAmount + acessoriosConsumiveis.taxAmount + maoDeObraTecnico.taxAmount).toFixed(2)
  );
  const totalGastosComIva = Number(
    (materiaisEquipamentos.totalWithTax + acessoriosConsumiveis.totalWithTax + maoDeObraTecnico.totalWithTax).toFixed(2)
  );

  const totalGastos: ObraRubricRow = {
    name: 'TOTAL GASTOS',
    baseWithoutTax: totalGastosBase,
    taxAmount: totalGastosIva,
    totalWithTax: totalGastosComIva,
  };

  // 3. Acerto de IVA com as Finanças
  const ivaCobradoCliente = ivaLiquidadoCliente;
  const ivaDedutivelDespesas = totalGastosIva;
  const ivaEfetivoDevolverEstado = Number((ivaCobradoCliente - ivaDedutivelDespesas).toFixed(2));

  // 4. Lucro Real da Obra
  const margemLucroBase = Number((receitaLiquidaBase - totalGastosBase).toFixed(2));
  const margemPercentual =
    receitaLiquidaBase > 0 ? Number(((margemLucroBase / receitaLiquidaBase) * 100).toFixed(2)) : 0;

  // Verificação de Tesouraria:
  // Saldo em Caixa = Total Recebido Cliente (c/ IVA) - Total Pago Gastos (c/ IVA) - IVA entregue ao Estado
  // = totalCobrado - totalGastosComIva - ivaEfetivoDevolverEstado
  const saldoFinalEmCaixa = Number((totalCobrado - totalGastosComIva - ivaEfetivoDevolverEstado).toFixed(2));

  // Validação: O Saldo em Caixa DEVE ser rigorosamente idêntico ao Lucro Operacional da Obra
  const isCoerenteTesouraria = Math.abs(saldoFinalEmCaixa - margemLucroBase) <= 0.05;

  return {
    obraName,
    obraId,
    clientName,
    totalCobradoClienteComIva: totalCobrado,
    receitaLiquidaBase,
    ivaLiquidadoCliente,
    materiaisEquipamentos,
    acessoriosConsumiveis,
    maoDeObraTecnico,
    totalGastos,
    ivaCobradoCliente,
    ivaDedutivelDespesas,
    ivaEfetivoDevolverEstado,
    margemLucroBase,
    margemPercentual,
    saldoFinalEmCaixa,
    isCoerenteTesouraria,
  };
}

/**
 * Generates the EXACT official Markdown output format requested by the user.
 */
export function generateObraFinancialMarkdownReport(data: ObraOfficialFinancialReportData): string {
  const fmt = (num: number) => num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `## 📊 Relatório Financeiro da Obra: ${data.obraName}

### 1. Faturação ao Cliente
- **Total Cobrado ao Cliente (c/ IVA):** ${fmt(data.totalCobradoClienteComIva)} €
- **Receita Líquida (Base s/ IVA):** ${fmt(data.receitaLiquidaBase)} €
- **IVA Cobrado ao Cliente (Liquidado):** ${fmt(data.ivaLiquidadoCliente)} €

### 2. Gastos da Obra
| Rubrica / Fornecedor | Base (s/ IVA) | IVA | Total Gasto (c/ IVA) |
|---|---|---|---|
| Materiais / Equipamentos | ${fmt(data.materiaisEquipamentos.baseWithoutTax)} € | ${fmt(data.materiaisEquipamentos.taxAmount)} € | ${fmt(data.materiaisEquipamentos.totalWithTax)} € |
| Acessórios / Consumíveis | ${fmt(data.acessoriosConsumiveis.baseWithoutTax)} € | ${fmt(data.acessoriosConsumiveis.taxAmount)} € | ${fmt(data.acessoriosConsumiveis.totalWithTax)} € |
| Mão de Obra / Técnico | ${fmt(data.maoDeObraTecnico.baseWithoutTax)} € | ${fmt(data.maoDeObraTecnico.taxAmount)} € | ${fmt(data.maoDeObraTecnico.totalWithTax)} € |
| **TOTAL GASTOS** | **${fmt(data.totalGastos.baseWithoutTax)} €** | **${fmt(data.totalGastos.taxAmount)} €** | **${fmt(data.totalGastos.totalWithTax)} €** |

### 3. Acerto de IVA com as Finanças
- **IVA Cobrado ao Cliente:** ${fmt(data.ivaCobradoCliente)} €
- **IVA a Deduzir das Despesas:** -${fmt(data.ivaDedutivelDespesas)} €
- **👉 IVA Efetivo a Devolver ao Estado:** **${fmt(data.ivaEfetivoDevolverEstado)} €**

### 4. Lucro Real da Obra
- **Margem de Lucro (Base Receita - Base Despesas):** **${fmt(data.margemLucroBase)} €**
- **Margem Percentual:** ${data.margemPercentual.toFixed(2)}%
- **Valor Líquido que sobra na conta bancária (após pagar IVA e fornecedores):** **${fmt(data.saldoFinalEmCaixa)} €**

*Aviso: Este lucro reflete o fecho direto da obra e acerto de IVA. Não inclui eventuais estimativas de retenção na fonte ou apuramento final de IRS/IRC anual.*`;
}

/**
 * Free text and invoice assistant parser:
 * Parses user-provided financial text (e.g. "receita 12300 com iva, material 4500, acessorios 600, mao de obra 1800")
 * and extracts values to generate the exact required report.
 */
export function parseFreeTextToFinancialReport(text: string, fallbackObraName = 'Obra Analisada'): ObraOfficialFinancialReportData {
  let receitaComIva = 0;
  let matComIva = 0;
  let acessComIva = 0;
  let maoDeObra = 0;

  // Patterns for client revenue
  const recMatch = text.match(/(?:receita|cliente|cobrado|faturado|orçamento|total\s+obra|venda)[:=\s]+([0-9.,]+)/i);
  if (recMatch) {
    receitaComIva = parseFloat(recMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Patterns for materials/equipment
  const matMatch = text.match(/(?:materiais?|equipamentos?|equipamento|máquinas?)[:=\s]+([0-9.,]+)/i);
  if (matMatch) {
    matComIva = parseFloat(matMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Patterns for accessories/consumables
  const acessMatch = text.match(/(?:acess[oó]rios?|consum[ií]veis?|ferramentas?)[:=\s]+([0-9.,]+)/i);
  if (acessMatch) {
    acessComIva = parseFloat(acessMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Patterns for labor
  const moMatch = text.match(/(?:m[aã]o\s+de\s+obra|t[eé]cnicos?|trabalhadores?|mão-de-obra)[:=\s]+([0-9.,]+)/i);
  if (moMatch) {
    maoDeObra = parseFloat(moMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
  }

  // If numbers weren't caught by keyword, extract any comma-separated or list of numbers
  if (receitaComIva === 0) {
    const allNumbers = text.match(/\b\d+([.,]\d+)?\b/g);
    if (allNumbers && allNumbers.length >= 1) {
      receitaComIva = parseFloat(allNumbers[0].replace(',', '.')) || 0;
      if (allNumbers.length >= 2) matComIva = parseFloat(allNumbers[1].replace(',', '.')) || 0;
      if (allNumbers.length >= 3) acessComIva = parseFloat(allNumbers[2].replace(',', '.')) || 0;
      if (allNumbers.length >= 4) maoDeObra = parseFloat(allNumbers[3].replace(',', '.')) || 0;
    }
  }

  const matBase = Number((matComIva / 1.23).toFixed(2));
  const matIva = Number((matComIva - matBase).toFixed(2));

  const acessBase = Number((acessComIva / 1.23).toFixed(2));
  const acessIva = Number((acessComIva - acessBase).toFixed(2));

  return calculateObraOfficialReport({
    obraName: fallbackObraName,
    obraId: 'simulacao',
    totalCobradoClienteComIva: receitaComIva,
    invoices: [
      {
        category: 'Máquinas & Equipamentos',
        subtotalWithoutTax: matBase,
        taxAmount: matIva,
        totalWithTax: matComIva,
      },
    ],
    expenses: [
      {
        amount: acessComIva,
        category: 'Acessórios & Fixação',
      },
    ],
    labor: [
      {
        totalCost: maoDeObra,
      },
    ],
  });
}

