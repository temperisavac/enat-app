import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Camera,
  Trash2,
  FolderKanban,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Eye,
  X,
  RefreshCw,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice, Obra, DEFAULT_OBRA_TOPICS, INVOICE_CATEGORY_OPTIONS } from '../types';
import {
  normalizeInvoiceNumber,
  normalizeSupplierName,
  isPlaceholderInvoiceNumber,
} from '../utils/invoiceDuplicateUtils';

export const InvoicesListView: React.FC = () => {
  const {
    invoices,
    obras,
    updateInvoice,
    deleteInvoice,
    deleteAllInvoices,
    clearAllData,
    openScanner,
    setSelectedObraId,
    setActiveTab,
    openProductModal,
    allProducts,
  } = useApp();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObraFilter, setSelectedObraFilter] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'supplier-asc'>('date-desc');
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({});

  // Modals
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeletingAllModalOpen, setIsDeletingAllModalOpen] = useState(false);
  const [isWipingAllModalOpen, setIsWipingAllModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const handleOpenProduct = (itemName: string, item: any, invoice: Invoice) => {
    const existing = allProducts.find((p) => p.name.toLowerCase() === itemName.toLowerCase());
    if (existing) {
      openProductModal(existing);
      return;
    }
    const unitPriceWithoutTax = Number(item.unitPriceWithoutTax) || 0;
    const unitPriceWithTax =
      Number(item.unitPriceWithTax) ||
      (Number(item.totalWithTax) / (Number(item.quantity) || 1)) ||
      0;
    openProductModal({
      name: item.name,
      category: item.category || 'Outros',
      unit: item.unit || 'un',
      latestPriceWithoutTax: unitPriceWithoutTax,
      latestPriceWithTax: unitPriceWithTax,
      latestListPriceWithoutTax: item.listPriceWithoutTax || unitPriceWithoutTax,
      latestDiscountPercent: item.discountPercent || 0,
      latestTaxRate: item.taxRate || 23,
      latestStoreName: invoice.storeName,
      latestInvoiceNumber: invoice.invoiceNumber,
      latestDate: invoice.date,
      latestObraName: obrasMap.get(invoice.obraId)?.name || 'Obra',
      totalQuantityPurchased: Number(item.quantity) || 1,
      minPrice: unitPriceWithoutTax,
      maxPrice: unitPriceWithoutTax,
      priceHistory: [
        {
          date: invoice.date,
          storeName: invoice.storeName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice.id,
          obraName: obrasMap.get(invoice.obraId)?.name || 'Obra',
          unitPriceWithoutTax: unitPriceWithoutTax,
          unitPriceWithTax: unitPriceWithTax,
          listPriceWithoutTax: item.listPriceWithoutTax || unitPriceWithoutTax,
          discountPercent: item.discountPercent || 0,
          taxRate: item.taxRate || 23,
          quantity: item.quantity || 1,
          unit: item.unit || 'un',
        },
      ],
    });
  };

  // Map of obraId to Obra for quick lookup
  const obrasMap = useMemo(() => {
    const map = new Map<string, Obra>();
    obras.forEach((o) => map.set(o.id, o));
    return map;
  }, [obras]);

  // Identify orphaned invoices (invoices whose obra no longer exists)
  const orphanedInvoices = useMemo(() => {
    return invoices.filter((inv) => !inv.obraId || !obrasMap.has(inv.obraId));
  }, [invoices, obrasMap]);

  // Unique suppliers list
  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => {
      if (i.storeName && i.storeName.trim()) set.add(i.storeName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [invoices]);

  // Filtered and sorted invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Obra filter
        if (selectedObraFilter === 'orphaned') {
          if (inv.obraId && obrasMap.has(inv.obraId)) return false;
        } else if (selectedObraFilter !== 'all') {
          if (inv.obraId !== selectedObraFilter) return false;
        }

        // Topic filter
        if (selectedTopicFilter !== 'all') {
          if ((inv.topic || 'Geral / Outros') !== selectedTopicFilter) return false;
        }

        // Supplier filter
        if (selectedSupplierFilter !== 'all') {
          if (inv.storeName !== selectedSupplierFilter) return false;
        }

        // Search text
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchNumber = inv.invoiceNumber?.toLowerCase().includes(query);
          const matchStore = inv.storeName?.toLowerCase().includes(query);
          const matchTaxId = inv.taxId?.toLowerCase().includes(query);
          const matchTopic = inv.topic?.toLowerCase().includes(query);
          const obraName = inv.obraId ? obrasMap.get(inv.obraId)?.name : '';
          const matchObra = obraName?.toLowerCase().includes(query);
          const matchItems = (inv.items || []).some((item) =>
            item.name?.toLowerCase().includes(query) || item.category?.toLowerCase().includes(query)
          );
          if (!matchNumber && !matchStore && !matchTaxId && !matchTopic && !matchObra && !matchItems) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
        }
        if (sortBy === 'amount-desc') {
          return (b.totalWithTax || 0) - (a.totalWithTax || 0);
        }
        if (sortBy === 'amount-asc') {
          return (a.totalWithTax || 0) - (b.totalWithTax || 0);
        }
        if (sortBy === 'supplier-asc') {
          return (a.storeName || '').localeCompare(b.storeName || '');
        }
        return 0;
      });
  }, [invoices, obrasMap, selectedObraFilter, selectedTopicFilter, selectedSupplierFilter, searchTerm, sortBy]);

  // Aggregate metrics
  const totalValorComIva = useMemo(() => {
    return filteredInvoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0);
  }, [filteredInvoices]);

  const totalValorSemIva = useMemo(() => {
    return filteredInvoices.reduce((acc, i) => acc + (Number(i.subtotalWithoutTax) || 0), 0);
  }, [filteredInvoices]);

  const totalIva = useMemo(() => {
    return filteredInvoices.reduce((acc, i) => acc + (Number(i.taxAmount) || 0), 0);
  }, [filteredInvoices]);

  const mediaPorFatura = useMemo(() => {
    if (filteredInvoices.length === 0) return 0;
    return totalValorComIva / filteredInvoices.length;
  }, [filteredInvoices, totalValorComIva]);

  // Detetar faturas duplicadas em qualquer obra
  const duplicateInvoiceIds = useMemo(() => {
    const dupIds = new Set<string>();
    for (let i = 0; i < invoices.length; i++) {
      for (let j = i + 1; j < invoices.length; j++) {
        const a = invoices[i];
        const b = invoices[j];
        if (a.obraId !== b.obraId) continue;

        const numA = normalizeInvoiceNumber(a.invoiceNumber);
        const numB = normalizeInvoiceNumber(b.invoiceNumber);
        const storeA = normalizeSupplierName(a.storeName);
        const storeB = normalizeSupplierName(b.storeName);

        if (numA && numB && numA === numB && !isPlaceholderInvoiceNumber(a.invoiceNumber)) {
          dupIds.add(a.id);
          dupIds.add(b.id);
        } else if (
          a.totalWithTax > 0 &&
          Math.abs(a.totalWithTax - b.totalWithTax) <= 0.02 &&
          a.date === b.date &&
          storeA &&
          storeB &&
          storeA === storeB
        ) {
          dupIds.add(a.id);
          dupIds.add(b.id);
        }
      }
    }
    return dupIds;
  }, [invoices]);

  const toggleInvoiceExpanded = (id: string) => {
    setExpandedInvoiceIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigateToObra = (obraId: string) => {
    setSelectedObraId(obraId);
  };

  const handleConfirmDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    deleteInvoice(invoiceToDelete.id);
    setInvoiceToDelete(null);
    showNotice(`Fatura ${invoiceToDelete.invoiceNumber} eliminada com sucesso.`);
  };

  const handleDeleteAllInvoices = async () => {
    setIsProcessingAction(true);
    await deleteAllInvoices();
    setIsProcessingAction(false);
    setIsDeletingAllModalOpen(false);
    showNotice('Todas as faturas foram eliminadas. O total de faturas está a 0,00 €.');
  };

  const handleDeleteOrphanedInvoices = async () => {
    setIsProcessingAction(true);
    for (const inv of orphanedInvoices) {
      deleteInvoice(inv.id);
    }
    setIsProcessingAction(false);
    showNotice(`${orphanedInvoices.length} faturas órfãs eliminadas com sucesso.`);
  };

  const handleFullWipeData = async () => {
    setIsProcessingAction(true);
    await clearAllData();
    setIsProcessingAction(false);
    setIsWipingAllModalOpen(false);
    showNotice('Todos os dados de obras e faturas foram limpos com sucesso. Totais a 0,00 €.');
  };

  const showNotice = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Toast Feedback */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 p-1 hover:bg-emerald-500/20 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
              Faturas da Enat app
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Consulta e gestão centralizada de todas as faturas adicionadas, fornecedores e comprovativos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => openScanner()}
            className="py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-95"
          >
            <Camera className="w-4 h-4 stroke-[2.2]" />
            <span>Digitalizar Fatura (IA)</span>
          </button>
        </div>
      </div>

      {/* Warning banner if orphaned invoices exist */}
      {orphanedInvoices.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Atenção: Existem {orphanedInvoices.length} faturas sem obra associada (ou de obras eliminadas)
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                Total órfão: {orphanedInvoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €. Estas faturas estavam a somar no Dashboard mesmo sem obras.
              </p>
            </div>
          </div>
          <button
            onClick={handleDeleteOrphanedInvoices}
            disabled={isProcessingAction}
            className="w-full sm:w-auto shrink-0 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Faturas Órfãs</span>
          </button>
        </div>
      )}

      {/* Warning banner if duplicate invoices exist in any obra */}
      {duplicateInvoiceIds.size > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200">
                  Aviso: Foram detetadas {duplicateInvoiceIds.size} faturas repetidas em obras
                </h4>
                <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold">
                  Duplicadas
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                Existem faturas anexadas mais do que uma vez na mesma obra. As cópias repetidas estão sinalizadas com a etiqueta vermelha &quot;⛔ Fatura Repetida&quot; abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total c/ IVA */}
        <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Total Faturado c/IVA
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white">
              {totalValorComIva.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-blue-500">€</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'fatura visível' : 'faturas visíveis'}
          </p>
        </div>

        {/* Total s/ IVA */}
        <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Base s/IVA (Subtotal)
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white">
              {totalValorSemIva.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-emerald-500">€</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">Custo líquido de materiais</p>
        </div>

        {/* IVA Dedutível */}
        <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              IVA Total Liquidado
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white">
              {totalIva.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-amber-500">€</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">Imposto a deduzir na empresa</p>
        </div>

        {/* Média por Fatura */}
        <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Média por Fatura
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white">
              {mediaPorFatura.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-purple-500">€</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">Ticket médio de compras</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por fornecedor, nº fatura, artigo, NIF ou obra..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="w-full md:w-auto shrink-0 flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-bold shrink-0">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full md:w-auto py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#141418] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="date-desc">Data (Mais recente)</option>
              <option value="date-asc">Data (Mais antiga)</option>
              <option value="amount-desc">Valor (Maior primeiro)</option>
              <option value="amount-asc">Valor (Menor primeiro)</option>
              <option value="supplier-asc">Fornecedor (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-black/5 dark:border-white/5">
          {/* Obra Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block">
              Filtrar por Obra
            </label>
            <select
              value={selectedObraFilter}
              onChange={(e) => setSelectedObraFilter(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#141418] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">Todas as Obras ({invoices.length})</option>
              {orphanedInvoices.length > 0 && (
                <option value="orphaned">⚠️ Sem Obra / Órfãs ({orphanedInvoices.length})</option>
              )}
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block">
              Filtrar por Especialidade
            </label>
            <select
              value={selectedTopicFilter}
              onChange={(e) => setSelectedTopicFilter(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#141418] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">Todas as Especialidades</option>
              {DEFAULT_OBRA_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block">
              Filtrar por Fornecedor / Loja
            </label>
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#141418] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">Todos os Fornecedores ({uniqueSuppliers.length})</option>
              {uniqueSuppliers.map((supp) => (
                <option key={supp} value={supp}>
                  {supp}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl revolut-card revolut-shadow text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-black dark:text-white">
              {invoices.length === 0 ? 'Nenhuma fatura registada na Enat app' : 'Nenhuma fatura encontrada com os filtros atuais'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              {invoices.length === 0
                ? 'Comece por digitalizar uma fatura em papel ou PDF usando a IA para extrair artigos e preços automaticamente.'
                : 'Tente alterar os termos da pesquisa ou limpar os filtros de obra, especialidade e fornecedor.'}
            </p>
          </div>
          {invoices.length === 0 ? (
            <button
              onClick={() => openScanner()}
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <Camera className="w-4 h-4 stroke-[2.2]" />
              <span>Digitalizar Primeira Fatura (IA)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedObraFilter('all');
                setSelectedTopicFilter('all');
                setSelectedSupplierFilter('all');
              }}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:bg-black/10 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredInvoices.map((inv) => {
            const obra = inv.obraId ? obrasMap.get(inv.obraId) : null;
            const isOrphaned = !obra;
            const isExpanded = !!expandedInvoiceIds[inv.id];
            const itemsCount = inv.items?.length || 0;
            const previewImage = inv.receiptImageUrl || (inv.receiptImageUrls && inv.receiptImageUrls[0]);

            return (
              <div
                key={inv.id}
                className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/5 overflow-hidden transition-all duration-200 hover:border-blue-500/30"
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Supplier info & Invoice number */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Store avatar */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-black text-sm">
                      {inv.storeName ? inv.storeName.charAt(0).toUpperCase() : 'F'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-black dark:text-white truncate">
                          {inv.storeName || 'Loja / Fornecedor'}
                        </h3>
                        <span className="py-0.5 px-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-mono font-bold text-slate-700 dark:text-neutral-300">
                          {inv.invoiceNumber}
                        </span>
                        {duplicateInvoiceIds.has(inv.id) && (
                          <span className="py-0.5 px-2 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold uppercase shadow-sm flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>⛔ Fatura Repetida</span>
                          </span>
                        )}
                        {inv.topic && (
                          <span className="py-0.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            {inv.topic}
                          </span>
                        )}
                        {inv.category && (
                          <span className="py-0.5 px-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            <span>{inv.category}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-neutral-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{inv.date || 'Sem data'}</span>
                        </span>

                        {/* Obra link */}
                        {obra ? (
                          <button
                            onClick={() => handleNavigateToObra(obra.id)}
                            className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            title="Abrir pasta desta obra"
                          >
                            <FolderKanban className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{obra.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md text-[10px]">
                            <AlertCircle className="w-3 h-3" />
                            <span>Sem Obra Associada</span>
                          </span>
                        )}

                        {inv.taxId && (
                          <span className="text-[11px] font-mono text-slate-400">NIF: {inv.taxId}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Total Value & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                    {/* Amount Block */}
                    <div className="text-left md:text-right">
                      <div className="flex items-baseline md:justify-end gap-1">
                        <span className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white">
                          {(Number(inv.totalWithTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-sm font-bold text-blue-500">€</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-neutral-500 flex items-center md:justify-end gap-1.5">
                        <span>s/IVA: {(Number(inv.subtotalWithoutTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span>
                        <span>•</span>
                        <span>IVA: {(Number(inv.taxAmount) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span>
                      </div>
                    </div>

                    {/* Actions: View Receipt, Toggle Items, Delete */}
                    <div className="flex items-center gap-1.5">
                      {previewImage && (
                        <button
                          onClick={() => setPreviewImageUrl(previewImage)}
                          className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300 transition"
                          title="Ver Comprovativo da Fatura"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => toggleInvoiceExpanded(inv.id)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                          isExpanded
                            ? 'bg-blue-600 text-white'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300'
                        }`}
                        title="Ver artigos da fatura"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{itemsCount} art.</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setInvoiceToDelete(inv)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Eliminar esta fatura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Items Details */}
                {isExpanded && (
                  <div className="border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-4 sm:p-5 animate-in fade-in space-y-4">
                    {/* Invoice Category and Topic Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/5 shadow-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Topic selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500">Tópico:</span>
                          <select
                            value={inv.topic || 'Geral / Outros'}
                            onChange={(e) => updateInvoice(inv.id, { topic: e.target.value })}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-700 border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {DEFAULT_OBRA_TOPICS.map((top) => (
                              <option key={top} value={top}>{top}</option>
                            ))}
                          </select>
                        </div>

                        {/* Overall Invoice Category */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Categoria da Fatura:</span>
                          </span>
                          <select
                            value={inv.category || ''}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              updateInvoice(inv.id, { category: newCat });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs font-bold text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecionar categoria geral...</option>
                            {INVOICE_CATEGORY_OPTIONS.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>

                          {inv.category && inv.items && inv.items.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updatedItems = inv.items.map((item) => ({
                                  ...item,
                                  category: inv.category as any,
                                }));
                                updateInvoice(inv.id, { items: updatedItems });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-800/50 text-[11px] font-bold text-purple-800 dark:text-purple-200 transition"
                              title="Aplicar esta categoria a todos os artigos desta fatura"
                            >
                              Aplicar a Todos os Artigos
                            </button>
                          )}
                        </div>
                      </div>

                      {obra && (
                        <button
                          onClick={() => handleNavigateToObra(obra.id)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>Abrir na Obra: {obra.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                        <span>Artigos / Linhas da Fatura ({itemsCount})</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Pode alterar a categoria de cada artigo individualmente no menu abaixo
                      </span>
                    </div>

                    {(!inv.items || inv.items.length === 0) ? (
                      <p className="text-xs text-slate-400 dark:text-neutral-500 py-2">
                        Esta fatura foi registada sem artigos detalhados.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-black/10 dark:border-white/10 text-slate-400 dark:text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                              <th className="pb-2 font-medium">Artigo / Descrição</th>
                              <th className="pb-2 font-medium">Categoria / Especialidade</th>
                              <th className="pb-2 font-medium text-right">Qtd</th>
                              <th className="pb-2 font-medium text-right">P. Unit s/IVA</th>
                              <th className="pb-2 font-medium text-right">Desc %</th>
                              <th className="pb-2 font-medium text-right">IVA %</th>
                              <th className="pb-2 font-medium text-right">Total c/IVA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {inv.items.map((item, idx) => (
                              <tr
                                key={item.id || idx}
                                className="hover:bg-blue-500/5 transition group"
                              >
                                <td
                                  onClick={() => handleOpenProduct(item.name, item, inv)}
                                  className="py-2.5 font-bold text-black dark:text-white pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition cursor-pointer"
                                  title="Clique para ver histórico e ficha detalhada deste produto"
                                >
                                  {item.name}
                                </td>
                                <td className="py-2.5 pr-2">
                                  <select
                                    value={item.category || inv.category || 'Outros / Geral'}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const updatedCat = e.target.value;
                                      const newItems = [...inv.items];
                                      newItems[idx] = { ...item, category: updatedCat as any };
                                      updateInvoice(inv.id, { items: newItems });
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[210px]"
                                  >
                                    {INVOICE_CATEGORY_OPTIONS.map((cat) => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                </td>
                                <td
                                  onClick={() => handleOpenProduct(item.name, item, inv)}
                                  className="py-2.5 font-mono text-right text-slate-700 dark:text-neutral-300 cursor-pointer"
                                >
                                  {item.quantity} {item.unit || 'un'}
                                </td>
                                <td
                                  onClick={() => handleOpenProduct(item.name, item, inv)}
                                  className="py-2.5 font-mono text-right text-slate-700 dark:text-neutral-300 cursor-pointer"
                                >
                                  {(Number(item.unitPriceWithoutTax) || 0).toFixed(2).replace('.', ',')} €
                                </td>
                                <td
                                  onClick={() => handleOpenProduct(item.name, item, inv)}
                                  className="py-2.5 font-mono text-right text-slate-500 cursor-pointer"
                                >
                                  {item.discountPercent ? `${item.discountPercent}%` : '-'}
                                </td>
                                <td
                                  onClick={() => handleOpenProduct(item.name, item, inv)}
                                  className="py-2.5 font-mono text-right text-slate-500 cursor-pointer"
                                >
                                  {item.taxRate || 23}%
                                </td>
                                <td
                                  onClick={() => handleOpenProduct(item.name, item, inv)}
                                  className="py-2.5 font-mono font-bold text-right text-black dark:text-white cursor-pointer"
                                >
                                  {(Number(item.totalWithTax) || 0).toFixed(2).replace('.', ',')} €
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Receipt Image Thumbnail preview if available */}
                    {previewImage && (
                      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={previewImage}
                            alt="Comprovativo"
                            onClick={() => setPreviewImageUrl(previewImage)}
                            className="w-12 h-12 object-cover rounded-xl border border-black/10 dark:border-white/10 cursor-pointer hover:opacity-90 transition"
                          />
                          <div>
                            <span className="text-xs font-bold text-black dark:text-white block">
                              Comprovativo anexado
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Clique para ampliar e examinar o documento
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewImageUrl(previewImage)}
                          className="py-1.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-black dark:text-white transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Imagem</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-black dark:text-white">
                Eliminar esta Fatura?
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Fatura <strong className="text-black dark:text-white">{invoiceToDelete.invoiceNumber}</strong> de{' '}
                <strong className="text-black dark:text-white">{invoiceToDelete.storeName}</strong> no valor de{' '}
                <strong className="text-blue-500">
                  {(Number(invoiceToDelete.totalWithTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                </strong>.
                Esta ação atualizará imediatamente o valor total na Dashboard e na Nuvem.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteInvoice}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-500/25"
              >
                Sim, Eliminar Fatura
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Fechar Comprovativo"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Comprovativo da fatura"
              className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};
