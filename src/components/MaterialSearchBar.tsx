import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ShoppingBag, ArrowRight, FileText, Calendar, FolderKanban, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { searchProducts, searchInvoicesByStore, StoreInvoiceSearchResult } from '../utils/materialSearch';
import { ProductDetailInfo } from '../types';

export const MaterialSearchBar: React.FC = () => {
  const { allProducts, invoices, obras, openProductModal, setSelectedObraId, setActiveTab, isDarkMode, selectedProductForModal } = useApp();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search materials (deduplicated with latest corrected prices)
  const productResults = React.useMemo(() => {
    return searchProducts(allProducts, query);
  }, [allProducts, query]);

  // Search invoices by store/supplier name
  const storeInvoiceResults = React.useMemo(() => {
    return searchInvoicesByStore(invoices, obras, query);
  }, [invoices, obras, query]);

  const totalResultsCount = productResults.length + storeInvoiceResults.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure query is completely cleared when user exits or closes the product modal
  const prevModalProduct = useRef(selectedProductForModal);
  useEffect(() => {
    if (prevModalProduct.current && !selectedProductForModal) {
      setQuery('');
      setIsOpen(false);
    }
    prevModalProduct.current = selectedProductForModal;
  }, [selectedProductForModal]);

  const handleSelectProduct = (product: ProductDetailInfo) => {
    setQuery('');
    setIsOpen(false);
    openProductModal(product);
  };

  const handleSelectInvoice = (item: StoreInvoiceSearchResult) => {
    setQuery('');
    setIsOpen(false);
    setSelectedObraId(null);
    setActiveTab('faturas');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-50">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 dark:text-neutral-500 pointer-events-none flex items-center">
          <Search className="w-4 h-4 stroke-[2.2]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Pesquisar produto"
          className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 text-xs sm:text-sm rounded-full bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white transition"
            title="Limpar pesquisa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List - Full Mobile Width & High Contrast */}
      {isOpen && query.trim().length > 0 && (
        <div
          style={{ backgroundColor: isDarkMode ? '#141418' : '#ffffff', opacity: 1 }}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 w-[calc(100vw-1.5rem)] sm:w-full max-w-xl max-h-[460px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-neutral-800 py-1.5 z-50 shadow-2xl bg-white dark:bg-[#141418]"
        >
          {totalResultsCount === 0 ? (
            /* Empty state when nothing matches */
            <div className="px-6 py-8 text-center bg-white dark:bg-[#141418]">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500">
                <Search className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-semibold text-black dark:text-white">
                Nenhum produto ou loja encontrado.
              </p>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
                Tente pesquisar por nome do material, ferramentas ou fornecedor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              
              {/* SECTION 1: MATCHING MATERIALS & PRODUCTS (PRIMARY) */}
              {productResults.length > 0 && (
                <div className="bg-white dark:bg-[#141418]">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-[#1a1a20] border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-neutral-300">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Artigos Encontrados ({productResults.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Toque para ver ficha do produto</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                    {productResults.map((product, idx) => {
                      const hasDiscount = product.latestDiscountPercent > 0 || (product.latestListPriceWithoutTax > product.latestPriceWithoutTax);
                      return (
                        <button
                          type="button"
                          key={`${product.name}-${idx}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectProduct(product);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1e1e26] transition-colors flex items-start justify-between gap-3 group bg-white dark:bg-[#141418]"
                        >
                          {/* Product Info on Left */}
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                {product.category}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 truncate">
                                {product.latestStoreName}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-black dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                              {product.name}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                              <span>{new Date(product.latestDate).toLocaleDateString('pt-PT')}</span>
                              <span>•</span>
                              <span className="font-mono">por {product.unit}</span>
                              {product.latestInvoiceNumber && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">Fat: {product.latestInvoiceNumber}</span>
                                </>
                              )}
                            </div>

                            {/* Discount details badge */}
                            {hasDiscount && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                  Desc: {product.latestDiscountPercent}%
                                </span>
                                {product.latestListPriceWithoutTax > 0 && (
                                  <span className="text-[10px] text-slate-400 line-through font-mono">
                                    Tabela: {product.latestListPriceWithoutTax.toFixed(2)} €
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Price Details on Right */}
                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {product.latestPriceWithTax.toFixed(2)} € <span className="text-[10px] font-bold">c/IVA</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono whitespace-nowrap mt-0.5">
                              {product.latestPriceWithoutTax.toFixed(2)} € <span className="text-[10px]">s/IVA</span>
                            </div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              IVA {product.latestTaxRate}%
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: INVOICES MATCHED BY STORE NAME (SECONDARY) */}
              {storeInvoiceResults.length > 0 && (
                <div className="bg-white dark:bg-[#141418]">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-[#1a1a20] border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-neutral-300">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400">
                      <Store className="w-3.5 h-3.5" />
                      Faturas da Loja ({storeInvoiceResults.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Abrir na pasta da obra</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                    {storeInvoiceResults.map(({ invoice: inv, obraName }) => (
                      <button
                        type="button"
                        key={inv.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectInvoice({ invoice: inv, obraName, matchedByStore: true });
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1e1e26] transition-colors flex items-center justify-between gap-3 group bg-white dark:bg-[#141418]"
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-black dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {inv.storeName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 shrink-0">
                              {inv.invoiceNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                            {new Date(inv.date).toLocaleDateString('pt-PT')} • Obra: <span className="font-medium text-black dark:text-white">{obraName}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black font-mono text-black dark:text-white">
                            {inv.totalWithTax.toFixed(2)} €
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
