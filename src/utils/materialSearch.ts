import { Invoice, Obra, ProductDetailInfo, ProductPriceHistoryPoint } from '../types';

/**
 * Normalizes text for accent-insensitive, lowercase, and clean token search
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Creates a clean canonical key for a product so identical items are always grouped
 * and corrected rather than appearing as duplicates.
 */
export function normalizeProductKey(name: string): string {
  return normalizeText(name)
    .replace(/^["'«»“”„]+|["'«»“”„]+$/g, '') // strip wrapping quotes
    .replace(/[^\w\s/.-]/g, ' ')             // remove unusual symbols
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim();
}

/**
 * Checks if search query matches the target string with partial fuzzy token matching
 */
export function matchesQuery(target: string, query: string): boolean {
  const normTarget = normalizeText(target);
  const normQuery = normalizeText(query);

  if (!normQuery) return false;
  if (normTarget.includes(normQuery)) return true;

  // Split query into words: every word must appear in target
  const words = normQuery.split(/\s+/).filter(Boolean);
  return words.every((word) => normTarget.includes(word));
}

/**
 * Collects and groups all purchased products across all invoices and projects.
 * Enforces deduplication: If a product is purchased at a store (or anywhere) multiple times
 * at different prices, it updates ("corrige") the material's current price to the newest invoice price,
 * ensuring no duplicate entries exist in the search or catalogue.
 */
export function getAllAggregatedProducts(invoices: Invoice[], obras: Obra[]): ProductDetailInfo[] {
  const obraMap = new Map<string, string>();
  obras.forEach((o) => obraMap.set(o.id, o.name));

  // Map keyed by canonical normalized product key
  const groups = new Map<
    string,
    {
      canonicalName: string;
      category: any;
      unit: string;
      records: (ProductPriceHistoryPoint & { sortOrder: number })[];
    }
  >();

  let invoiceOrderCounter = 0;

  invoices.forEach((inv) => {
    invoiceOrderCounter++;
    inv.items.forEach((item) => {
      const normKey = normalizeProductKey(item.name);
      if (!normKey) return;

      if (!groups.has(normKey)) {
        groups.set(normKey, {
          canonicalName: item.name.trim(),
          category: item.category,
          unit: item.unit || 'Uni',
          records: [],
        });
      }

      const group = groups.get(normKey)!;
      group.records.push({
        date: inv.date,
        storeName: inv.storeName,
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        obraName: obraMap.get(item.obraId || inv.obraId) || 'Obra Geral',
        obraId: item.obraId || inv.obraId,
        listPriceWithoutTax: item.listPriceWithoutTax || item.unitPriceWithoutTax,
        discountPercent: item.discountPercent || 0,
        taxRate: typeof item.taxRate === 'number' ? item.taxRate : 23,
        unitPriceWithoutTax: item.unitPriceWithoutTax,
        unitPriceWithTax: item.unitPriceWithTax,
        quantity: item.quantity,
        unit: item.unit || 'un',
        sortOrder: invoiceOrderCounter,
      });
    });
  });

  const results: ProductDetailInfo[] = [];

  groups.forEach((val) => {
    // Sort records descending: newest purchase date first, then by invoice submission order
    const sorted = [...val.records].sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.sortOrder - a.sortOrder;
    });

    // The latest record updates/corrects the current displayed price
    const latest = sorted[0];

    const pricesWithoutTax = sorted.map((r) => r.unitPriceWithoutTax);
    const minPrice = Math.min(...pricesWithoutTax);
    const maxPrice = Math.max(...pricesWithoutTax);
    const totalQuantity = sorted.reduce((acc, curr) => acc + curr.quantity, 0);

    // Clean records for output
    const cleanHistory: ProductPriceHistoryPoint[] = sorted.map(({ sortOrder, ...point }) => point);

    results.push({
      name: val.canonicalName,
      category: val.category,
      latestListPriceWithoutTax: latest.listPriceWithoutTax || latest.unitPriceWithoutTax,
      latestDiscountPercent: latest.discountPercent || 0,
      latestTaxRate: typeof latest.taxRate === 'number' ? latest.taxRate : 23,
      latestPriceWithoutTax: latest.unitPriceWithoutTax,
      latestPriceWithTax: latest.unitPriceWithTax,
      unit: val.unit,
      latestStoreName: latest.storeName,
      latestDate: latest.date,
      latestInvoiceNumber: latest.invoiceNumber,
      latestObraName: latest.obraName,
      totalQuantityPurchased: totalQuantity,
      minPrice,
      maxPrice,
      priceHistory: cleanHistory,
    });
  });

  return results.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

/**
 * Searches products by query string
 */
export function searchProducts(
  products: ProductDetailInfo[],
  query: string
): ProductDetailInfo[] {
  if (!query.trim()) return [];

  const matched = products.filter((p) => {
    return (
      matchesQuery(p.name, query) ||
      matchesQuery(p.category, query) ||
      matchesQuery(p.latestStoreName, query) ||
      p.priceHistory.some((h) => matchesQuery(h.storeName, query))
    );
  });

  // Rank matches: exact prefix starts first, then substring match
  const normQuery = normalizeText(query);
  return matched.sort((a, b) => {
    const aStarts = normalizeText(a.name).startsWith(normQuery);
    const bStarts = normalizeText(b.name).startsWith(normQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name, 'pt');
  });
}

export interface StoreInvoiceSearchResult {
  invoice: Invoice;
  obraName: string;
  matchedByStore: boolean;
}

/**
 * Searches invoices by store name, returning all invoices attached for that supplier,
 * including date, project name, totals, and item count.
 */
export function searchInvoicesByStore(
  invoices: Invoice[],
  obras: Obra[],
  query: string
): StoreInvoiceSearchResult[] {
  if (!query.trim()) return [];

  const obraMap = new Map<string, string>();
  obras.forEach((o) => obraMap.set(o.id, o.name));

  const results: StoreInvoiceSearchResult[] = [];

  invoices.forEach((inv) => {
    const matchedStore = matchesQuery(inv.storeName, query);
    const matchedNumber = matchesQuery(inv.invoiceNumber, query);

    if (matchedStore || matchedNumber) {
      results.push({
        invoice: inv,
        obraName: obraMap.get(inv.obraId) || 'Obra Desconhecida',
        matchedByStore: matchedStore,
      });
    }
  });

  // Sort newest invoice date first
  return results.sort(
    (a, b) => new Date(b.invoice.date).getTime() - new Date(a.invoice.date).getTime()
  );
}
