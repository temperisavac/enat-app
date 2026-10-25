import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FolderKanban,
  FileText,
  Clock,
  Camera,
  Plus,
  ArrowRight,
  FileSpreadsheet,
  Package,
  Search,
  Sparkles,
  ChevronRight,
  Wallet,
  Cloud,
  Trash2,
  Receipt,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Percent,
  Layers,
  ShieldCheck,
  Building2,
  CalendarClock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import { SystemStatusCard } from './SystemStatusCard';

export const DashboardView: React.FC = () => {
  const {
    obras,
    invoices,
    labor,
    manualExpenses,
    clientPayments,
    orcamentos,
    allProducts,
    setSelectedObraId,
    setActiveTab,
    openScanner,
    currentUser,
    signInWithGoogle,
    deleteInvoice,
    clearAllData,
  } = useApp();

  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isWipingAllDataModalOpen, setIsWipingAllDataModalOpen] = useState(false);
  const [isWipingInProgress, setIsWipingInProgress] = useState(false);
  const [wipeSuccessNotice, setWipeSuccessNotice] = useState<string | null>(null);

  // Financial metrics das Faturas de Materiais e Equipamentos
  const totalMateriaisComIva = invoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0);
  const totalMateriaisSemIva = invoices.reduce((acc, i) => acc + (Number(i.subtotalWithoutTax) || 0), 0);
  const totalIvaFaturas = invoices.reduce((acc, i) => acc + (Number(i.taxAmount) || 0), 0);
  const totalMaoDeObra = labor.reduce((acc, l) => acc + (Number(l.totalCost) || 0), 0);
  const totalDespesasManuais = manualExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalDespesasExecutadas = totalMateriaisComIva + totalMaoDeObra + totalDespesasManuais;
  const totalRecebidoClientes = clientPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Orçamentos Adjudicados / Aprovados (garantindo que o valor de obras é estritamente derivado de orçamentos adjudicados e não de faturas)
  const orcamentosAdjudicados = useMemo(() => {
    return orcamentos.filter((o) => o.status === 'adjudicado' || o.status === 'aprovado');
  }, [orcamentos]);

  const totalOrcamentosAdjudicados = useMemo(() => {
    return orcamentosAdjudicados.reduce((acc, o) => acc + (Number(o.totalWithTax) || 0), 0);
  }, [orcamentosAdjudicados]);

  const totalOrcamentosAdjudicadosSemIva = useMemo(() => {
    return orcamentosAdjudicados.reduce((acc, o) => acc + (Number(o.subtotalWithoutTax) || 0), 0);
  }, [orcamentosAdjudicados]);

  // Obras adicionadas e respetivos orçamentos acordados
  const totalObrasBudget = useMemo(() => {
    return obras.reduce((acc, o) => acc + (Number(o.budget) || 0), 0);
  }, [obras]);

  const linkedObraIds = useMemo(() => {
    return new Set(orcamentosAdjudicados.map((o) => o.obraId).filter(Boolean));
  }, [orcamentosAdjudicados]);

  const unlinkedObrasBudget = useMemo(() => {
    return obras
      .filter((o) => !linkedObraIds.has(o.id))
      .reduce((acc, o) => acc + (Number(o.budget) || 0), 0);
  }, [obras, linkedObraIds]);

  // Valor Total de Obras: Derivado estritamente dos orçamentos adjudicados e orçamentos acordados nas obras (NUNCA das faturas)
  const valorTotalObrasAdjudicadas = useMemo(() => {
    return totalOrcamentosAdjudicados + unlinkedObrasBudget;
  }, [totalOrcamentosAdjudicados, unlinkedObrasBudget]);

  const obrasConcluidas = obras.filter((o) => o.status === 'concluida');
  const obrasEmCurso = obras.filter((o) => o.status === 'em_curso');

  const totalManutencoesAtivas = useMemo(() => {
    return obras.filter(
      (o) =>
        (o.equipamentos_instalados && o.equipamentos_instalados.length > 0) ||
        o.manutencao?.ativo
    ).length;
  }, [obras]);

  // Breakdown detalhado de IVA acumulado por taxas (23%, 13%, 6%, 0%)
  const ivaBreakdown = useMemo(() => {
    let iva23 = 0;
    let base23 = 0;
    let iva13 = 0;
    let base13 = 0;
    let iva6 = 0;
    let base6 = 0;
    let ivaOutro = 0;
    let baseOutro = 0;

    invoices.forEach((inv) => {
      // Se a fatura tiver itens com taxa discriminada
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item) => {
          const rate = Number(item.taxRate) || 23;
          const lineTax = (Number(item.totalWithTax) || 0) - (Number(item.totalWithoutTax) || 0);
          const lineBase = Number(item.totalWithoutTax) || 0;

          if (rate >= 22 && rate <= 24) {
            iva23 += lineTax;
            base23 += lineBase;
          } else if (rate >= 12 && rate <= 14) {
            iva13 += lineTax;
            base13 += lineBase;
          } else if (rate >= 5 && rate <= 7) {
            iva6 += lineTax;
            base6 += lineBase;
          } else {
            ivaOutro += lineTax;
            baseOutro += lineBase;
          }
        });
      } else {
        // Fallback para taxa padrão normal de 23%
        iva23 += Number(inv.taxAmount) || 0;
        base23 += Number(inv.subtotalWithoutTax) || 0;
      }
    });

    return {
      iva23,
      base23,
      iva13,
      base13,
      iva6,
      base6,
      ivaOutro,
      baseOutro,
    };
  }, [invoices]);

  // IVA Acumulado por Obra
  const ivaByObra = useMemo(() => {
    return obras
      .map((obra) => {
        const obraInvs = invoices.filter((i) => i.obraId === obra.id);
        const ivaTotal = obraInvs.reduce((acc, i) => acc + (Number(i.taxAmount) || 0), 0);
        const baseTotal = obraInvs.reduce((acc, i) => acc + (Number(i.subtotalWithoutTax) || 0), 0);
        const comIvaTotal = obraInvs.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0);
        return {
          obra,
          invoiceCount: obraInvs.length,
          ivaTotal,
          baseTotal,
          comIvaTotal,
        };
      })
      .filter((o) => o.invoiceCount > 0)
      .sort((a, b) => b.ivaTotal - a.ivaTotal);
  }, [obras, invoices]);

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-28">
      {/* Cloud Sync Banner when not signed in */}
      {!currentUser && (
        <div className="p-4 sm:p-5 rounded-3xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              <Cloud className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <span>Sincronização em Nuvem (Telemóvel & PC)</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 max-w-xl">
                Inicie sessão com o seu Google para sincronizar as faturas e obras em tempo real entre o telemóvel e o computador.
              </p>
            </div>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full sm:w-auto shrink-0 py-2.5 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/25 active:scale-95"
          >
            Ligar Conta Google
          </button>
        </div>
      )}

      {/* Toast Notice */}
      {wipeSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{wipeSuccessNotice}</span>
          </div>
        </div>
      )}

      {/* Alert when invoices exist but 0 obras exist (phantom invoices) */}
      {obras.length === 0 && invoices.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Faturas detetadas no sistema ({invoices.length} faturas • {totalMateriaisComIva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5 max-w-xl">
                As obras foram eliminadas mas as faturas continuam guardadas. Pode consultá-las na nova aba <strong>Faturas</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setActiveTab('faturas')}
              className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
            >
              Ver Faturas
            </button>
          </div>
        </div>
      )}

      {/* System Status & Deployment Version Confirmation */}
      <SystemStatusCard />

      {/* Revolut Big Card: Hero is Total de Obras Adjudicadas (Derivado de Orçamentos Adjudicados e NÃO das faturas) */}
      <div className="rounded-3xl p-6 sm:p-8 revolut-card revolut-shadow relative overflow-hidden">
        {/* Revolut subtle ambient light glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-44 bg-blue-600/20 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Orçamentos Adjudicados • Enat Energias</span>
          </div>

          <span className="text-xs uppercase tracking-widest font-black text-slate-500 dark:text-neutral-400">
            Valor Total de Obras Adjudicadas
          </span>

          {/* Big Revolut Currency Display: Total derivado estritamente dos orçamentos adjudicados/aprovados e NUNCA de faturas */}
          <div className="flex items-baseline justify-center my-1 tracking-tight">
            <span className="text-4xl sm:text-6xl font-black font-mono text-black dark:text-white">
              {valorTotalObrasAdjudicadas.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold ml-1.5 text-emerald-500">€</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium max-w-lg mt-0.5">
            {valorTotalObrasAdjudicadas === 0
              ? 'Nenhum orçamento adjudicado registado. (Este valor é derivado dos orçamentos adjudicados e nunca das faturas).'
              : `${orcamentosAdjudicados.length} ${orcamentosAdjudicados.length === 1 ? 'orçamento adjudicado' : 'orçamentos adjudicados'} (${totalOrcamentosAdjudicados.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €) • ${obras.length} ${obras.length === 1 ? 'obra registada' : 'obras registadas'} • Derivado de orçamentos`}
          </p>

          {/* Revolut Iconic Circular Action Buttons Row */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 flex-wrap">
            <div onClick={() => setActiveTab('obras')} className="revolut-circle-btn">
              <div className="revolut-circle-icon active-blue">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Nova Obra</span>
            </div>

            <div onClick={() => openScanner()} className="revolut-circle-btn">
              <div className="revolut-circle-icon">
                <Camera className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Ler Fatura</span>
            </div>

            <div onClick={() => setActiveTab('faturas')} className="revolut-circle-btn">
              <div className="revolut-circle-icon">
                <Receipt className="w-5 h-5 stroke-[2.2] text-blue-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Faturas</span>
            </div>

            <div onClick={() => setActiveTab('orcamentos')} className="revolut-circle-btn">
              <div className="revolut-circle-icon">
                <Calculator className="w-5 h-5 stroke-[2.2] text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Orçamentos</span>
            </div>

            <div onClick={() => setActiveTab('manutencoes')} className="revolut-circle-btn">
              <div className="revolut-circle-icon">
                <CalendarClock className="w-5 h-5 stroke-[2.2] text-emerald-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Manutenções</span>
            </div>

            <div onClick={() => setActiveTab('materiais')} className="revolut-circle-btn">
              <div className="revolut-circle-icon">
                <Search className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Preços</span>
            </div>

            <div onClick={() => setActiveTab('sheets')} className="revolut-circle-btn">
              <div className="revolut-circle-icon">
                <FileSpreadsheet className="w-5 h-5 stroke-[2.2] text-emerald-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Sheets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Total Despesas Executadas (Materiais + Mão de Obra + Manuais) */}
        <div className="p-5 rounded-3xl revolut-card revolut-shadow border border-rose-500/20 bg-rose-500/[0.03]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 block">
              Total de Despesas (Custos)
            </span>
            <p className="text-xl sm:text-2xl font-black mt-1 font-mono text-black dark:text-white">
              {totalDespesasExecutadas.toFixed(2)} €
            </p>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
              Gastos em Materiais e Mão de Obra
            </span>
          </div>
        </div>

        {/* Card 2: Total IVA das Faturas (Ao lado do Total de Despesas) */}
        <div
          onClick={() => setActiveTab('faturas')}
          className="p-5 rounded-3xl revolut-card revolut-shadow border border-indigo-500/20 bg-indigo-500/[0.03] cursor-pointer hover:border-indigo-500/40 transition group"
          title="Ver todas as faturas anexadas com IVA discriminado"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Total IVA Acumulado
              </span>
              <p className="text-xl sm:text-2xl font-black mt-1 font-mono text-indigo-600 dark:text-indigo-400">
                {totalIvaFaturas.toFixed(2)} €
              </p>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                IVA suportado ({invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'})
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Card 3: Materiais (c/ IVA) */}
        <div
          onClick={() => setActiveTab('faturas')}
          className="p-5 rounded-3xl revolut-card revolut-shadow flex items-center justify-between cursor-pointer hover:border-blue-500/30 transition group"
          title="Ver todas as faturas na aba Faturas"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-500 group-hover:text-blue-500 transition-colors">
              Materiais (c/ IVA)
            </span>
            <p className="text-xl sm:text-2xl font-black mt-0.5 font-mono text-black dark:text-white">
              {totalMateriaisComIva.toFixed(2)} €
            </p>
            <span className="text-[11px] text-blue-500 font-bold block mt-0.5 flex items-center gap-0.5">
              <span>{invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Card 4: Mão de Obra */}
        <div className="p-5 rounded-3xl revolut-card revolut-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Mão de Obra
            </span>
            <p className="text-xl sm:text-2xl font-black mt-0.5 font-mono">
              {totalMaoDeObra.toFixed(2)} €
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {labor.length} {labor.length === 1 ? 'serviço' : 'serviços'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Card 5: Pastas de Obras */}
        <div
          onClick={() => setActiveTab('obras')}
          className="p-5 rounded-3xl revolut-card revolut-shadow flex items-center justify-between cursor-pointer hover:border-amber-500/30 transition group"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-500 group-hover:text-amber-500 transition-colors">
              Pastas de Obras
            </span>
            <p className="text-xl sm:text-2xl font-black mt-0.5 font-mono">
              {obras.length}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {obrasEmCurso.length} em curso • {obrasConcluidas.length} concluídas
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FolderKanban className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Card 6: Centro de Manutenções Sazonais */}
        <div
          onClick={() => setActiveTab('manutencoes')}
          className="p-5 rounded-3xl revolut-card revolut-shadow flex items-center justify-between cursor-pointer hover:border-emerald-500/30 border border-emerald-500/20 bg-emerald-500/[0.03] transition group"
          title="Ver Centro de Manutenções e Lembretes Sazonais"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors">
              Manutenções
            </span>
            <p className="text-xl sm:text-2xl font-black mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">
              {totalManutencoesAtivas}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5 flex items-center gap-0.5">
              <span>{totalManutencoesAtivas === 1 ? '1 ativa' : `${totalManutencoesAtivas} ativas`}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarClock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* NOVO: PAINEL DE RESUMO DE IVA ACUMULADO NA DASHBOARD */}
      <div className="p-6 sm:p-7 rounded-3xl revolut-card revolut-shadow border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.04] via-blue-500/[0.02] to-transparent relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                <Receipt className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                    Painel de Resumo de IVA Acumulado
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Fiscais & Fornecedores
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Montante total de IVA suportado nas faturas de compra de materiais e equipamentos para reporte à contabilidade e dedução fiscal.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setActiveTab('faturas')}
                className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <span>Ver Todas as Faturas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 Main Highlights: Total IVA Acumulado, Base Tributável, Total Bruto com IVA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Total IVA Dedutível Acumulado */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 relative overflow-hidden">
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Total IVA Acumulado
                </span>
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700 dark:text-indigo-300">
                  {totalIvaFaturas.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg font-bold text-indigo-500">€</span>
              </div>
              <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/80 font-medium">
                {invoices.length} {invoices.length === 1 ? 'fatura processada' : 'faturas processadas no sistema'}
              </p>
            </div>

            {/* Card 2: Base Tributável s/ IVA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Base Tributável (s/ IVA)
                </span>
                <Percent className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-black dark:text-white">
                  {totalMateriaisSemIva.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg font-bold text-slate-400">€</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                Valor líquido faturado pelos fornecedores
              </p>
            </div>

            {/* Card 3: Total Bruto c/ IVA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Total Bruto (c/ IVA)
                </span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-black dark:text-white">
                  {totalMateriaisComIva.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg font-bold text-slate-400">€</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                Despesa total liquidada aos fornecedores
              </p>
            </div>
          </div>

          {/* Breakdown por Taxas de IVA e Top Obras */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-2 border-t border-black/5 dark:border-white/5">
            {/* Tax Rate Distribution */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Distribuição por Escalão de IVA
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-0.5">
                    <span>Taxa Normal (23%)</span>
                  </div>
                  <span className="text-sm font-black font-mono text-black dark:text-white block">
                    {ivaBreakdown.iva23.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Base: {ivaBreakdown.base23.toLocaleString('pt-PT', { minimumFractionDigits: 0 })} €
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-0.5">
                    <span>Taxa Interm. (13%)</span>
                  </div>
                  <span className="text-sm font-black font-mono text-black dark:text-white block">
                    {ivaBreakdown.iva13.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Base: {ivaBreakdown.base13.toLocaleString('pt-PT', { minimumFractionDigits: 0 })} €
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-0.5">
                    <span>Taxa Reduz. (6%)</span>
                  </div>
                  <span className="text-sm font-black font-mono text-black dark:text-white block">
                    {ivaBreakdown.iva6.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Base: {ivaBreakdown.base6.toLocaleString('pt-PT', { minimumFractionDigits: 0 })} €
                  </span>
                </div>
              </div>
            </div>

            {/* IVA por Obra Associada */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                IVA Acumulado por Obra
              </span>
              {ivaByObra.length === 0 ? (
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-center text-xs text-slate-400">
                  Nenhuma obra com faturas associadas com IVA registado.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pr-1">
                  {ivaByObra.slice(0, 4).map(({ obra, invoiceCount, ivaTotal, comIvaTotal }) => (
                    <div
                      key={obra.id}
                      onClick={() => {
                        setSelectedObraId(obra.id);
                        setActiveTab('obras');
                      }}
                      className="p-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-bold text-black dark:text-white truncate">
                          {obra.name}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          ({invoiceCount} {invoiceCount === 1 ? 'fatura' : 'faturas'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {ivaTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € IVA
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access to Orçamentos (Enat Energias) */}
      <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-black dark:text-white">
                Propostas & Orçamentos (Enat Energias)
              </h3>
              <span className="py-0.5 px-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                {orcamentos.length} {orcamentos.length === 1 ? 'proposta' : 'propostas'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 max-w-xl">
              Crie orçamentos para Bombas de Calor, Ar Condicionado, VMC ou UPAC e gere PDFs executivos com logo da Enat e condições comerciais.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setActiveTab('orcamentos')}
            className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-500/20 active:scale-95"
          >
            <span>Aceder aos Orçamentos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Obras Recentes */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pastas de Obras
          </h2>
          {obras.length > 0 && (
            <button
              onClick={() => setActiveTab('obras')}
              className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-0.5"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {obras.length === 0 ? (
          <div className="p-8 rounded-3xl revolut-card revolut-shadow border border-dashed border-white/10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 mb-3">
              <FolderKanban className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold">Sem obras criadas</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-0.5">
              Cria uma obra para associares as tuas faturas e custos de materiais.
            </p>
            <button
              onClick={() => setActiveTab('obras')}
              className="mt-4 px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-slate-200 transition ios-press-active shadow-sm"
            >
              + Criar Obra
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {obras.map((obra) => {
              const obraInvs = invoices.filter((i) => i.obraId === obra.id);
              const obraLab = labor.filter((l) => l.obraId === obra.id);
              const obraExp = manualExpenses.filter((e) => e.obraId === obra.id);
              const total =
                obraInvs.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0) +
                obraLab.reduce((acc, l) => acc + (Number(l.totalCost) || 0), 0) +
                obraExp.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
              const pct = obra.budget > 0 ? (total / obra.budget) * 100 : 0;

              return (
                <div
                  key={obra.id}
                  onClick={() => {
                    setSelectedObraId(obra.id);
                    setActiveTab('obras');
                  }}
                  className="p-5 rounded-3xl revolut-card revolut-shadow hover:border-blue-500/40 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      {obra.client}
                    </span>
                    <span className="text-sm font-black font-mono">
                      {total.toFixed(2)} €
                    </span>
                  </div>

                  <h3 className="text-sm font-bold group-hover:text-blue-400 transition line-clamp-1">
                    {obra.name}
                  </h3>

                  <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 100 ? 'bg-rose-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                    <span>{pct.toFixed(0)}% do orçamento</span>
                    <span>{obra.budget.toLocaleString('pt-PT')} €</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico Recente de Faturas */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Últimas Faturas Registadas
          </h2>
          {invoices.length > 0 && (
            <button
              onClick={() => setActiveTab('faturas')}
              className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-0.5"
            >
              <span>Ver todas as faturas ({invoices.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 rounded-3xl revolut-card revolut-shadow border border-dashed border-white/10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-bold">Sem faturas no sistema</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-0.5">
              Tira uma foto a uma fatura com a câmara do telemóvel para a IA extrair linhas e preços automaticamente.
            </p>
            <button
              onClick={() => openScanner()}
              className="mt-4 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 ios-press-active"
            >
              Digitalizar Fatura
            </button>
          </div>
        ) : (
          <div className="rounded-3xl revolut-card revolut-shadow overflow-hidden divide-y divide-white/5">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  if (inv.obraId && obras.some((o) => o.id === inv.obraId)) {
                    setSelectedObraId(inv.obraId);
                    setActiveTab('obras');
                  } else {
                    setActiveTab('faturas');
                  }
                }}
                className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-black dark:text-white group-hover:text-blue-500 transition-colors">
                      {inv.storeName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{inv.invoiceNumber}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {new Date(inv.date).toLocaleDateString('pt-PT')} • {inv.items.length} itens
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black font-mono block text-black dark:text-white">
                      {inv.totalWithTax.toFixed(2)} €
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {inv.subtotalWithoutTax.toFixed(2)} € s/IVA
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInvoiceToDelete(inv);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                    title="Eliminar Fatura"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maintenance / Data Reset Card */}
      {(obras.length > 0 || invoices.length > 0 || labor.length > 0) && (
        <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-neutral-400 block">
              Manutenção e Limpeza de Dados
            </span>
            <span className="text-[11px] text-slate-400">
              Elimina todas as obras, faturas e registos da aplicação e da Nuvem (totais a 0,00 €).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsWipingAllDataModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Todos os Dados (0,00 €)</span>
          </button>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl p-6 bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white">
              Eliminar Fatura?
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
              Tens a certeza que desejas eliminar a fatura <strong className="text-black dark:text-white font-mono">{invoiceToDelete.invoiceNumber}</strong> ({invoiceToDelete.storeName}) no valor de <strong className="text-black dark:text-white font-mono">{invoiceToDelete.totalWithTax.toFixed(2)} €</strong>?
            </p>
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 text-[11px] text-slate-500 space-y-1">
              <div>• Os {invoiceToDelete.items.length} artigos associados serão removidos do sistema.</div>
              <div>• O total de despesas e os orçamentos serão recalculados imediatamente.</div>
            </div>
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

      {/* Wipe All Data Confirmation Modal */}
      {isWipingAllDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl p-6 bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white">
              Limpar Todos os Dados da Aplicação?
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
              Esta ação irá eliminar <strong>todas as {obras.length} obras</strong>, <strong>todas as {invoices.length} faturas</strong> e todos os registos guardados tanto neste dispositivo como na Nuvem Google (Firestore).
            </p>
            <div className="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300 space-y-1">
              <div>• Todos os valores da Dashboard passarão para <strong>0,00 €</strong>.</div>
              <div>• Não voltarão a aparecer valores fantasma de faturas antigas.</div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsWipingAllDataModalOpen(false)}
                disabled={isWipingInProgress}
                className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:opacity-80 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsWipingInProgress(true);
                  await clearAllData();
                  setIsWipingInProgress(false);
                  setIsWipingAllDataModalOpen(false);
                  setWipeSuccessNotice('Todos os dados foram limpos com sucesso! Os totais estão a 0,00 €.');
                  setTimeout(() => setWipeSuccessNotice(null), 5000);
                }}
                disabled={isWipingInProgress}
                className="px-5 py-2 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-500/25 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isWipingInProgress ? 'A limpar...' : 'Sim, Limpar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
