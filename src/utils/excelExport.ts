import * as XLSX from 'xlsx';
import { Invoice, LaborRecord, Obra, ManualExpense, ClientPayment } from '../types';

export interface FormattedRow {
  Obra: string;
  Data: string;
  'Nº Fatura': string;
  'Loja / Fornecedor': string;
  'Produto / Item': string;
  'Categoria': string;
  'Qtd': number;
  'Unidade': string;
  'Preço Tabela (s/IVA) €': number;
  'Desconto %': number;
  'Taxa IVA %': number;
  'Preço Pago (s/IVA) €': number;
  'Preço Pago (c/IVA) €': number;
  'Total (s/IVA) €': number;
  'Total (c/IVA) €': number;
}

export function buildSyncDataPayload(
  obras: Obra[],
  invoices: Invoice[],
  labor: LaborRecord[],
  manualExpenses: ManualExpense[] = [],
  clientPayments: ClientPayment[] = []
) {
  const obraMap = new Map<string, string>();
  obras.forEach((o) => obraMap.set(o.id, o.name));

  const allMaterialRows: FormattedRow[] = [];
  const refrigRows: FormattedRow[] = [];
  const eletricRows: FormattedRow[] = [];
  const acessoriosRows: FormattedRow[] = [];
  const outrosRows: FormattedRow[] = [];

  invoices.forEach((inv) => {
    const obraNome = obraMap.get(inv.obraId) || 'Não associada';
    inv.items.forEach((item) => {
      const row: FormattedRow = {
        Obra: obraNome,
        Data: inv.date,
        'Nº Fatura': inv.invoiceNumber,
        'Loja / Fornecedor': inv.storeName,
        'Produto / Item': item.name,
        Categoria: item.category,
        Qtd: item.quantity,
        Unidade: item.unit,
        'Preço Tabela (s/IVA) €': Number((item.listPriceWithoutTax || item.unitPriceWithoutTax).toFixed(2)),
        'Desconto %': Number((item.discountPercent || 0).toFixed(1)),
        'Taxa IVA %': typeof item.taxRate === 'number' ? item.taxRate : 23,
        'Preço Pago (s/IVA) €': Number(item.unitPriceWithoutTax.toFixed(2)),
        'Preço Pago (c/IVA) €': Number(item.unitPriceWithTax.toFixed(2)),
        'Total (s/IVA) €': Number(item.totalWithoutTax.toFixed(2)),
        'Total (c/IVA) €': Number(item.totalWithTax.toFixed(2)),
      };

      allMaterialRows.push(row);

      const catLower = (item.category || '').toLowerCase();
      if (catLower.includes('refrigeração') || catLower.includes('refrigeracao')) {
        refrigRows.push(row);
      } else if (catLower.includes('elétrico') || catLower.includes('eletrico')) {
        eletricRows.push(row);
      } else if (catLower.includes('acessórios') || catLower.includes('acessorios')) {
        acessoriosRows.push(row);
      } else {
        outrosRows.push(row);
      }
    });
  });

  const laborRows = labor.map((l) => ({
    Obra: obraMap.get(l.obraId) || 'Não associada',
    Data: l.date,
    'Trabalhador / Função': l.workerName,
    Descrição: l.description,
    'Qtd Tempo': l.hoursOrDays,
    'Unidade Tempo': l.unitType,
    'Valor Unitário (€)': Number(l.costRate.toFixed(2)),
    'Total Mão de Obra (€)': Number(l.totalCost.toFixed(2)),
  }));

  const expenseRows = manualExpenses.map((e) => ({
    Obra: obraMap.get(e.obraId) || 'Não associada',
    Data: e.date,
    Descrição: e.description,
    Categoria: e.category,
    'Fornecedor / Local': e.supplierOrPlace || '-',
    'Método Pagamento': e.paymentMethod,
    'Valor (€)': Number(e.amount.toFixed(2)),
    Notas: e.notes || '-',
  }));

  const paymentRows = clientPayments.map((p) => ({
    Obra: obraMap.get(p.obraId) || 'Não associada',
    Data: p.date,
    Descrição: p.description,
    'Valor Recebido (€)': Number(p.amount.toFixed(2)),
    'Método Pagamento': p.paymentMethod,
    'Nº Recibo': p.receiptNumber || '-',
    Notas: p.notes || '-',
  }));

  // Resumo Geral por Obra
  const summaryRows = obras.map((obra) => {
    const obraInvoices = invoices.filter((i) => i.obraId === obra.id);
    const obraLabor = labor.filter((l) => l.obraId === obra.id);
    const obraExpenses = manualExpenses.filter((e) => e.obraId === obra.id);
    const obraPayments = clientPayments.filter((p) => p.obraId === obra.id);

    const totalMateriaisSemIva = obraInvoices.reduce((acc, i) => acc + (Number(i.subtotalWithoutTax) || 0), 0);
    const totalMateriaisComIva = obraInvoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0);
    const totalMaoDeObra = obraLabor.reduce((acc, l) => acc + (Number(l.totalCost) || 0), 0);
    const totalDespesasManuais = obraExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalGeralGasto = totalMateriaisComIva + totalMaoDeObra + totalDespesasManuais;

    const totalRecebidoCliente = obraPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const saldoPendenteCliente = Math.max(0, obra.budget - totalRecebidoCliente);
    const margemCashflow = totalRecebidoCliente - totalGeralGasto;

    return {
      'Nome da Obra': obra.name,
      Cliente: obra.client,
      Estado: obra.status === 'em_curso' ? 'Em Curso' : obra.status === 'concluida' ? 'Concluída' : 'Orçamento',
      'Orçamento Previsto (€)': obra.budget,
      'Total Recebido Cliente (€)': Number(totalRecebidoCliente.toFixed(2)),
      'Saldo Pendente Cliente (€)': Number(saldoPendenteCliente.toFixed(2)),
      'Materiais (c/ IVA) €': Number(totalMateriaisComIva.toFixed(2)),
      'Mão de Obra (€)': Number(totalMaoDeObra.toFixed(2)),
      'Despesas Manuais s/ Fatura (€)': Number(totalDespesasManuais.toFixed(2)),
      'Total Real Gasto (€)': Number(totalGeralGasto.toFixed(2)),
      'Balanço Cashflow (€)': Number(margemCashflow.toFixed(2)),
    };
  });

  return {
    allMaterialRows,
    refrigRows,
    eletricRows,
    acessoriosRows,
    outrosRows,
    laborRows,
    expenseRows,
    paymentRows,
    summaryRows,
  };
}

/**
 * Downloads a complete multi-tab .xlsx spreadsheet
 */
export function exportToMultiTabExcel(
  obras: Obra[],
  invoices: Invoice[],
  labor: LaborRecord[],
  manualExpenses: ManualExpense[] = [],
  clientPayments: ClientPayment[] = [],
  filename = 'Enat_App_Gestao_Custos.xlsx'
) {
  const data = buildSyncDataPayload(obras, invoices, labor, manualExpenses, clientPayments);
  const workbook = XLSX.utils.book_new();

  // 1. Resumo Geral
  const wsSummary = XLSX.utils.json_to_sheet(data.summaryRows);
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumo Geral');

  // 2. Recebimentos do Cliente
  if (data.paymentRows.length > 0) {
    const wsPayments = XLSX.utils.json_to_sheet(data.paymentRows);
    XLSX.utils.book_append_sheet(workbook, wsPayments, 'Recebimentos Cliente');
  }

  // 3. Despesas Manuais sem Fatura
  if (data.expenseRows.length > 0) {
    const wsExpenses = XLSX.utils.json_to_sheet(data.expenseRows);
    XLSX.utils.book_append_sheet(workbook, wsExpenses, 'Despesas s Fatura');
  }

  // 4. Refrigeração
  const wsRefrig = XLSX.utils.json_to_sheet(data.refrigRows.length > 0 ? data.refrigRows : [{ Mensagem: 'Sem registos' }]);
  XLSX.utils.book_append_sheet(workbook, wsRefrig, 'Refrigeração');

  // 5. Material Elétrico
  const wsEletric = XLSX.utils.json_to_sheet(data.eletricRows.length > 0 ? data.eletricRows : [{ Mensagem: 'Sem registos' }]);
  XLSX.utils.book_append_sheet(workbook, wsEletric, 'Material Elétrico');

  // 6. Acessórios & Fixação
  const wsAcessorios = XLSX.utils.json_to_sheet(data.acessoriosRows.length > 0 ? data.acessoriosRows : [{ Mensagem: 'Sem registos' }]);
  XLSX.utils.book_append_sheet(workbook, wsAcessorios, 'Acessórios');

  // 7. Mão de Obra
  const wsLabor = XLSX.utils.json_to_sheet(data.laborRows.length > 0 ? data.laborRows : [{ Mensagem: 'Sem registos' }]);
  XLSX.utils.book_append_sheet(workbook, wsLabor, 'Mão de Obra');

  // 8. Todas as Faturas / Linhas
  const wsAll = XLSX.utils.json_to_sheet(data.allMaterialRows.length > 0 ? data.allMaterialRows : [{ Mensagem: 'Sem registos' }]);
  XLSX.utils.book_append_sheet(workbook, wsAll, 'Todos os Materiais');

  XLSX.writeFile(workbook, filename);
}
