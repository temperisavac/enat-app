/**
 * CSV Exporter for Obra Financial Data
 * Formatted with UTF-8 BOM and semicolon (;) delimiter for native Microsoft Excel and Google Sheets compatibility in Europe.
 */

import { Obra, Invoice, LaborRecord, ManualExpense, ClientPayment } from '../types';
import { ObraFinancialSummary, ObraTopicFinance } from './obraAnalytics';

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function formatEuro(num: number): string {
  if (isNaN(num)) return '0,00';
  return num.toFixed(2).replace('.', ',');
}

export function generateObraCSV(
  obra: Obra,
  finances: ObraFinancialSummary,
  invoices: Invoice[],
  labor: LaborRecord[],
  expenses: ManualExpense[] = [],
  payments: ClientPayment[] = []
): string {
  const lines: string[] = [];

  // UTF-8 BOM
  const BOM = '\uFEFF';

  // Section 1: Cabeçalho & Resumo Geral da Obra
  lines.push('RESUMO FINANCEIRO DA OBRA');
  lines.push(`Nome da Obra;${escapeCSV(obra.name)}`);
  lines.push(`Cliente / Empresa;${escapeCSV(obra.client)}`);
  lines.push(`Morada / Localização;${escapeCSV(obra.address)}`);
  lines.push(`Estado da Obra;${escapeCSV(obra.status === 'concluida' ? 'Concluída' : obra.status === 'em_curso' ? 'Em Curso' : 'Em Orçamento')}`);
  lines.push(`Data de Início;${escapeCSV(obra.startDate)}`);
  lines.push(`Data de Extração;${escapeCSV(new Date().toLocaleDateString('pt-PT'))}`);
  lines.push('');

  // Section 2: Indicadores Financeiros Globais
  lines.push('INDICADORES FINANCEIROS PRINCIPAIS;');
  lines.push('Métrica;Valor (€);% Face ao Orçamento');
  lines.push(`Orçamento Aprovado;${formatEuro(obra.budget)};100,0%`);
  lines.push(`Total Gasto Real;${formatEuro(finances.totalGastoObra)};${formatEuro(obra.budget > 0 ? (finances.totalGastoObra / obra.budget) * 100 : 0)}%`);
  lines.push(`Total Já Recebido do Cliente;${formatEuro(finances.totalRecebidoCliente)};${formatEuro(obra.budget > 0 ? (finances.totalRecebidoCliente / obra.budget) * 100 : 0)}%`);
  lines.push(`Saldo Restante a Cobrar ao Cliente;${formatEuro(finances.saldoAReceber)};${formatEuro(obra.budget > 0 ? (finances.saldoAReceber / obra.budget) * 100 : 0)}%`);
  lines.push(`Margem de Lucro Bruto Estimada;${formatEuro(finances.lucroTotalObra)};${formatEuro(finances.margemPercentualPrevista)}%`);
  lines.push('');

  // Section 3: Repartição de Custos por Tipo
  lines.push('REPARTIÇÃO DE CUSTOS POR TIPO;');
  lines.push('Tipo de Custo;Valor Total c/IVA (€);% do Total Gasto');
  lines.push(`Materiais - Máquinas & Equipamentos;${formatEuro(finances.breakdown.maquinas.amount)};${formatEuro(finances.breakdown.maquinas.percentageOfTotal)}%`);
  lines.push(`Materiais - Acessórios & Fixação;${formatEuro(finances.breakdown.acessorios.amount)};${formatEuro(finances.breakdown.acessorios.percentageOfTotal)}%`);
  lines.push(`Materiais - Ligações Elétricas;${formatEuro(finances.breakdown.eletrico.amount)};${formatEuro(finances.breakdown.eletrico.percentageOfTotal)}%`);
  lines.push(`Materiais - Tubos de Refrigeração & Gás;${formatEuro(finances.breakdown.refrigeracao.amount)};${formatEuro(finances.breakdown.refrigeracao.percentageOfTotal)}%`);
  lines.push(`Materiais - Tubagens de Água & Canalização;${formatEuro(finances.breakdown.agua.amount)};${formatEuro(finances.breakdown.agua.percentageOfTotal)}%`);
  lines.push(`Mão de Obra (Horas / Dias de Técnicos);${formatEuro(finances.breakdown.maodeobra.amount)};${formatEuro(finances.breakdown.maodeobra.percentageOfTotal)}%`);
  lines.push(`Despesas Diretas / Manuais;${formatEuro(finances.breakdown.despesasManuais.amount)};${formatEuro(finances.breakdown.despesasManuais.percentageOfTotal)}%`);
  lines.push('');

  // Section 4: Rentabilidade por Categoria / Tópico
  if (finances.topicFinances && finances.topicFinances.length > 0) {
    lines.push('ORÇAMENTO E LUCRO POR CATEGORIA / ESPECIALIDADE;');
    lines.push('Especialidade;Orçamento Venda (€);Gasto Real (€);Lucro (€);% Margem;Estado');
    finances.topicFinances.forEach((tf: ObraTopicFinance) => {
      const statusStr = tf.lucro >= 0 ? 'Lucro' : 'Prejuízo';
      lines.push(`${escapeCSV(tf.topic)};${formatEuro(tf.budget)};${formatEuro(tf.totalGasto)};${formatEuro(tf.lucro)};${tf.margemPercent !== null && !isNaN(tf.margemPercent) ? formatEuro(tf.margemPercent) + '%' : 'N/D'};${escapeCSV(statusStr)}`);
    });
    lines.push('');
  }

  // Section 5: Faturas de Materiais Detalhadas
  lines.push('DETALHE DE FATURAS DE MATERIAIS;');
  lines.push('Data;Nº Fatura;Fornecedor / Loja;Especialidade / Tópico;Nº Artigos;Subtotal s/IVA (€);IVA (€);Total c/IVA (€)');
  if (invoices.length === 0) {
    lines.push('Sem faturas registadas nesta obra;;;;;;;');
  } else {
    invoices.forEach((inv) => {
      lines.push(
        `${escapeCSV(inv.date)};${escapeCSV(inv.invoiceNumber)};${escapeCSV(inv.storeName)};${escapeCSV(inv.topic || 'Geral')};${inv.items?.length || 0};${formatEuro(inv.subtotalWithoutTax)};${formatEuro(inv.taxAmount)};${formatEuro(inv.totalWithTax)}`
      );
    });
  }
  lines.push('');

  // Section 6: Artigos Comprados (Item a Item)
  lines.push('ARTIGOS E MATERIAIS COMPRADOS (ITEM A ITEM);');
  lines.push('Fatura;Data;Fornecedor;Artigo;Categoria;Qtd;Un;Preço Unit. s/IVA (€);Desc %;Taxa IVA %;Total s/IVA (€);Total c/IVA (€)');
  let hasItems = false;
  invoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      hasItems = true;
      lines.push(
        `${escapeCSV(inv.invoiceNumber)};${escapeCSV(inv.date)};${escapeCSV(inv.storeName)};${escapeCSV(item.name)};${escapeCSV(item.category)};${item.quantity};${escapeCSV(item.unit || 'un')};${formatEuro(item.unitPriceWithoutTax)};${formatEuro(item.discountPercent || 0)}%;${item.taxRate || 23}%;${formatEuro(item.totalWithoutTax)};${formatEuro(item.totalWithTax)}`
      );
    });
  });
  if (!hasItems) {
    lines.push('Sem artigos registados;;;;;;;;;;;');
  }
  lines.push('');

  // Section 7: Mão de Obra
  lines.push('REGISTO DE MÃO DE OBRA;');
  lines.push('Data;Técnico / Funcionário;Descrição da Tarefa;Quantidade;Unidade;Valor Unitário (€);Total (€)');
  if (labor.length === 0) {
    lines.push('Sem mão de obra registada;;;;;;');
  } else {
    labor.forEach((l) => {
      lines.push(
        `${escapeCSV(l.date)};${escapeCSV(l.workerName)};${escapeCSV(l.description)};${l.hoursOrDays};${escapeCSV(l.unitType)};${formatEuro(l.costRate)};${formatEuro(l.totalCost)}`
      );
    });
  }
  lines.push('');

  // Section 8: Recebimentos do Cliente
  lines.push('HISTÓRICO DE RECEBIMENTOS DO CLIENTE;');
  lines.push('Data;Descrição;Método de Pagamento;Nº Recibo / Tranche;Valor Recebido (€)');
  if (payments.length === 0) {
    lines.push('Sem pagamentos registados do cliente;;;;');
  } else {
    payments.forEach((p) => {
      lines.push(
        `${escapeCSV(p.date)};${escapeCSV(p.description)};${escapeCSV(p.paymentMethod || 'Transferência')};${escapeCSV(p.receiptNumber || '-')};${formatEuro(p.amount)}`
      );
    });
  }

  return BOM + lines.join('\r\n');
}

/**
 * Initiates the download of the CSV file in the browser
 */
export function downloadObraCSV(
  obra: Obra,
  finances: ObraFinancialSummary,
  invoices: Invoice[],
  labor: LaborRecord[],
  expenses: ManualExpense[] = [],
  payments: ClientPayment[] = []
): void {
  const csvContent = generateObraCSV(obra, finances, invoices, labor, expenses, payments);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanName = (obra.name || 'Obra')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Financeiro_Obra_${cleanName}_${dateStr}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
