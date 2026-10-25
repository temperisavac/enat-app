import React, { useState } from 'react';
import { Package, Search, ArrowRight, Camera, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MaterialCategory } from '../types';

const CATEGORIES: ('Todos' | MaterialCategory)[] = [
  'Todos',
  'Acessórios & Fixação',
  'Canalização & Tubagens',
  'Material Elétrico',
  'Máquinas & Equipamentos',
  'Ferramentas & Equipamento',
  'Construção Civil',
  'Outros',
];

export const MaterialsCatalogueView: React.FC = () => {
  const { allProducts, openProductModal, openScanner, selectedProductForModal } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [filterQuery, setFilterQuery] = useState('');

  // Clear filter query when exiting product modal
  const prevModalState = React.useRef(selectedProductForModal);
  React.useEffect(() => {
    if (prevModalState.current && !selectedProductForModal) {
      setFilterQuery('');
    }
    prevModalState.current = selectedProductForModal;
  }, [selectedProductForModal]);

  const filtered = allProducts.filter((p) => {
    const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesText =
      p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.latestStoreName.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesCat && matchesText;
  });

  return (
    <div className="space-y-6 pb-28">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
            Consulta de Preços
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Base de dados de produtos reais das faturas e histórico de preços
          </p>
        </div>

        {allProducts.length > 0 && (
          <button
            onClick={() => openScanner()}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 ios-press-active self-start sm:self-auto"
          >
            <Camera className="w-4 h-4 stroke-[2.2]" />
            <span>Digitalizar Fatura</span>
          </button>
        )}
      </div>

      {allProducts.length === 0 ? (
        <div className="p-12 rounded-3xl revolut-card revolut-shadow border border-dashed border-slate-300 dark:border-neutral-800 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3.5">
            <Package className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-black dark:text-white">Sem artigos registados</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mt-1">
            À medida que adicionares faturas das tuas obras, os produtos e fornecedores aparecem aqui com histórico de variação de preços e consulta rápida.
          </p>
          <button
            onClick={() => openScanner()}
            className="mt-5 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition shadow-sm ios-press-active"
          >
            + Digitalizar Primeira Fatura
          </button>
        </div>
      ) : (
        <>
          {/* Category Pills Slider */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Local Filter Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar artigos..."
              className="w-full pl-10 pr-10 py-2 rounded-full bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-3 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-black dark:hover:text-white transition"
                title="Limpar filtro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map((product) => (
              <div
                key={product.name}
                onClick={() => {
                  setFilterQuery('');
                  openProductModal(product);
                }}
                className="p-5 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 flex flex-col justify-between hover:border-blue-500/40 cursor-pointer transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {product.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {product.latestStoreName}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-black dark:text-white group-hover:text-blue-500 transition line-clamp-2">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-black dark:text-white font-mono">
                      {(Number(product.latestPriceWithTax) || 0).toFixed(2)} €{' '}
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">/{product.unit || 'un'} c/IVA</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                      {(Number(product.latestPriceWithoutTax) || 0).toFixed(2)} € s/IVA • IVA {product.latestTaxRate || 23}%
                    </div>
                    {(Number(product.latestDiscountPercent) || 0) > 0 && (
                      <div className="mt-1">
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                          -{product.latestDiscountPercent}% desconto
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
