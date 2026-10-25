import React, { useState } from 'react';
import { Plus, FolderKanban, MapPin, User, Calendar, ArrowRight, Trash2, Layers, ChevronDown, ChevronUp, CheckCircle2, TrendingUp, FileDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Obra, DEFAULT_OBRA_TOPICS } from '../types';
import { calculateObraFinances } from '../utils/obraAnalytics';
import { generateObraPDFReport } from '../utils/pdfGenerator';

export const ObrasListView: React.FC = () => {
  const { obras, invoices, labor, manualExpenses, clientPayments, setSelectedObraId, addObra, deleteObra, openScanner } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isCreatingObra, setIsCreatingObra] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [topicBudgets, setTopicBudgets] = useState<Record<string, string>>({});
  const [showTopicBudgets, setShowTopicBudgets] = useState(false);

  const filteredObras = obras.filter((o) => {
    if (filterStatus === 'todos') return true;
    return o.status === filterStatus;
  });

  const sumTopicBudgets = Object.values(topicBudgets).reduce((acc, val) => {
    const num = parseFloat(String(val).replace(',', '.')) || 0;
    return acc + num;
  }, 0);

  const handleTopicBudgetChange = (topic: string, rawVal: string) => {
    const updated = { ...topicBudgets, [topic]: rawVal };
    setTopicBudgets(updated);
    const newSum = Object.values(updated).reduce((acc, v) => {
      const num = parseFloat(String(v).replace(',', '.')) || 0;
      return acc + num;
    }, 0);
    // If budget input is empty or matches previous sum, update budget with new sum
    const currentParsedBudget = parseFloat(budget.replace(',', '.')) || 0;
    if (!budget || currentParsedBudget === sumTopicBudgets) {
      setBudget(newSum > 0 ? (Number.isInteger(newSum) ? String(newSum) : newSum.toFixed(2).replace('.', ',')) : '');
    }
  };

  const handleCreateObra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Filter out 0 or undefined topic budgets
    const cleanedTopicBudgets: Record<string, number> = {};
    Object.entries(topicBudgets).forEach(([t, val]) => {
      const num = parseFloat(String(val).replace(',', '.')) || 0;
      if (num > 0) {
        cleanedTopicBudgets[t] = num;
      }
    });

    const finalBudget = parseFloat(budget.replace(',', '.')) || sumTopicBudgets || 0;

    const newId = addObra({
      name: name.trim(),
      client: client.trim() || 'Cliente Particular',
      clientPhone: clientPhone.trim() || undefined,
      address: address.trim() || 'Portugal',
      budget: finalBudget,
      status: 'em_curso',
      startDate: startDate || new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      topicBudgets: Object.keys(cleanedTopicBudgets).length > 0 ? cleanedTopicBudgets : undefined,
    });

    setName('');
    setClient('');
    setClientPhone('');
    setAddress('');
    setBudget('');
    setNotes('');
    setTopicBudgets({});
    setShowTopicBudgets(false);
    setIsCreatingObra(false);
    setSelectedObraId(newId);
  };

  const handleDownloadObraPDF = (targetObra: Obra) => {
    try {
      const obraInvoices = invoices.filter((i) => i.obraId === targetObra.id);
      const obraLabor = labor.filter((l) => l.obraId === targetObra.id);
      const obraExpenses = (manualExpenses || []).filter((e) => e.obraId === targetObra.id);
      const obraPayments = (clientPayments || []).filter((p) => p.obraId === targetObra.id);

      const finances = calculateObraFinances(
        targetObra,
        obraInvoices,
        obraLabor,
        obraExpenses,
        obraPayments
      );

      const doc = generateObraPDFReport(
        targetObra,
        finances,
        obraInvoices,
        obraLabor,
        obraExpenses,
        obraPayments
      );

      const safeName = (targetObra.name || 'Obra')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`Relatorio_Obra_${safeName}_${dateStr}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da obra:', err);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
            Pastas de Obras
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Gestão financeira de projetos, faturas e mão de obra
          </p>
        </div>

        <button
          onClick={() => setIsCreatingObra(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition shadow-md hover:opacity-90 ios-press-active self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Criar Obra</span>
        </button>
      </div>

      {/* Filter Tabs */}
      {obras.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'em_curso', label: 'Em Curso' },
            { id: 'orcamento', label: 'Em Orçamento' },
            { id: 'concluida', label: 'Concluídas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Create Obra Modal */}
      {isCreatingObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl revolut-card revolut-shadow border border-black/10 dark:border-white/10 p-6 space-y-4 bg-white dark:bg-[#121216] animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div>
                <h2 className="text-lg font-black text-black dark:text-white">Criar Nova Pasta de Obra</h2>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Regista a obra e define os orçamentos/venda ao cliente por categoria
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateObra} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Nome do Projeto / Obra *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Vivenda Cascais - Climatização"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">Cliente / Empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do cliente"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">Telemóvel (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="ex: 912 345 678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Orçamento (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="ex: 15000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">Localização / Morada</label>
                  <input
                    type="text"
                    placeholder="Morada da obra"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Orçamento por Categoria (Opcional - VMC, Bomba AQS, Climatização, AC, UPAC, etc.) */}
              <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-neutral-900/60">
                <button
                  type="button"
                  onClick={() => setShowTopicBudgets(!showTopicBudgets)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-black dark:text-white block text-xs sm:text-sm">
                        Orçamento por Categoria / Faturação Cliente
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                        {sumTopicBudgets > 0
                          ? `Total por tópicos: ${sumTopicBudgets.toLocaleString('pt-PT')} € (Clique para expandir)`
                          : 'VMC, Bomba AQS, Climatização, AC, UPAC, etc. (Opcional)'}
                      </span>
                    </div>
                  </div>
                  {showTopicBudgets ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showTopicBudgets && (
                  <div className="p-4 pt-1 border-t border-black/5 dark:border-white/5 space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Define quanto orçaste / vendeste ao cliente por especialidade. O sistema calcula automaticamente o lucro em cada categoria e no total da obra.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {DEFAULT_OBRA_TOPICS.map((topic) => (
                        <div
                          key={topic}
                          className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/5 flex flex-col justify-between"
                        >
                          <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-200 truncate mb-1">
                            {topic}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={topicBudgets[topic] || ''}
                              onChange={(e) => handleTopicBudgetChange(topic, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                              €
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {sumTopicBudgets > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
                        <span className="text-slate-500 dark:text-neutral-400 font-medium">Soma das categorias:</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {sumTopicBudgets.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">Notas / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais da obra..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreatingObra(false)}
                  className="px-4 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold shadow-md hover:opacity-90"
                >
                  Guardar Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State or Grid */}
      {obras.length === 0 ? (
        <div className="p-12 rounded-3xl revolut-card revolut-shadow border border-dashed border-slate-300 dark:border-neutral-800 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-neutral-900 flex items-center justify-center text-slate-400 dark:text-neutral-500 mb-3.5">
            <FolderKanban className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-black dark:text-white">Sem obras registadas</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mt-1">
            Cria a primeira pasta de obra para começares a associar faturas de materiais e registos de trabalho.
          </p>
          <button
            onClick={() => setIsCreatingObra(true)}
            className="mt-5 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition shadow-sm ios-press-active"
          >
            + Criar Obra Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredObras.map((obra) => {
            const obraInvoices = invoices.filter((i) => i.obraId === obra.id);
            const obraLabor = labor.filter((l) => l.obraId === obra.id);

            const totalMateriais = obraInvoices.reduce((acc, i) => acc + i.totalWithTax, 0);
            const totalMaoDeObra = obraLabor.reduce((acc, l) => acc + l.totalCost, 0);
            const totalGeral = totalMateriais + totalMaoDeObra;

            const totalOrcadoCategorias = obra.topicBudgets
              ? Object.values(obra.topicBudgets).reduce((acc, val) => acc + (val || 0), 0)
              : 0;
            const orcamentoRef = totalOrcadoCategorias > 0 ? totalOrcadoCategorias : obra.budget;
            const lucroEstimado = orcamentoRef - totalGeral;
            const percentLucro = orcamentoRef > 0 ? ((lucroEstimado / orcamentoRef) * 100).toFixed(1) : null;
            const percentGasto = orcamentoRef > 0 ? (totalGeral / orcamentoRef) * 100 : 0;
            const isCompleted = obra.status === 'concluida';

            return (
              <div
                key={obra.id}
                className={`rounded-3xl revolut-card revolut-shadow border p-5 flex flex-col justify-between hover:border-blue-500/40 transition group relative ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/5'
                    : 'border-black/5 dark:border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold'
                          : obra.status === 'em_curso'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> : null}
                      <span>{isCompleted ? 'Concluída' : obra.status === 'em_curso' ? 'Em Curso' : 'Orçamento'}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem a certeza que deseja eliminar a obra "${obra.name}"?`)) {
                          deleteObra(obra.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition"
                      title="Eliminar Obra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3
                    onClick={() => setSelectedObraId(obra.id)}
                    className="text-base font-bold text-black dark:text-white group-hover:text-blue-500 transition cursor-pointer"
                  >
                    {obra.name}
                  </h3>

                  <div className="space-y-1 mt-2 text-xs text-slate-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{obra.client}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{obra.address}</span>
                    </div>
                  </div>

                  {/* Gastos / Orçamento e Margem */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-400 font-medium">Gasto / Orçado</span>
                      <span className="font-bold text-black dark:text-white font-mono">
                        {totalGeral.toFixed(2)} €{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          / {orcamentoRef.toLocaleString('pt-PT')}€
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percentGasto > 100
                            ? 'bg-rose-500'
                            : percentGasto > 80
                            ? 'bg-amber-500'
                            : isCompleted
                            ? 'bg-emerald-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(percentGasto, 100)}%` }}
                      />
                    </div>

                    {/* Lucro e % de Lucro em destaque */}
                    {orcamentoRef > 0 && (
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400 font-medium">
                          {isCompleted ? 'Lucro Final:' : 'Lucro Previsto:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold ${
                              lucroEstimado >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {lucroEstimado >= 0 ? '+' : ''}
                            {lucroEstimado.toFixed(2)} €
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                              lucroEstimado >= 0
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {percentLucro}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {obraInvoices.length} faturas • {obraLabor.length} serviços
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadObraPDF(obra);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-black dark:text-neutral-300 dark:hover:text-white px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition active:scale-95"
                      title="Descarregar relatório executivo em PDF desta obra"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-500" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={() => setSelectedObraId(obra.id)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
