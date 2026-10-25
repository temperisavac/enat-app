import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, Store, Calendar, FileText, FolderKanban, Check, Copy, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatSafeDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === 'N/D') return 'N/D';
  try {
    const trimmed = String(dateStr).trim();
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[/-]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-PT');
      }
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed || 'N/D';
    return d.toLocaleDateString('pt-PT');
  } catch {
    return String(dateStr) || 'N/D';
  }
}

export const ProductDetailModal: React.FC = () => {
  const { selectedProductForModal, closeProductModal, deleteInvoice } = useApp();
  const [copied, setCopied] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string; number: string; store: string } | null>(null);

  if (!selectedProductForModal) return null;

  const product = selectedProductForModal;
  const history = Array.isArray(product.priceHistory) ? product.priceHistory : [];
  const hasHistory = history.length > 1;

  const oldestPoint = history.length > 0 ? history[history.length - 1] : null;
  const oldestPrice = Number(oldestPoint?.unitPriceWithoutTax ?? product.latestPriceWithoutTax ?? 0) || 0;
  const latestPrice = Number(product.latestPriceWithoutTax ?? 0) || 0;
  const priceDiff = latestPrice - oldestPrice;
  const percentDiff = oldestPrice > 0 ? (priceDiff / oldestPrice) * 100 : 0;

  const handleCopy = () => {
    const discount = Number(product.latestDiscountPercent) || 0;
    const discountNote = discount > 0 ? ` (Desc: ${discount}%)` : '';
    const withoutTax = (Number(product.latestPriceWithoutTax) || 0).toFixed(2);
    const withTax = (Number(product.latestPriceWithTax) || 0).toFixed(2);
    const unitStr = product.unit || 'un';
    const store = product.latestStoreName || 'Loja';
    const invoiceNum = product.latestInvoiceNumber || 'S/N';
    navigator.clipboard.writeText(
      `${product.name || 'Artigo'} - ${withoutTax}€ s/IVA (${withTax}€ c/IVA por ${unitStr})${discountNote} - Loja: ${store} (Fatura: ${invoiceNum})`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl revolut-card revolut-shadow border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl bg-white dark:bg-[#121216] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-black/5 dark:border-white/5 flex items-start justify-between">
          <div className="pr-8">
            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
              {product.category}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-black dark:text-white leading-tight">
              {product.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-medium">
              Unidade de Medida: <span className="font-bold text-black dark:text-white">{product.unit}</span>
            </p>
          </div>

          <button
            onClick={closeProductModal}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 hover:text-black dark:hover:text-white transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Price Card Revolut-style */}
          <div className="rounded-3xl p-5 bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-neutral-400">
                  Preço Pago Unitário
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-black dark:text-white font-mono">
                    {(product.latestPriceWithTax ?? 0).toFixed(2)} €
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    c/ IVA ({product.unit || 'un'})
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-neutral-300 mt-0.5 font-mono">
                  {(product.latestPriceWithoutTax ?? 0).toFixed(2)} € <span className="font-normal text-slate-400">s/ IVA • Taxa IVA {product.latestTaxRate || 23}%</span>
                </div>
              </div>

              {hasHistory && (
                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-black/5 dark:border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Variação</span>
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      percentDiff > 0
                        ? 'bg-rose-500/10 text-rose-500'
                        : percentDiff < 0
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-slate-200 dark:bg-neutral-800 text-slate-400'
                    }`}
                  >
                    {percentDiff > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : percentDiff < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : null}
                    {percentDiff > 0 ? `+${percentDiff.toFixed(1)}%` : `${percentDiff.toFixed(1)}%`}
                  </div>
                </div>
              )}
            </div>

            {/* Commercial Discount Details banner if applied */}
            {((product.latestDiscountPercent || 0) > 0 || (product.latestListPriceWithoutTax || 0) > (product.latestPriceWithoutTax || 0)) && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px]">
                    -{product.latestDiscountPercent || 0}% DESCONTO
                  </span>
                  <span className="text-slate-600 dark:text-neutral-300 font-medium">
                    Preço de Tabela: <strong className="font-mono">{(product.latestListPriceWithoutTax ?? product.latestPriceWithoutTax ?? 0).toFixed(2)} €</strong> s/IVA
                  </span>
                </div>
                <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                  Poupança: {Math.max(0, (product.latestListPriceWithoutTax ?? product.latestPriceWithoutTax ?? 0) - (product.latestPriceWithoutTax ?? 0)).toFixed(2)} € /{product.unit || 'un'}
                </div>
              </div>
            )}
          </div>

          {/* Grid of Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Fornecedor / Loja</p>
                <p className="text-xs font-bold text-black dark:text-white mt-0.5">{product.latestStoreName || 'Loja'}</p>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Última Compra</p>
                <p className="text-xs font-bold text-black dark:text-white mt-0.5">
                  {formatSafeDate(product.latestDate)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Fatura</p>
                <p className="text-xs font-bold text-black dark:text-white mt-0.5 font-mono">
                  {product.latestInvoiceNumber || 'S/N'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Obra</p>
                <p className="text-xs font-bold text-black dark:text-white mt-0.5 truncate">
                  {product.latestObraName}
                </p>
              </div>
            </div>
          </div>

          {/* Histórico de Compras e Preços */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-neutral-400 mb-2">
              Histórico de Compras ({history.length})
            </h3>

            <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-slate-50 dark:bg-neutral-900">
              {history.map((point, index) => {
                const isLatest = index === 0;
                const hasPointDiscount = (point.discountPercent && point.discountPercent > 0) || (point.listPriceWithoutTax && point.listPriceWithoutTax > point.unitPriceWithoutTax);
                return (
                  <div
                    key={`${point.invoiceNumber || 'fat'}-${index}`}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      isLatest ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-black dark:text-white">
                        <span>{point.storeName || 'Loja'}</span>
                        {isLatest && (
                          <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                            MAIS RECENTE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {formatSafeDate(point.date)} • {point.invoiceNumber || 'S/N'} • {point.quantity || 1} {point.unit || 'un'} • Obra: {point.obraName || 'Geral'}
                      </div>

                      {hasPointDiscount && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                          <span className="font-bold">Desconto: {point.discountPercent || 0}%</span>
                          {point.listPriceWithoutTax && (
                            <span className="text-slate-400 line-through">
                              Tabela: {Number(point.listPriceWithoutTax).toFixed(2)} €
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="font-black text-black dark:text-white font-mono text-sm">
                          {(point.unitPriceWithTax ?? 0).toFixed(2)} € <span className="text-[10px] text-emerald-500 font-bold">c/IVA</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {(point.unitPriceWithoutTax ?? 0).toFixed(2)} € s/IVA • IVA {point.taxRate || 23}%
                        </div>
                      </div>

                      {point.invoiceId && (
                        <button
                          type="button"
                          onClick={() =>
                            setInvoiceToDelete({
                              id: point.invoiceId!,
                              number: point.invoiceNumber,
                              store: point.storeName,
                            })
                          }
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                          title="Eliminar esta Fatura do sistema"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-neutral-900 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:opacity-90 transition ios-press-active shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Preço</span>
              </>
            )}
          </button>

          <button
            onClick={closeProductModal}
            className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition hover:opacity-90 shadow-sm ios-press-active"
          >
            Fechar
          </button>
        </div>

        {/* Confirmation Modal to Delete Invoice from Product Modal */}
        {invoiceToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl p-6 bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-black dark:text-white">
                Eliminar Fatura?
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
                Desejas eliminar a fatura <strong className="text-black dark:text-white font-mono">{invoiceToDelete.number}</strong> ({invoiceToDelete.store})? Os artigos desta fatura serão removidos do catálogo de preços.
              </p>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:opacity-80 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteInvoice(invoiceToDelete.id);
                    setInvoiceToDelete(null);
                  }}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-500/25 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Definitivamente</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
