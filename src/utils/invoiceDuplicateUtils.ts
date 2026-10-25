import { Invoice, Obra } from '../types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateInSameObra: boolean;
  duplicateInOtherObra: boolean;
  existingInvoice?: Invoice;
  existingObraName?: string;
  existingObraId?: string;
  reason: string;
}

/**
 * Remove acentos, pontuação e espaços para comparação fonética/textual de faturas.
 */
export function normalizeInvoiceNumber(num: string | undefined | null): string {
  if (!num) return '';
  return num
    .toLowerCase()
    .replace(/[àáâãä]/g, 'a')
    .replace(/[éêèë]/g, 'e')
    .replace(/[íîï]/g, 'i')
    .replace(/[óôõö]/g, 'o')
    .replace(/[úûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normaliza o nome do fornecedor para evitar falsos negativos
 * por diferenças de pontuação ou termos societários (Lda, S.A., etc).
 */
export function normalizeSupplierName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(lda|unipessoal|sa|s\.a\.|sociedade|e|de|do|da|limitada)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Identifica se um número de fatura é apenas um marcador automático temporário
 * (ex: FT-1729831923, FT-Manual, Fatura Manual).
 */
export function isPlaceholderInvoiceNumber(num: string | undefined | null): boolean {
  if (!num) return true;
  const cleaned = num.trim().toLowerCase();
  if (cleaned === '' || cleaned === 'fatura manual' || cleaned === 'novo' || cleaned === 's/n') return true;
  // Gerado automaticamente com timestamp ex: FT-172983, inv-172983, FT 172983-1
  if (/^(ft|inv|draft)[\s\-_]?[0-9]{10,}/i.test(cleaned)) return true;
  if (/^ft[\-_][0-9]{6}/i.test(cleaned)) return true;
  return false;
}

/**
 * Verifica se dois valores monetários são equivalentes considerando pequenas frações de cêntimo
 */
function areAmountsEqual(a: number, b: number): boolean {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= 0.02;
}

/**
 * Verifica se um candidato a fatura é duplicado em relação à lista de faturas existentes
 */
export function checkDuplicateInvoice(
  candidate: {
    id?: string;
    invoiceNumber?: string;
    storeName?: string;
    taxId?: string;
    date?: string;
    totalWithTax?: number;
  },
  existingInvoices: Invoice[],
  targetObraId: string,
  obras: Obra[] = []
): DuplicateCheckResult {
  const normCandidateNum = normalizeInvoiceNumber(candidate.invoiceNumber);
  const isCandidateNumPlaceholder = isPlaceholderInvoiceNumber(candidate.invoiceNumber);
  const candidateNif = (candidate.taxId || '').replace(/[^0-9A-Z]/gi, '');
  const normCandidateStore = normalizeSupplierName(candidate.storeName);
  const candidateTotal = Number(candidate.totalWithTax) || 0;
  const candidateDate = candidate.date?.slice(0, 10) || '';

  const obraMap = new Map<string, string>();
  obras.forEach((o) => obraMap.set(o.id, o.name));

  for (const existing of existingInvoices) {
    // Não comparar a fatura com ela própria em caso de edição
    if (candidate.id && existing.id === candidate.id) continue;

    const normExistingNum = normalizeInvoiceNumber(existing.invoiceNumber);
    const isExistingNumPlaceholder = isPlaceholderInvoiceNumber(existing.invoiceNumber);
    const existingNif = (existing.taxId || '').replace(/[^0-9A-Z]/gi, '');
    const normExistingStore = normalizeSupplierName(existing.storeName);
    const existingTotal = Number(existing.totalWithTax) || 0;
    const existingDate = existing.date?.slice(0, 10) || '';

    let isMatch = false;
    let matchDetail = '';

    // Critério 1: Número de fatura real coincide
    if (!isCandidateNumPlaceholder && !isExistingNumPlaceholder && normCandidateNum && normExistingNum) {
      if (normCandidateNum === normExistingNum) {
        // Se NIF coincide OU fornecedor coincide OU valor coincide
        const nifMatches = candidateNif && existingNif && candidateNif === existingNif;
        const storeMatches = normCandidateStore && normExistingStore && (
          normCandidateStore.includes(normExistingStore) || normExistingStore.includes(normCandidateStore)
        );
        const amountMatches = candidateTotal > 0 && areAmountsEqual(candidateTotal, existingTotal);

        if (nifMatches) {
          isMatch = true;
          matchDetail = `Mesmo número de fatura ("${existing.invoiceNumber}") e mesmo NIF de fornecedor (${existingNif}).`;
        } else if (storeMatches) {
          isMatch = true;
          matchDetail = `Mesmo número de fatura ("${existing.invoiceNumber}") e mesmo fornecedor ("${existing.storeName}").`;
        } else if (amountMatches) {
          isMatch = true;
          matchDetail = `Mesmo número de fatura ("${existing.invoiceNumber}") e mesmo valor total (${existingTotal.toFixed(2)} €).`;
        } else {
          // Se o número é longo e específico (ex: FT 2024/001), já é indício claro
          if (normCandidateNum.length >= 6) {
            isMatch = true;
            matchDetail = `Mesmo número oficial de fatura ("${existing.invoiceNumber}").`;
          }
        }
      }
    }

    // Critério 2: Mesmo fornecedor, mesma data e mesmo valor total exato
    if (!isMatch && candidateTotal > 0 && existingTotal > 0 && areAmountsEqual(candidateTotal, existingTotal)) {
      const sameDate = candidateDate && existingDate && candidateDate === existingDate;
      const sameNif = candidateNif && existingNif && candidateNif === existingNif;
      const sameStore = normCandidateStore && normExistingStore && (
        normCandidateStore.includes(normExistingStore) || normExistingStore.includes(normCandidateStore)
      );

      if (sameDate && (sameNif || sameStore)) {
        isMatch = true;
        matchDetail = `Mesmo fornecedor ("${existing.storeName}"), mesma data (${existingDate}) e mesmo valor total (${existingTotal.toFixed(2)} €).`;
      }
    }

    if (isMatch) {
      const duplicateInSameObra = existing.obraId === targetObraId;
      const existingObraName = obraMap.get(existing.obraId) || 'Obra Desconhecida';

      return {
        isDuplicate: true,
        duplicateInSameObra,
        duplicateInOtherObra: !duplicateInSameObra,
        existingInvoice: existing,
        existingObraName,
        existingObraId: existing.obraId,
        reason: matchDetail,
      };
    }
  }

  return {
    isDuplicate: false,
    duplicateInSameObra: false,
    duplicateInOtherObra: false,
    reason: '',
  };
}

/**
 * Valida um lote de rascunhos para detetar se algum duplica faturas já existentes ou outros rascunhos do próprio lote
 */
export function validateInvoiceBatchDuplicates(
  drafts: Array<{
    tempId: string;
    fileName?: string;
    invoiceNumber: string;
    storeName: string;
    taxId?: string;
    date?: string;
    totalWithTax: number;
  }>,
  existingInvoices: Invoice[],
  targetObraId: string,
  obras: Obra[] = []
): {
  hasSameObraDuplicates: boolean;
  hasOtherObraDuplicates: boolean;
  hasInternalBatchDuplicates: boolean;
  duplicateReports: Map<string, DuplicateCheckResult>;
  internalBatchDuplicateIndices: Set<number>;
} {
  const duplicateReports = new Map<string, DuplicateCheckResult>();
  const internalBatchDuplicateIndices = new Set<number>();
  let hasSameObraDuplicates = false;
  let hasOtherObraDuplicates = false;
  let hasInternalBatchDuplicates = false;

  // 1. Verificar duplicados em relação à base de dados existente
  drafts.forEach((draft) => {
    const check = checkDuplicateInvoice(
      {
        invoiceNumber: draft.invoiceNumber,
        storeName: draft.storeName,
        taxId: draft.taxId,
        date: draft.date,
        totalWithTax: draft.totalWithTax,
      },
      existingInvoices,
      targetObraId,
      obras
    );

    if (check.isDuplicate) {
      duplicateReports.set(draft.tempId, check);
      if (check.duplicateInSameObra) hasSameObraDuplicates = true;
      if (check.duplicateInOtherObra) hasOtherObraDuplicates = true;
    }
  });

  // 2. Verificar duplicados dentro do próprio lote (ex: utilizador submeteu a mesma fatura duas vezes no mesmo carregamento)
  for (let i = 0; i < drafts.length; i++) {
    for (let j = i + 1; j < drafts.length; j++) {
      const a = drafts[i];
      const b = drafts[j];

      const normA = normalizeInvoiceNumber(a.invoiceNumber);
      const normB = normalizeInvoiceNumber(b.invoiceNumber);
      const aIsPl = isPlaceholderInvoiceNumber(a.invoiceNumber);
      const bIsPl = isPlaceholderInvoiceNumber(b.invoiceNumber);

      const storeA = normalizeSupplierName(a.storeName);
      const storeB = normalizeSupplierName(b.storeName);

      let isBatchDup = false;
      if (!aIsPl && !bIsPl && normA && normB && normA === normB) {
        if (storeA === storeB || areAmountsEqual(a.totalWithTax, b.totalWithTax)) {
          isBatchDup = true;
        }
      } else if (
        a.totalWithTax > 0 &&
        areAmountsEqual(a.totalWithTax, b.totalWithTax) &&
        a.date === b.date &&
        storeA &&
        storeB &&
        storeA === storeB
      ) {
        isBatchDup = true;
      }

      if (isBatchDup) {
        internalBatchDuplicateIndices.add(j);
        hasInternalBatchDuplicates = true;
        if (!duplicateReports.has(b.tempId)) {
          duplicateReports.set(b.tempId, {
            isDuplicate: true,
            duplicateInSameObra: true,
            duplicateInOtherObra: false,
            reason: `Fatura repetida dentro deste mesmo carregamento (igual ao ficheiro "${a.fileName || 'Fatura anterior'}").`,
          });
          hasSameObraDuplicates = true;
        }
      }
    }
  }

  return {
    hasSameObraDuplicates,
    hasOtherObraDuplicates,
    hasInternalBatchDuplicates,
    duplicateReports,
    internalBatchDuplicateIndices,
  };
}
