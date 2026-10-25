import * as XLSX from 'xlsx';
import { Invoice, InvoiceItem, LaborRecord, Obra, ManualExpense, ClientPayment, MaterialCategory } from '../types';
import { classifyMaterialCategory } from './categoryClassifier';

export interface ParsedExcelResult {
  fileName: string;
  sheetsFound: string[];
  obras: Array<Omit<Obra, 'id' | 'createdAt'>>;
  invoices: Array<Omit<Invoice, 'id' | 'createdAt'>>;
  labor: Array<Omit<LaborRecord, 'id' | 'createdAt'>>;
  manualExpenses: Array<Omit<ManualExpense, 'id' | 'createdAt'>>;
  clientPayments: Array<Omit<ClientPayment, 'id' | 'createdAt'>>;
  summary: {
    totalObras: number;
    totalInvoices: number;
    totalItems: number;
    totalLabor: number;
    totalExpenses: number;
    totalPayments: number;
    totalValueMaterials: number;
    totalValueLabor: number;
  };
}

function normalizeHeader(h: any): string {
  if (!h || typeof h !== 'string') return '';
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseDateCell(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  if (typeof val === 'number') {
    // Excel serial date number
    try {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
  }

  const s = String(val).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const ptMatch = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, '0');
    const month = ptMatch[2].padStart(2, '0');
    const year = ptMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

function parseNumber(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return 0;
  let str = String(val).replace(/€/g, '').trim();
  // Check if formatted like 1.250,50
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

export function parseExcelWorkbook(fileBuffer: ArrayBuffer, fileName: string): ParsedExcelResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames || [];

  const rawObrasMap = new Map<string, { name: string; client: string; budget: number; status: 'em_curso' | 'concluida' | 'orcamento' }>();
  const parsedInvoicesByDoc = new Map<string, {
    obraName: string;
    storeName: string;
    invoiceNumber: string;
    date: string;
    taxId: string;
    items: InvoiceItem[];
    subtotalWithoutTax: number;
    taxAmount: number;
    totalWithTax: number;
  }>();

  const parsedLabor: Array<Omit<LaborRecord, 'id' | 'createdAt'>> = [];
  const parsedExpenses: Array<Omit<ManualExpense, 'id' | 'createdAt'>> = [];
  const parsedPayments: Array<Omit<ClientPayment, 'id' | 'createdAt'>> = [];

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
    if (!rows || rows.length === 0) continue;

    const normalizedSheet = normalizeHeader(sheetName);

    // 1. RESUMO GERAL SHEET
    if (normalizedSheet.includes('resumo') || normalizedSheet.includes('obras')) {
      for (const row of rows) {
        let obraName = '';
        let client = '';
        let budget = 0;
        let status: 'em_curso' | 'concluida' | 'orcamento' = 'em_curso';

        for (const [key, val] of Object.entries(row)) {
          const nk = normalizeHeader(key);
          if (nk.includes('nome da obra') || nk === 'obra' || nk === 'projeto') {
            obraName = String(val).trim();
          } else if (nk.includes('cliente')) {
            client = String(val).trim();
          } else if (nk.includes('orcamento') || nk.includes('previsto') || nk.includes('valor')) {
            budget = parseNumber(val);
          } else if (nk.includes('estado') || nk.includes('status')) {
            const st = normalizeHeader(val);
            if (st.includes('conclui')) status = 'concluida';
            else if (st.includes('orcamento')) status = 'orcamento';
            else status = 'em_curso';
          }
        }

        if (obraName) {
          rawObrasMap.set(obraName.toLowerCase(), {
            name: obraName,
            client: client || 'Cliente Geral',
            budget: budget || 0,
            status,
          });
        }
      }
      continue;
    }

    // 2. RECEBIMENTOS CLIENTE SHEET
    if (normalizedSheet.includes('recebimento') || normalizedSheet.includes('pagamento cliente')) {
      for (const row of rows) {
        let obraName = 'Geral';
        let date = new Date().toISOString().split('T')[0];
        let description = 'Pagamento Recebido';
        let amount = 0;
        let method: 'transferencia' | 'dinheiro' | 'mbway' | 'cheque' | 'outro' = 'transferencia';
        let receiptNumber = '';

        for (const [key, val] of Object.entries(row)) {
          const nk = normalizeHeader(key);
          if (nk === 'obra' || nk.includes('obra')) obraName = String(val).trim() || 'Geral';
          else if (nk.includes('data')) date = parseDateCell(val);
          else if (nk.includes('descricao')) description = String(val).trim();
          else if (nk.includes('valor') || nk.includes('montante')) amount = parseNumber(val);
          else if (nk.includes('metodo') || nk.includes('forma')) {
            const m = String(val).toLowerCase();
            if (m.includes('dinheiro') || m.includes('num')) method = 'dinheiro';
            else if (m.includes('mbway') || m.includes('mb')) method = 'mbway';
            else if (m.includes('cheque')) method = 'cheque';
            else if (m.includes('outro')) method = 'outro';
            else method = 'transferencia';
          }
          else if (nk.includes('recibo')) receiptNumber = String(val).trim();
        }

        if (amount > 0) {
          parsedPayments.push({
            obraId: obraName,
            date,
            description,
            amount,
            paymentMethod: method,
            receiptNumber,
          });
        }
      }
      continue;
    }

    // 3. MÃO DE OBRA SHEET
    if (normalizedSheet.includes('mao de obra') || normalizedSheet.includes('trabalho') || normalizedSheet.includes('horas')) {
      for (const row of rows) {
        let obraName = 'Geral';
        let date = new Date().toISOString().split('T')[0];
        let workerName = 'Técnico / Equipa';
        let description = 'Instalação e montagem';
        let hours = 1;
        let unitType: 'horas' | 'dias' = 'horas';
        let costRate = 0;
        let totalCost = 0;

        for (const [key, val] of Object.entries(row)) {
          const nk = normalizeHeader(key);
          if (nk === 'obra' || nk.includes('obra')) obraName = String(val).trim() || 'Geral';
          else if (nk.includes('data')) date = parseDateCell(val);
          else if (nk.includes('trabalhador') || nk.includes('funcionario') || nk.includes('nome')) workerName = String(val).trim();
          else if (nk.includes('descricao')) description = String(val).trim();
          else if (nk.includes('qtd') || nk.includes('tempo') || nk.includes('horas')) hours = parseNumber(val) || 1;
          else if (nk.includes('unidade')) {
            const u = String(val).toLowerCase();
            unitType = u.includes('dia') ? 'dias' : 'horas';
          } else if (nk.includes('unitario') || nk.includes('preco') || nk.includes('taxa')) costRate = parseNumber(val);
          else if (nk.includes('total')) totalCost = parseNumber(val);
        }

        if (totalCost === 0 && costRate > 0) {
          totalCost = Number((hours * costRate).toFixed(2));
        } else if (costRate === 0 && totalCost > 0 && hours > 0) {
          costRate = Number((totalCost / hours).toFixed(2));
        }

        if (totalCost > 0 || hours > 0) {
          parsedLabor.push({
            obraId: obraName,
            workerName: workerName || 'Técnico',
            date,
            hoursOrDays: hours,
            unitType,
            costRate: costRate || 15,
            totalCost: totalCost || hours * 15,
            description: description || 'Serviços de instalação',
          });
        }
      }
      continue;
    }

    // 4. DESPESAS SEM FATURA SHEET
    if (normalizedSheet.includes('despesa') || normalizedSheet.includes('custos diretos')) {
      for (const row of rows) {
        let obraName = 'Geral';
        let date = new Date().toISOString().split('T')[0];
        let description = 'Despesa de Obra';
        let amount = 0;
        let category: any = 'Outros';

        for (const [key, val] of Object.entries(row)) {
          const nk = normalizeHeader(key);
          if (nk === 'obra' || nk.includes('obra')) obraName = String(val).trim() || 'Geral';
          else if (nk.includes('data')) date = parseDateCell(val);
          else if (nk.includes('descricao')) description = String(val).trim();
          else if (nk.includes('valor') || nk.includes('montante')) amount = parseNumber(val);
          else if (nk.includes('categoria')) category = String(val).trim();
        }

        if (amount > 0) {
          parsedExpenses.push({
            obraId: obraName,
            date,
            description,
            amount,
            category: category || 'Outros',
            paymentMethod: 'dinheiro',
          });
        }
      }
      continue;
    }

    // 5. ALL MATERIALS / GENERIC EXCEL ITEMS SHEET
    // This handles sheets like "Todos os Materiais", "Refrigeração", "Material Elétrico", or any raw table!
    for (const row of rows) {
      let obraName = 'Geral';
      let date = new Date().toISOString().split('T')[0];
      let invoiceNumber = '';
      let storeName = 'Loja / Fornecedor';
      let productName = '';
      let category = '';
      let quantity = 1;
      let unit = 'un';
      let listPriceWithoutTax = 0;
      let discountPercent = 0;
      let taxRate = 23;
      let unitPriceWithoutTax = 0;
      let unitPriceWithTax = 0;
      let totalWithoutTax = 0;
      let totalWithTax = 0;

      for (const [key, val] of Object.entries(row)) {
        const nk = normalizeHeader(key);
        if (nk === 'obra' || nk.includes('nome da obra')) obraName = String(val).trim() || 'Geral';
        else if (nk.includes('data')) date = parseDateCell(val);
        else if (nk.includes('fatura') || nk.includes('documento') || nk === 'ft') invoiceNumber = String(val).trim();
        else if (nk.includes('loja') || nk.includes('fornecedor') || nk.includes('entidade')) storeName = String(val).trim();
        else if (nk.includes('produto') || nk.includes('artigo') || nk.includes('item') || nk.includes('designacao') || nk.includes('descricao')) {
          productName = String(val).trim();
        } else if (nk.includes('categoria')) category = String(val).trim();
        else if (nk === 'qtd' || nk.includes('quantidade')) quantity = parseNumber(val) || 1;
        else if (nk.includes('unidade') || nk === 'un') unit = String(val).trim() || 'un';
        else if (nk.includes('tabela')) listPriceWithoutTax = parseNumber(val);
        else if (nk.includes('desconto')) discountPercent = parseNumber(val);
        else if (nk.includes('iva') && nk.includes('%')) taxRate = parseNumber(val) || 23;
        else if (nk.includes('pago (s/iva)') || (nk.includes('unit') && nk.includes('s/iva'))) unitPriceWithoutTax = parseNumber(val);
        else if (nk.includes('pago (c/iva)') || (nk.includes('unit') && nk.includes('c/iva'))) unitPriceWithTax = parseNumber(val);
        else if (nk.includes('total (s/iva)') || nk === 'total s/iva' || nk === 'subtotal') totalWithoutTax = parseNumber(val);
        else if (nk.includes('total (c/iva)') || nk === 'total c/iva' || nk === 'total') totalWithTax = parseNumber(val);
      }

      // If this row has at least a product or total
      if (!productName && totalWithTax === 0 && totalWithoutTax === 0) continue;
      if (!productName) productName = 'Material / Artigo';

      // Auto-classify category using the intelligent classifier
      const finalCategory: MaterialCategory = classifyMaterialCategory(productName, category);

      // Harmonize unit and line prices
      if (unitPriceWithoutTax > 0 && totalWithoutTax === 0) {
        totalWithoutTax = Number((unitPriceWithoutTax * quantity).toFixed(2));
      } else if (totalWithoutTax > 0 && unitPriceWithoutTax === 0 && quantity > 0) {
        unitPriceWithoutTax = Number((totalWithoutTax / quantity).toFixed(2));
      }

      if (totalWithTax > 0 && totalWithoutTax === 0) {
        totalWithoutTax = Number((totalWithTax / (1 + taxRate / 100)).toFixed(2));
        unitPriceWithoutTax = Number((totalWithoutTax / quantity).toFixed(2));
      } else if (totalWithoutTax > 0 && totalWithTax === 0) {
        totalWithTax = Number((totalWithoutTax * (1 + taxRate / 100)).toFixed(2));
      }

      if (unitPriceWithTax === 0 && unitPriceWithoutTax > 0) {
        unitPriceWithTax = Number((unitPriceWithoutTax * (1 + taxRate / 100)).toFixed(2));
      }

      if (listPriceWithoutTax === 0) listPriceWithoutTax = unitPriceWithoutTax;

      // Group into invoice by (obraName + storeName + invoiceNumber + date)
      if (!invoiceNumber) {
        invoiceNumber = `DOC-${date.replace(/-/g, '').slice(2)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      const invKey = `${obraName}_${storeName}_${invoiceNumber}_${date}`.toLowerCase();
      let invGroup = parsedInvoicesByDoc.get(invKey);

      const item: InvoiceItem = {
        id: `excel-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        invoiceId: '',
        obraId: obraName,
        name: productName,
        category: finalCategory,
        quantity,
        unit: unit || 'un',
        listPriceWithoutTax,
        discountPercent,
        discountAmount: Number((Math.max(0, listPriceWithoutTax - unitPriceWithoutTax) * quantity).toFixed(2)),
        taxRate,
        unitPriceWithoutTax,
        unitPriceWithTax,
        totalWithoutTax,
        totalWithTax,
      };

      if (!invGroup) {
        invGroup = {
          obraName,
          storeName: storeName || 'Loja / Fornecedor',
          invoiceNumber,
          date,
          taxId: '',
          items: [],
          subtotalWithoutTax: 0,
          taxAmount: 0,
          totalWithTax: 0,
        };
        parsedInvoicesByDoc.set(invKey, invGroup);
      }

      invGroup.items.push(item);
      invGroup.subtotalWithoutTax = Number((invGroup.subtotalWithoutTax + totalWithoutTax).toFixed(2));
      invGroup.totalWithTax = Number((invGroup.totalWithTax + totalWithTax).toFixed(2));
      invGroup.taxAmount = Number(Math.max(0, invGroup.totalWithTax - invGroup.subtotalWithoutTax).toFixed(2));

      // Register the obra in rawObrasMap if not existing
      if (!rawObrasMap.has(obraName.toLowerCase())) {
        rawObrasMap.set(obraName.toLowerCase(), {
          name: obraName,
          client: 'Cliente Obra',
          budget: 0,
          status: 'em_curso',
        });
      }
    }
  }

  // Convert collected data into final output format
  const obras: Array<Omit<Obra, 'id' | 'createdAt'>> = Array.from(rawObrasMap.values()).map((o) => ({
    name: o.name,
    client: o.client,
    address: 'Portugal',
    startDate: new Date().toISOString().split('T')[0],
    budget: o.budget,
    status: o.status,
    notes: 'Importado de folha Excel / Google Sheets',
  }));

  const invoices: Array<Omit<Invoice, 'id' | 'createdAt'>> = Array.from(parsedInvoicesByDoc.values()).map((inv) => ({
    obraId: inv.obraName, // Will be mapped to real Obra ID during commit
    topic: 'Geral / Outros',
    storeName: inv.storeName,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    taxId: inv.taxId,
    subtotalWithoutTax: inv.subtotalWithoutTax,
    taxAmount: inv.taxAmount,
    totalWithTax: inv.totalWithTax,
    items: inv.items,
    notes: 'Importado de ficheiro Excel',
  }));

  let totalItems = 0;
  let totalValueMaterials = 0;
  invoices.forEach((i) => {
    totalItems += i.items.length;
    totalValueMaterials += i.totalWithTax;
  });

  const totalValueLabor = parsedLabor.reduce((acc, l) => acc + l.totalCost, 0);

  return {
    fileName,
    sheetsFound: sheetNames,
    obras,
    invoices,
    labor: parsedLabor,
    manualExpenses: parsedExpenses,
    clientPayments: parsedPayments,
    summary: {
      totalObras: obras.length,
      totalInvoices: invoices.length,
      totalItems,
      totalLabor: parsedLabor.length,
      totalExpenses: parsedExpenses.length,
      totalPayments: parsedPayments.length,
      totalValueMaterials: Number(totalValueMaterials.toFixed(2)),
      totalValueLabor: Number(totalValueLabor.toFixed(2)),
    },
  };
}
