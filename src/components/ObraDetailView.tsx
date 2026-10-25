import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Camera,
  FileText,
  Clock,
  User,
  MapPin,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Banknote,
  Receipt,
  Layers,
  Wrench,
  Zap,
  Flame,
  Droplet,
  HardHat,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Tag,
  Sliders,
  Settings,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Sun,
  Wind,
  Thermometer,
  Download,
  FileDown,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Percent,
  Calculator,
  Scale,
  Landmark,
  PiggyBank,
  HelpCircle,
  ArrowRight,
  Copy,
  CheckCheck,
  Printer,
  BookOpen,
  CalendarClock,
  Send,
  MessageSquare,
  Phone,
  Waves,
  ThermometerSnowflake,
} from 'lucide-react';
import {
  calculateObraFiscalProfit,
  calculateObraOfficialReport,
  generateObraFinancialMarkdownReport,
  parseFreeTextToFinancialReport,
  ObraOfficialFinancialReportData,
} from '../utils/portugueseTaxUtils';
import { useApp } from '../context/AppContext';
import {
  Invoice,
  ManualExpense,
  ClientPayment,
  LaborRecord,
  ObraAIAnalysis,
  MaterialCategory,
  DEFAULT_OBRA_TOPICS,
  INVOICE_CATEGORY_OPTIONS,
  EquipamentoInstalado,
  ObraManutencao,
} from '../types';
import {
  CATALOGO_EQUIPAMENTOS,
  LISTA_EQUIPAMENTOS_OPCOES,
  calcularDataLembrete,
  gerarTextoLembrete,
} from '../utils/manutencoes';
import { calculateObraFinances } from '../utils/obraAnalytics';
import { generateObraPDFReport } from '../utils/pdfGenerator';
import { downloadObraCSV } from '../utils/csvExport';
import {
  normalizeInvoiceNumber,
  normalizeSupplierName,
  isPlaceholderInvoiceNumber,
} from '../utils/invoiceDuplicateUtils';

export const ObraDetailView: React.FC = () => {
  const {
    selectedObraId,
    setSelectedObraId,
    obras,
    invoices,
    labor,
    manualExpenses,
    clientPayments,
    openScanner,
    addLaborRecord,
    deleteLaborRecord,
    updateInvoice,
    deleteInvoice,
    addManualExpense,
    updateManualExpense,
    deleteManualExpense,
    addClientPayment,
    deleteClientPayment,
    updateObra,
    updateObraManutencao,
    updateObraEquipamentos,
    openProductModal,
    allProducts,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'relatorio' | 'faturas' | 'despesas' | 'pagamentos' | 'maodeobra' | 'manutencao'>('dashboard');

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
      latestObraName: obra?.name || 'Obra',
      totalQuantityPurchased: Number(item.quantity) || 1,
      minPrice: unitPriceWithoutTax,
      maxPrice: unitPriceWithoutTax,
      priceHistory: [
        {
          date: invoice.date,
          storeName: invoice.storeName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice.id,
          obraName: obra?.name || 'Obra',
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

  // Modals visibility
  const [isAddingLabor, setIsAddingLabor] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [selectedInvoiceForPhoto, setSelectedInvoiceForPhoto] = useState<Invoice | null>(null);
  const [activePhotoPageIndex, setActivePhotoPageIndex] = useState<number>(0);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Topic filters and topic budget configuration
  const [invoiceTopicFilter, setInvoiceTopicFilter] = useState<string>('todos');
  const [expenseTopicFilter, setExpenseTopicFilter] = useState<string>('todos');
  const [isEditingTopicBudgets, setIsEditingTopicBudgets] = useState<boolean>(false);
  const [isAddingCustomTopic, setIsAddingCustomTopic] = useState<boolean>(false);
  const [newCustomTopicName, setNewCustomTopicName] = useState<string>('');
  const [topicBudgetsDraft, setTopicBudgetsDraft] = useState<Record<string, string>>({});
  const [expenseTopic, setExpenseTopic] = useState<string>('Geral / Outros');

  // Obra Configuration / Edit state
  const [isEditingObraSettings, setIsEditingObraSettings] = useState<boolean>(false);
  const [editObraName, setEditObraName] = useState('');
  const [editObraClient, setEditObraClient] = useState('');
  const [editObraAddress, setEditObraAddress] = useState('');
  const [editObraBudget, setEditObraBudget] = useState('');
  const [editObraStartDate, setEditObraStartDate] = useState('');
  const [editObraStatus, setEditObraStatus] = useState<'em_curso' | 'concluida' | 'orcamento' | 'pausada'>('em_curso');
  const [editObraNotes, setEditObraNotes] = useState('');

  // PDF Report modal state
  const [showPDFModal, setShowPDFModal] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);

  // Deletion modals
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ManualExpense | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<ClientPayment | null>(null);
  const [laborToDelete, setLaborToDelete] = useState<LaborRecord | null>(null);

  // AI Analysis state
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form states - Labor
  const [laborDate, setLaborDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerName, setWorkerName] = useState('');
  const [description, setDescription] = useState('');
  const [hoursOrDays, setHoursOrDays] = useState('8');
  const [unitType, setUnitType] = useState<'horas' | 'dias'>('horas');
  const [costRate, setCostRate] = useState('20');

  // Form states - Manual Expense
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<MaterialCategory>('Acessórios & Fixação');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseSupplier, setExpenseSupplier] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'dinheiro' | 'mbway' | 'cartao' | 'transferencia' | 'outro'>('dinheiro');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Form states - Client Payment
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'cheque' | 'dinheiro' | 'mbway' | 'outro'>('transferencia');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const obra = obras.find((o) => o.id === selectedObraId);

  if (!obra) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Nenhuma obra selecionada.</p>
        <button
          onClick={() => setSelectedObraId(null)}
          className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold"
        >
          Voltar às Obras
        </button>
      </div>
    );
  }

  // Calculate complete financial analytics
  const finances = calculateObraFinances(obra, invoices, labor, manualExpenses, clientPayments);

  const obraInvoices = invoices.filter((i) => i.obraId === obra.id);
  const obraExpenses = manualExpenses.filter((e) => e.obraId === obra.id);
  const obraPayments = clientPayments.filter((p) => p.obraId === obra.id);
  const obraLabor = labor.filter((l) => l.obraId === obra.id);
  const totalIvaFaturasObra = obraInvoices.reduce((acc, i) => acc + (Number(i.taxAmount) || 0), 0);
  const totalMateriaisSemIvaObra = obraInvoices.reduce((acc, i) => acc + (Number(i.subtotalWithoutTax) || 0), 0);
  const totalMateriaisComIvaObra = obraInvoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0);

  // Detetar faturas duplicadas existentes nesta obra
  const duplicateInvoicesInThisObra = React.useMemo(() => {
    const dupsMap = new Map<string, { otherInvoice: Invoice; reason: string }>();
    for (let i = 0; i < obraInvoices.length; i++) {
      for (let j = i + 1; j < obraInvoices.length; j++) {
        const a = obraInvoices[i];
        const b = obraInvoices[j];
        const numA = normalizeInvoiceNumber(a.invoiceNumber);
        const numB = normalizeInvoiceNumber(b.invoiceNumber);
        const storeA = normalizeSupplierName(a.storeName);
        const storeB = normalizeSupplierName(b.storeName);

        let isMatch = false;
        let matchReason = '';

        if (numA && numB && numA === numB && !isPlaceholderInvoiceNumber(a.invoiceNumber)) {
          isMatch = true;
          matchReason = `Mesmo número de fatura ("${a.invoiceNumber}")`;
        } else if (
          a.totalWithTax > 0 &&
          Math.abs(a.totalWithTax - b.totalWithTax) <= 0.02 &&
          a.date === b.date &&
          storeA &&
          storeB &&
          storeA === storeB
        ) {
          isMatch = true;
          matchReason = `Mesmo fornecedor ("${a.storeName}"), data e valor total (${a.totalWithTax.toFixed(2)} €)`;
        }

        if (isMatch) {
          dupsMap.set(b.id, { otherInvoice: a, reason: matchReason });
        }
      }
    }
    return dupsMap;
  }, [obraInvoices]);

  // Modo de cálculo de rentabilidade real e apuramento de IVA: 'recebido' (pagamentos já recebidos) ou 'orcamento' (orçamento contratado)
  const [fiscalCalcMode, setFiscalCalcMode] = useState<'recebido' | 'orcamento'>(
    obraPayments.length > 0 ? 'recebido' : 'orcamento'
  );

  const valorBaseClienteComIva =
    fiscalCalcMode === 'recebido' && finances.totalRecebidoCliente > 0
      ? finances.totalRecebidoCliente
      : (obra.budget && obra.budget > 0 ? obra.budget : finances.totalRecebidoCliente);

  const fiscalAnalysis = React.useMemo(() => {
    return calculateObraFiscalProfit({
      valorFaturadoClienteComIva: valorBaseClienteComIva,
      totalIvaFaturasGastos: totalIvaFaturasObra,
      totalGastosMateriaisSemIva: totalMateriaisSemIvaObra,
      totalMaoDeObra: finances.totalMaoDeObra,
      totalOutrasDespesasManuais: finances.totalDespesasManuais,
      ivaRate: 23,
    });
  }, [
    valorBaseClienteComIva,
    totalIvaFaturasObra,
    totalMateriaisSemIvaObra,
    finances.totalMaoDeObra,
    finances.totalDespesasManuais,
  ]);

  // Breakdown de IVA da obra por taxas (23%, 13%, 6%)
  const obraIvaBreakdown = React.useMemo(() => {
    let iva23 = 0, base23 = 0;
    let iva13 = 0, base13 = 0;
    let iva6 = 0, base6 = 0;
    obraInvoices.forEach((inv) => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item) => {
          const rate = Number(item.taxRate) || 23;
          const lineTax = (Number(item.totalWithTax) || 0) - (Number(item.totalWithoutTax) || 0);
          const lineBase = Number(item.totalWithoutTax) || 0;
          if (rate >= 22 && rate <= 24) { iva23 += lineTax; base23 += lineBase; }
          else if (rate >= 12 && rate <= 14) { iva13 += lineTax; base13 += lineBase; }
          else if (rate >= 5 && rate <= 7) { iva6 += lineTax; base6 += lineBase; }
          else { iva23 += lineTax; base23 += lineBase; }
        });
      } else {
        iva23 += Number(inv.taxAmount) || 0;
        base23 += Number(inv.subtotalWithoutTax) || 0;
      }
    });
    return { iva23, base23, iva13, base13, iva6, base6 };
  }, [obraInvoices]);

  // IVA por fornecedor nas faturas desta obra (Ernes, Rexel, Sanitop, Pecomark, etc.)
  const obraIvaBySupplier = React.useMemo(() => {
    const map: Record<string, { count: number; iva: number; totalWithTax: number; base: number }> = {};
    obraInvoices.forEach((inv) => {
      const sName = inv.storeName || 'Fornecedor Diversos';
      if (!map[sName]) {
        map[sName] = { count: 0, iva: 0, totalWithTax: 0, base: 0 };
      }
      map[sName].count += 1;
      map[sName].iva += Number(inv.taxAmount) || 0;
      map[sName].totalWithTax += Number(inv.totalWithTax) || 0;
      map[sName].base += Number(inv.subtotalWithoutTax) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].iva - a[1].iva);
  }, [obraInvoices]);

  // Exact Official Financial Report Data according to Portuguese accounting specifications
  const obraOfficialReport = React.useMemo(() => {
    return calculateObraOfficialReport({
      obraName: obra.name,
      obraId: obra.id,
      clientName: obra.client,
      totalCobradoClienteComIva: valorBaseClienteComIva,
      invoices: obraInvoices,
      expenses: obraExpenses,
      labor: obraLabor,
    });
  }, [obra.name, obra.id, obra.client, valorBaseClienteComIva, obraInvoices, obraExpenses, obraLabor]);

  // Assistant & simulation states
  const [copiedReportFeedback, setCopiedReportFeedback] = useState(false);
  const [assistantInputText, setAssistantInputText] = useState('');
  const [assistantSimulatedReport, setAssistantSimulatedReport] = useState<ObraOfficialFinancialReportData | null>(null);
  const [showSupplierDetailsInReport, setShowSupplierDetailsInReport] = useState(false);

  const handleCopyFormattedReport = (dataToCopy: ObraOfficialFinancialReportData) => {
    const markdown = generateObraFinancialMarkdownReport(dataToCopy);
    navigator.clipboard.writeText(markdown);
    setCopiedReportFeedback(true);
    setTimeout(() => setCopiedReportFeedback(false), 3000);
  };

  const handleRunAssistantAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInputText.trim()) return;
    const report = parseFreeTextToFinancialReport(assistantInputText, obra.name);
    setAssistantSimulatedReport(report);
  };

  // Handle Save Labor
  const handleSaveLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim() || !description.trim()) return;

    const h = Number(hoursOrDays) || 0;
    const r = Number(costRate) || 0;
    const totalCost = Number((h * r).toFixed(2));
    addLaborRecord({
      obraId: obra.id,
      date: laborDate,
      workerName: workerName.trim(),
      description: description.trim(),
      hoursOrDays: h,
      unitType,
      costRate: r,
      totalCost,
    });

    setDescription('');
    setIsAddingLabor(false);
  };

  // Available topics for this obra
  const availableTopics = Array.from(
    new Set([
      ...DEFAULT_OBRA_TOPICS,
      ...(obra.customTopics || []),
      ...obraInvoices.map((i) => i.topic).filter(Boolean),
      ...obraExpenses.map((e) => e.topic).filter(Boolean),
    ])
  ) as string[];

  // Filtered invoices and expenses
  const filteredInvoices = obraInvoices.filter((inv) => {
    if (invoiceTopicFilter === 'todos') return true;
    return (inv.topic || 'Geral / Outros') === invoiceTopicFilter;
  });

  const filteredExpenses = obraExpenses.filter((exp) => {
    if (expenseTopicFilter === 'todos') return true;
    return (exp.topic || 'Geral / Outros') === expenseTopicFilter;
  });

  // Handle Save Manual Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount.replace(',', '.')) || 0;
    if (!expenseDescription.trim() || amt <= 0) return;

    addManualExpense({
      obraId: obra.id,
      topic: expenseTopic,
      description: expenseDescription.trim(),
      category: expenseCategory,
      amount: amt,
      date: expenseDate,
      supplierOrPlace: expenseSupplier.trim(),
      paymentMethod: expensePaymentMethod,
      notes: expenseNotes.trim(),
    });

    setExpenseDescription('');
    setExpenseAmount('');
    setExpenseSupplier('');
    setExpenseNotes('');
    setIsAddingExpense(false);
  };

  const handleOpenBudgetModal = () => {
    const drafts: Record<string, string> = {};
    availableTopics.forEach((t) => {
      drafts[t] = obra.topicBudgets?.[t] ? String(obra.topicBudgets[t]) : '';
    });
    setTopicBudgetsDraft(drafts);
    setIsEditingTopicBudgets(true);
  };

  const handleSaveTopicBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    const newBudgets: Record<string, number> = {};
    Object.entries(topicBudgetsDraft).forEach(([topic, val]) => {
      const num = Number(String(val).replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        newBudgets[topic] = num;
      }
    });
    updateObra(obra.id, { topicBudgets: newBudgets });
    setIsEditingTopicBudgets(false);
  };

  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomTopicName.trim();
    if (!trimmed) return;
    const currentCustom = obra.customTopics || [];
    if (!currentCustom.includes(trimmed) && !DEFAULT_OBRA_TOPICS.includes(trimmed as any)) {
      updateObra(obra.id, { customTopics: [...currentCustom, trimmed] });
    }
    setNewCustomTopicName('');
    setIsAddingCustomTopic(false);
  };

  const handleOpenEditObra = () => {
    setEditObraName(obra.name);
    setEditObraClient(obra.client);
    setEditObraAddress(obra.address);
    setEditObraBudget(String(obra.budget || 0));
    setEditObraStartDate(obra.startDate || new Date().toISOString().split('T')[0]);
    setEditObraStatus(obra.status || 'em_curso');
    setEditObraNotes(obra.notes || '');

    const drafts: Record<string, string> = {};
    availableTopics.forEach((t) => {
      drafts[t] = obra.topicBudgets?.[t] ? String(obra.topicBudgets[t]) : '';
    });
    setTopicBudgetsDraft(drafts);
    setIsEditingObraSettings(true);
  };

  const handleSaveObraSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObraName.trim()) return;

    const newBudgets: Record<string, number> = {};
    Object.entries(topicBudgetsDraft).forEach(([topic, val]) => {
      const num = Number(String(val).replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        newBudgets[topic] = num;
      }
    });

    updateObra(obra.id, {
      name: editObraName.trim(),
      client: editObraClient.trim() || 'Cliente Particular',
      address: editObraAddress.trim() || 'Portugal',
      budget: parseFloat(String(editObraBudget).replace(',', '.')) || 0,
      startDate: editObraStartDate,
      status: editObraStatus,
      notes: editObraNotes.trim(),
      topicBudgets: newBudgets,
    });

    setIsEditingObraSettings(false);
  };

  const handleToggleObraFinished = () => {
    const nextStatus = obra.status === 'concluida' ? 'em_curso' : 'concluida';
    updateObra(obra.id, { status: nextStatus });
  };

  const handleDownloadPDF = () => {
    if (!obra) return;
    try {
      setIsGeneratingPDF(true);
      const doc = generateObraPDFReport(
        obra,
        finances,
        obraInvoices,
        obraLabor,
        obraExpenses,
        obraPayments
      );
      const safeName = (obra.name || 'Obra')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`Relatorio_Obra_${safeName}_${dateStr}.pdf`);
      setPdfSuccessMessage('Relatório financeiro descarregado em PDF com sucesso!');
      setTimeout(() => {
        setPdfSuccessMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!obra) return;
    try {
      downloadObraCSV(
        obra,
        finances,
        obraInvoices,
        obraLabor,
        obraExpenses,
        obraPayments
      );
      setCsvSuccessMessage('Dados financeiros exportados em CSV com sucesso (compatível com Excel e Sheets)!');
      setTimeout(() => {
        setCsvSuccessMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Erro ao gerar ficheiro CSV:', err);
    }
  };

  // Handle Save Client Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount.replace(',', '.')) || 0;
    if (!paymentDescription.trim() || amt <= 0) return;

    addClientPayment({
      obraId: obra.id,
      description: paymentDescription.trim(),
      amount: amt,
      date: paymentDate,
      paymentMethod,
      receiptNumber: paymentReceipt.trim(),
      notes: paymentNotes.trim(),
    });

    setPaymentDescription('');
    setPaymentAmount('');
    setPaymentReceipt('');
    setPaymentNotes('');
    setIsAddingPayment(false);
  };

  // Run AI Financial & Engineering Audit
  const handleRunAIAnalysis = async () => {
    setIsAnalyzingAI(true);
    setAiError(null);
    try {
      const response = await fetch('/api/gemini/analyze-obra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraName: obra.name,
          clientName: obra.client,
          budget: obra.budget,
          totalGasto: finances.totalGastoObra,
          totalRecebido: finances.totalRecebidoCliente,
          saldoAReceber: finances.saldoAReceber,
          breakdown: finances.breakdown,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Falha ao processar análise inteligente.');
      }

      const newAnalysis: ObraAIAnalysis = {
        ...resData.analysis,
        lastAnalyzedAt: new Date().toISOString(),
      };

      updateObra(obra.id, { aiAnalysisCache: newAnalysis });
    } catch (err: any) {
      console.error('AI Analysis error:', err);
      setAiError(err.message || 'Erro ao conectar com a IA da Google. Tente novamente.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const aiAnalysis = obra.aiAnalysisCache;

  return (
    <div className="space-y-6 pb-28">
      {/* Top Bar with Back Button and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setSelectedObraId(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-neutral-900 text-xs font-bold text-black dark:text-white hover:opacity-80 transition shadow-sm ios-press-active"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar às Obras</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Terminar / Reabrir Obra */}
          {obra.status === 'concluida' ? (
            <button
              onClick={handleToggleObraFinished}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm shadow-amber-500/20 ios-press-active"
              title="Voltar a abrir esta obra concluída"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reabrir Obra</span>
            </button>
          ) : (
            <button
              onClick={handleToggleObraFinished}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20 ios-press-active"
              title="Marcar obra como terminada/concluída"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Terminar Obra</span>
            </button>
          )}

          {/* Botão Configurações da Obra */}
          <button
            onClick={handleOpenEditObra}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition shadow-sm ios-press-active"
            title="Editar dados da empresa, morada, orçamento e categorias"
          >
            <Settings className="w-3.5 h-3.5 text-blue-500" />
            <span>Configuração da Obra</span>
          </button>

          {/* Botão Relatório PDF */}
          <button
            onClick={() => setShowPDFModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition shadow-sm ios-press-active"
            title="Gerar e descarregar relatório executivo em PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-500" />
            <span>Relatório PDF</span>
          </button>

          {/* Botão Exportar CSV */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition shadow-sm ios-press-active"
            title="Exportar dados financeiros da obra em formato CSV para Excel ou Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsAddingExpense(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-sm shadow-orange-500/20 ios-press-active"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>+ Despesa s/ Fatura</span>
          </button>

          <button
            onClick={() => setIsAddingPayment(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20 ios-press-active"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>+ Recebimento</span>
          </button>

          <button
            onClick={() => openScanner(obra.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 ios-press-active"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Digitalizar Fatura</span>
          </button>
        </div>
      </div>

      {csvSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{csvSuccessMessage}</span>
          </div>
          <button onClick={() => setCsvSuccessMessage(null)} className="text-[11px] underline">
            Fechar
          </button>
        </div>
      )}

      {/* Obra Header Card */}
      <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-6 sm:p-8 relative overflow-hidden">
        {/* Banner de Obra Concluída se aplicável */}
        {obra.status === 'concluida' && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>OBRA TERMINADA / CONCLUÍDA</span>
              <span>•</span>
              <span className="font-mono">
                Lucro Final: {finances.lucroTotalObra >= 0 ? '+' : ''}{finances.lucroTotalObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € ({finances.margemPercentualPrevista}% de lucro)
              </span>
            </div>

            <button
              onClick={handleToggleObraFinished}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reabrir para edição</span>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  obra.status === 'concluida'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : obra.status === 'em_curso'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {obra.status === 'em_curso' ? 'Em Curso' : obra.status === 'concluida' ? 'Concluída' : 'Orçamento'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Início: {new Date(obra.startDate).toLocaleDateString('pt-PT')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
                {obra.name}
              </h1>
              <button
                onClick={handleOpenEditObra}
                className="p-1.5 rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
                title="Modificar nome, morada, orçamento e categorias"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-neutral-400">
              <span className="flex items-center gap-1 font-semibold text-black dark:text-white">
                <User className="w-3.5 h-3.5 text-blue-500" />
                {obra.client}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {obra.address}
              </span>
            </div>
          </div>

          {/* Budget & Cash Progress Header Pill */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 lg:min-w-[320px]">
            <div className="flex justify-between items-baseline text-xs mb-1">
              <span className="text-slate-400 font-semibold">Orçamento Aprovado</span>
              <span className="font-black text-black dark:text-white font-mono text-sm">
                {obra.budget.toLocaleString('pt-PT')} €
              </span>
            </div>

            {/* Spent vs Budget bar */}
            <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden my-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  finances.percentOrcamentoGasto > 100
                    ? 'bg-rose-500'
                    : finances.percentOrcamentoGasto > 80
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(finances.percentOrcamentoGasto, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className={finances.percentOrcamentoGasto > 100 ? 'text-rose-500' : 'text-slate-400'}>
                {finances.percentOrcamentoGasto}% gasto do orçamento
              </span>
              <span className={finances.margemAtual >= 0 ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
                Cashflow: {finances.margemAtual >= 0 ? '+' : ''}{finances.margemAtual.toLocaleString('pt-PT')} €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'dashboard'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Dashboard & IA</span>
        </button>

        <button
          onClick={() => setActiveTab('relatorio')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'relatorio'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-indigo-500" />
          <span>Apuramento Contabilístico & IVA</span>
        </button>

        <button
          onClick={() => setActiveTab('despesas')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'despesas'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Banknote className="w-3.5 h-3.5 text-orange-500" />
          <span>Despesas s/ Fatura ({obraExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pagamentos')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'pagamentos'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          <span>Recebimentos ({obraPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faturas')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'faturas'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span>Faturas ({obraInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('maodeobra')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'maodeobra'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <HardHat className="w-3.5 h-3.5 text-amber-500" />
          <span>Mão de Obra ({obraLabor.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manutencao')}
          className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'manutencao'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
              : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
          <span>Equipamentos & Manutenções ({obra.equipamentos_instalados?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD & IA */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Mode Selector for Real Profit & Fiscal Calculation */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-black dark:text-white">
                Base de Faturação ao Cliente:
              </span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                (Apuramento financeiro a 23% de IVA com dedução de despesas)
              </span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setFiscalCalcMode('orcamento')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  fiscalCalcMode === 'orcamento'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Orçamento Contratado ({obra.budget.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €)
              </button>
              <button
                type="button"
                onClick={() => setFiscalCalcMode('recebido')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  fiscalCalcMode === 'recebido'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Recebido à Data ({finances.totalRecebidoCliente.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €)
              </button>
            </div>
          </div>

          {/* Main 6 Key Financial & Fiscal KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Total Gasto na Obra */}
            <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gasto (c/ IVA)</span>
              <p className="text-xl sm:text-2xl font-black text-black dark:text-white font-mono mt-1">
                {obraOfficialReport.totalGastos.totalWithTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                Base s/ IVA: {obraOfficialReport.totalGastos.baseWithoutTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            {/* Card 2: Faturado ao Cliente */}
            <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Faturado Cliente (c/ IVA)
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
                {obraOfficialReport.totalCobradoClienteComIva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                Receita Base: {obraOfficialReport.receitaLiquidaBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            {/* Card 3: Total IVA das Despesas Suportado / Dedutível */}
            <div
              onClick={() => setActiveTab('faturas')}
              className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-indigo-500/20 bg-indigo-500/[0.03] cursor-pointer hover:border-indigo-500/40 transition group"
              title="Ver faturas desta obra com discriminação de IVA"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                IVA a Deduzir (Compras)
              </span>
              <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                {obraOfficialReport.ivaDedutivelDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block">
                Abate ao imposto a entregar
              </span>
            </div>

            {/* Card 4: IVA a Pagar ao Estado (IVA Liquidado - IVA Suportado) */}
            <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-purple-500/20 bg-purple-500/[0.03]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                <span>👉 IVA p/ Estado (23%)</span>
                <Landmark className="w-3.5 h-3.5 text-purple-500" />
              </span>
              <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
                {obraOfficialReport.ivaEfetivoDevolverEstado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 block truncate" title={`Cobrado (+${obraOfficialReport.ivaCobradoCliente.toFixed(2)}€) - Deduzido (-${obraOfficialReport.ivaDedutivelDespesas.toFixed(2)}€)`}>
                {obraOfficialReport.ivaEfetivoDevolverEstado < 0 ? 'Crédito de IVA a favor' : 'A devolver às Finanças'}
              </span>
            </div>

            {/* Card 5: Quanto me Rendeu a Obra (Lucro Real da Obra s/ IVA) */}
            <div className={`p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border ${
              obraOfficialReport.margemLucroBase >= 0
                ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
                : 'border-rose-500/30 bg-rose-500/[0.05]'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>🏆 Quanto me Rendeu</span>
                <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
              </span>
              <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                obraOfficialReport.margemLucroBase >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}>
                {obraOfficialReport.margemLucroBase >= 0 ? '+' : ''}
                {obraOfficialReport.margemLucroBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {obraOfficialReport.margemPercentual}% lucro real líquido
              </span>
            </div>

            {/* Card 6: Saldo Final em Caixa (Conta Bancária) */}
            <div className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-emerald-500/20 bg-emerald-500/[0.03]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>🏦 Saldo Final em Caixa</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </span>
              <p
                className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                  obraOfficialReport.saldoFinalEmCaixa >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {obraOfficialReport.saldoFinalEmCaixa >= 0 ? '+' : ''}
                {obraOfficialReport.saldoFinalEmCaixa.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block truncate font-medium" title="Após pagar fornecedores e IVA ao Estado (confere 100% com o Lucro da Obra)">
                Sobra real na conta bancária
              </span>
            </div>
          </div>

          {/* PAINEL EXECUTIVO: RENTABILIDADE REAL & APURAMENTO FISCAL DE IVA (23%) */}
          <div className="p-5 sm:p-7 rounded-3xl revolut-card revolut-shadow border border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.04] via-blue-500/[0.02] to-transparent relative overflow-hidden space-y-6">
            {/* Header & Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                  <Calculator className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                      Apuramento Fiscal de IVA & Rentabilidade Real da Obra
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Taxa IVA 23%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    Cálculo da fatura do cliente descontando o IVA das faturas de materiais para saber exatamente o saldo a pagar ao Estado e o que rendeu no seu bolso.
                  </p>
                </div>
              </div>

              {/* Selector & Report Actions */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setFiscalCalcMode('recebido')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fiscalCalcMode === 'recebido'
                        ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Valor Recebido ({finances.totalRecebidoCliente.toFixed(2)} €)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiscalCalcMode('orcamento')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fiscalCalcMode === 'orcamento'
                        ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Orçamento ({obra.budget.toFixed(2)} €)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('relatorio')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                  title="Ver relatório contabilístico completo da obra"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Ver Apuramento Oficial</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyFormattedReport(obraOfficialReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-neutral-800 text-black dark:text-white border border-black/10 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-neutral-700 transition"
                  title="Copiar relatório formatado em Markdown"
                >
                  {copiedReportFeedback ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Practical Contractor Explanatory Banner */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
              <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-neutral-300 space-y-1">
                <p className="font-bold text-blue-700 dark:text-blue-300">
                  Como funciona a sua conta com o Estado nesta obra:
                </p>
                <p>
                  Ao passar a fatura de <strong>{fiscalAnalysis.totalCobradoCliente.toFixed(2)} €</strong> (c/ 23% IVA) ao cliente, <strong>{fiscalAnalysis.ivaLiquidadoCliente.toFixed(2)} €</strong> são imposto que pertence ao Estado. Como guardou <strong>{obraInvoices.length} faturas</strong> de fornecedores nesta obra com <strong>{fiscalAnalysis.ivaSuportadoGastos.toFixed(2)} €</strong> de IVA suportado, <strong>desconta esse valor diretamente</strong>. Ao Estado só entregará o saldo de <strong>{fiscalAnalysis.ivaAPagarAoEstado.toFixed(2)} €</strong>, resultando num rendimento real de <strong>{fiscalAnalysis.lucroLiquidoReal.toFixed(2)} €</strong> ({fiscalAnalysis.margemLucroRealPercent}% de margem).
                </p>
              </div>
            </div>

            {/* Two Main Analytical Columns: Fiscal Accounts vs Contractor Real Profits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Column 1: Apuramento de IVA com o Estado */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-black/40 border border-indigo-500/20 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    <span>Conta de IVA com o Estado (Autoridade Tributária)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    IVA 23%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Fatura Cliente: IVA Liquidado */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                    <div>
                      <span className="font-bold text-black dark:text-white block">
                        (+) IVA Liquidado na Fatura do Cliente
                      </span>
                      <span className="text-[10px] text-slate-400">
                        23% de IVA sobre a base de {fiscalAnalysis.receitaLiquidaCliente.toFixed(2)} €
                      </span>
                    </div>
                    <span className="font-mono font-black text-rose-500 text-sm">
                      +{fiscalAnalysis.ivaLiquidadoCliente.toFixed(2)} €
                    </span>
                  </div>

                  {/* Faturas Gastos: IVA Suportado */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                    <div>
                      <span className="font-bold text-black dark:text-white block">
                        (-) IVA Suportado nas Faturas da Obra (Dedutível)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        IVA das {obraInvoices.length} faturas de materiais (Ernes, Sanitop, Rexel, etc.)
                      </span>
                    </div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      -{fiscalAnalysis.ivaSuportadoGastos.toFixed(2)} €
                    </span>
                  </div>

                  {/* Saldo de IVA a Pagar */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30">
                    <div>
                      <span className="font-black text-black dark:text-white block text-sm">
                        (=) Total de IVA a Pagar ao Estado
                      </span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium">
                        {fiscalAnalysis.isIvaCredito ? 'Crédito de IVA a seu favor na declaração' : 'Cheque líquido a entregar à Autoridade Tributária'}
                      </span>
                    </div>
                    <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-lg sm:text-xl">
                      {fiscalAnalysis.ivaAPagarAoEstado.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Fiscal Savings Callout */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Poupança Fiscal por Anexar Faturas:</span>
                  </span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {fiscalAnalysis.poupancaFiscalIva.toFixed(2)} € abatidos
                  </span>
                </div>
              </div>

              {/* Column 2: Quanto Realmente Rendeu a Obra */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-black/40 border border-emerald-500/20 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    <span>Rendimento Real da Obra (Lucro Líquido do Empreiteiro)</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    fiscalAnalysis.lucroLiquidoReal >= 0
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-500'
                  }`}>
                    {fiscalAnalysis.margemLucroRealPercent}% Margem
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Receita Líquida Real */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                    <div>
                      <span className="font-bold text-black dark:text-white block">
                        (+) Faturação Líquida da Obra (s/ IVA)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        O que é receita real da sua empresa ({fiscalAnalysis.totalCobradoCliente.toFixed(2)} € / 1.23)
                      </span>
                    </div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      +{fiscalAnalysis.receitaLiquidaCliente.toFixed(2)} €
                    </span>
                  </div>

                  {/* Gastos Materiais Líquidos */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                    <div>
                      <span className="font-bold text-black dark:text-white block">
                        (-) Custo Líquido dos Materiais Faturados (s/ IVA)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        O IVA dos materiais foi abatido ao Estado na coluna ao lado
                      </span>
                    </div>
                    <span className="font-mono font-black text-rose-500 text-sm">
                      -{fiscalAnalysis.materiaisSemIva.toFixed(2)} €
                    </span>
                  </div>

                  {/* Mão de Obra e Despesas Manuais */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                    <div>
                      <span className="font-bold text-black dark:text-white block">
                        (-) Mão de Obra e Encargos da Obra
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Horas de trabalho ({fiscalAnalysis.maoDeObra.toFixed(2)} €) + Despesas diretas ({fiscalAnalysis.outrasDespesas.toFixed(2)} €)
                      </span>
                    </div>
                    <span className="font-mono font-black text-rose-500 text-sm">
                      -{(fiscalAnalysis.maoDeObra + fiscalAnalysis.outrasDespesas).toFixed(2)} €
                    </span>
                  </div>

                  {/* Quanto me Rendeu (Lucro Líquido Real) */}
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    fiscalAnalysis.lucroLiquidoReal >= 0
                      ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}>
                    <div>
                      <span className="font-black text-black dark:text-white block text-sm">
                        (=) Quanto me Rendeu Aquela Obra
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium">
                        Lucro líquido que fica na sua conta após pagar impostos e despesas
                      </span>
                    </div>
                    <span className={`font-mono font-black text-lg sm:text-xl ${
                      fiscalAnalysis.lucroLiquidoReal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                    }`}>
                      {fiscalAnalysis.lucroLiquidoReal >= 0 ? '+' : ''}
                      {fiscalAnalysis.lucroLiquidoReal.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                  <span>Equivalência matemática direta:</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {fiscalAnalysis.totalCobradoCliente.toFixed(2)} € recebidos - gastos reais = {fiscalAnalysis.lucroLiquidoReal.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            {/* IVA Discriminado por Fornecedor (Ernes, Sanitop, Rexel, etc.) */}
            {obraIvaBySupplier.length > 0 && (
              <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    IVA Suportado por Fornecedor ({obraIvaBySupplier.length})
                  </span>
                  <button
                    onClick={() => setActiveTab('faturas')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Ver lista completa de faturas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {obraIvaBySupplier.map(([supplierName, sData]) => (
                    <div
                      key={supplierName}
                      className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs hover:border-indigo-500/30 transition"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-black dark:text-white block truncate">
                          {supplierName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sData.count} {sData.count === 1 ? 'fatura' : 'faturas'} • Total: {sData.totalWithTax.toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 block">
                          +{sData.iva.toFixed(2)} €
                        </span>
                        <span className="text-[10px] text-indigo-500/70 font-semibold">
                          IVA dedutível
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Banner de Exportação Rápida para Excel / Google Sheets na Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-neutral-900/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-black dark:text-white flex items-center gap-2">
                  <span>Exportar Dados Financeiros (Excel / Google Sheets)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    .CSV UTF-8
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                  Descarregue o relatório financeiro completo com orçamento, faturas de materiais, mão de obra e margens de lucro por especialidade.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 ios-press-active"
                title="Descarregar ficheiro CSV compatível com Microsoft Excel e Google Sheets"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descarregar CSV</span>
              </button>
              <button
                onClick={() => setShowPDFModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition ios-press-active"
                title="Descarregar relatório em PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-500" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* NOVO: RENTABILIDADE POR TÓPICO TÉCNICO & SISTEMAS (VMC, BOMBA AQS, AC, UPAC, ETC.) */}
          <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Sistemas Técnicos AVAC & Renováveis
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-black dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <span>Rentabilidade por Tópico & Lucro Final</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
                  Comparação entre o valor faturado/orçado ao cliente e o custo real de materiais e faturas em cada especialidade (VMC, Bombas de Calor, Ar Condicionado, UPAC, etc.).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Total Profit Obra Pill */}
                <div className="p-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Lucro Previsto Obra
                  </span>
                  <span className={`text-base font-black font-mono ${finances.lucroTotalObra >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {finances.lucroTotalObra >= 0 ? '+' : ''}{finances.lucroTotalObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                </div>

                <button
                  onClick={() => setShowPDFModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 active:scale-95"
                  title="Gerar e descarregar relatório executivo em PDF com resumo de categorias e margens"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Baixar Relatório PDF</span>
                </button>

                <button
                  onClick={handleOpenBudgetModal}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition shadow-sm hover:opacity-90 active:scale-95"
                  title="Configurar orçamentos/venda ao cliente por tópico"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  <span>Definir Faturação p/ Tópico</span>
                </button>

                <button
                  onClick={() => setIsAddingCustomTopic(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-black dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-neutral-700 transition"
                  title="Adicionar novo tópico personalizado"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Tópico</span>
                </button>
              </div>
            </div>

            {/* PAINEL GERAL: TODAS AS CATEGORIAS SOMADAS */}
            {(() => {
              const totalOrcadoCategorias = finances.topicFinances.reduce((acc, t) => acc + (t.budget || 0), 0);
              const totalGastoCategorias = finances.topicFinances.reduce((acc, t) => acc + (t.totalGasto || 0), 0);
              const orcamentoGeralRef = totalOrcadoCategorias > 0 ? totalOrcadoCategorias : obra.budget;
              const lucroGeralTotal = Number((orcamentoGeralRef - totalGastoCategorias).toFixed(2));
              const margemPercentGeralTotal = orcamentoGeralRef > 0 ? Number(((lucroGeralTotal / orcamentoGeralRef) * 100).toFixed(1)) : 0;
              const isFinished = obra.status === 'concluida';

              return (
                <div className={`mb-6 p-5 sm:p-6 rounded-3xl border transition-all ${
                  isFinished
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-neutral-800/60 border-black/5 dark:border-white/10'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isFinished ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-black dark:bg-white text-white dark:text-black'
                      }`}>
                        Σ
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-black dark:text-white flex items-center gap-2">
                          <span>
                            {isFinished
                              ? '🏆 Lucro Final Realizado da Obra (Categorias Somadas)'
                              : '📊 Balanço Geral de Todas as Categorias Somadas'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                          {totalOrcadoCategorias > 0
                            ? `Soma dos orçamentos atribuídos (${totalOrcadoCategorias.toLocaleString('pt-PT')} €) vs custos reais registados.`
                            : 'Orçamento global da obra vs total de gastos com apuramento da margem.'}
                        </p>
                      </div>
                    </div>

                    {/* Destaque % Lucro ao lado */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs sm:text-sm font-black px-4 py-2 rounded-full font-mono shadow-sm flex items-center gap-1.5 ${
                        lucroGeralTotal >= 0
                          ? 'bg-emerald-600 text-white shadow-emerald-600/25'
                          : 'bg-rose-600 text-white shadow-rose-600/25'
                      }`}>
                        {lucroGeralTotal >= 0 ? <TrendingUp className="w-4 h-4 stroke-[2.5]" /> : <TrendingDown className="w-4 h-4 stroke-[2.5]" />}
                        <span>{margemPercentGeralTotal}% de Lucro Geral</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-black/5 dark:border-white/10">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Orçado ao Cliente
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-black dark:text-white">
                        {orcamentoGeralRef.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {totalOrcadoCategorias > 0 ? 'Soma das categorias' : 'Orçamento base'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Já Gasto (Geral)
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-black dark:text-white">
                        {totalGastoCategorias.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Materiais + Manuais + Mão de obra
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Saldo Restante do Orçamento
                      </span>
                      <span className={`text-base sm:text-lg font-black font-mono ${
                        (orcamentoGeralRef - totalGastoCategorias) >= 0 ? 'text-black dark:text-white' : 'text-rose-500'
                      }`}>
                        {(orcamentoGeralRef - totalGastoCategorias).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Margem de segurança
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/25">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                        {isFinished ? 'Lucro Final Realizado' : 'Lucro Total Previsto'}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-base sm:text-lg font-black font-mono ${
                          lucroGeralTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {lucroGeralTotal >= 0 ? '+' : ''}{lucroGeralTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        {margemPercentGeralTotal}% de lucro da obra
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Grid of Topics with Financials & Profit */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {finances.topicFinances.map((top) => {
                const hasBudget = top.budget > 0;
                const isProfitable = top.lucro >= 0;
                const budgetPercentSpent = hasBudget ? Math.round((top.totalGasto / top.budget) * 100) : 0;
                const saldoRestanteCategoria = hasBudget ? top.budget - top.totalGasto : 0;

                return (
                  <div
                    key={top.topic}
                    className="p-4 rounded-2xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 flex flex-col justify-between transition hover:border-black/15 dark:hover:border-white/20"
                  >
                    <div>
                      {/* Topic Name & Category Icon */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            {top.topic.toLowerCase().includes('vmc') ? (
                              <Wind className="w-3.5 h-3.5" />
                            ) : top.topic.toLowerCase().includes('bomba') ? (
                              <Thermometer className="w-3.5 h-3.5" />
                            ) : top.topic.toLowerCase().includes('ar condicionado') ? (
                              <Flame className="w-3.5 h-3.5" />
                            ) : top.topic.toLowerCase().includes('upac') || top.topic.toLowerCase().includes('foto') ? (
                              <Sun className="w-3.5 h-3.5" />
                            ) : top.topic.toLowerCase().includes('radiante') ? (
                              <Droplet className="w-3.5 h-3.5" />
                            ) : (
                              <Tag className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-black dark:text-white tracking-tight">
                              {top.topic}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {top.invoicesCount} faturas • {top.expensesCount} despesas
                            </span>
                          </div>
                        </div>

                        {/* Profit Tag com % de Lucro ao lado */}
                        {hasBudget ? (
                          <div className="text-right">
                            <span
                              className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full inline-block ${
                                isProfitable
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isProfitable ? '+' : ''}{top.lucro.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                            </span>
                            <span className={`text-[10px] font-bold font-mono block mt-0.5 ${
                              isProfitable ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {top.margemPercent}% de lucro
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                            Sem valor venda
                          </span>
                        )}
                      </div>

                      {/* Values Grid: Orçado vs Já Gasto vs Saldo */}
                      <div className="grid grid-cols-3 gap-2 my-2 py-2 border-y border-black/5 dark:border-white/5 text-center">
                        <div>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Orçado
                          </span>
                          <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                            {hasBudget ? `${top.budget.toLocaleString('pt-PT')} €` : '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Já Gastei
                          </span>
                          <span className="text-xs font-black font-mono text-black dark:text-white">
                            {top.totalGasto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Saldo
                          </span>
                          <span className={`text-xs font-black font-mono ${
                            saldoRestanteCategoria >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {hasBudget ? `${saldoRestanteCategoria.toFixed(2)} €` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Budget consumption progress bar */}
                      {hasBudget && (
                        <div className="space-y-1 my-1.5">
                          <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                budgetPercentSpent > 100
                                  ? 'bg-rose-500'
                                  : budgetPercentSpent > 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(budgetPercentSpent, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{budgetPercentSpent}% consumido</span>
                            <span className={isProfitable ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                              Lucro: {top.margemPercent}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action links */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
                      <button
                        onClick={() => {
                          setInvoiceTopicFilter(top.topic);
                          setActiveTab('faturas');
                        }}
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>Ver Faturas</span>
                        <span>&rarr;</span>
                      </button>

                      <button
                        onClick={handleOpenBudgetModal}
                        className="text-slate-400 hover:text-black dark:hover:text-white font-medium"
                      >
                        {hasBudget ? 'Editar Orçamento' : '+ Definir Orçamento'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SPECIALIZED HVAC & MATERIALS BREAKDOWN */}
          <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" />
                  <span>Decomposição de Custos por Categoria</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Valores discriminados de máquinas, tubos de refrigeração, água, ligações elétricas e acessórios.
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-neutral-900 px-3 py-1.5 rounded-full self-start sm:self-auto">
                Total: {finances.totalGastoObra.toLocaleString('pt-PT')} €
              </div>
            </div>

            {/* Proportional Stacked Bar */}
            {finances.totalGastoObra > 0 && (
              <div className="mb-6">
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 dark:bg-neutral-800">
                  {Object.values(finances.breakdown).map((cat) => {
                    if (cat.percentageOfTotal <= 0) return null;
                    return (
                      <div
                        key={cat.key}
                        style={{
                          width: `${cat.percentageOfTotal}%`,
                          backgroundColor: cat.color,
                        }}
                        title={`${cat.label}: ${cat.amount} € (${cat.percentageOfTotal}%)`}
                        className="h-full transition-all duration-300 hover:opacity-85"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Material de Máquinas & Equipamentos */}
              <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-blue-500" />
                      <span>Máquinas & Equipamentos</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300">
                      {finances.breakdown.maquinas.percentageOfTotal}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-black dark:text-white font-mono">
                    {finances.breakdown.maquinas.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {finances.breakdown.maquinas.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Itens registados:</span>
                  <span className="font-bold font-mono text-black dark:text-white">
                    {finances.breakdown.maquinas.itemCount}
                  </span>
                </div>
              </div>

              {/* 2. Tubos de Refrigeração & Gás */}
              <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-500" />
                      <span>Tubos Refrigeração & Gás</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300">
                      {finances.breakdown.refrigeracao.percentageOfTotal}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-black dark:text-white font-mono">
                    {finances.breakdown.refrigeracao.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {finances.breakdown.refrigeracao.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Itens registados:</span>
                  <span className="font-bold font-mono text-black dark:text-white">
                    {finances.breakdown.refrigeracao.itemCount}
                  </span>
                </div>
              </div>

              {/* 3. Tubos de Água / Canalização */}
              <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-teal-500" />
                      <span>Tubos de Água / Canalização</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300">
                      {finances.breakdown.agua.percentageOfTotal}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-black dark:text-white font-mono">
                    {finances.breakdown.agua.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {finances.breakdown.agua.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Itens registados:</span>
                  <span className="font-bold font-mono text-black dark:text-white">
                    {finances.breakdown.agua.itemCount}
                  </span>
                </div>
              </div>

              {/* 4. Ligações Elétricas & Componentes */}
              <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span>Ligações Elétricas & Comp.</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300">
                      {finances.breakdown.eletrico.percentageOfTotal}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-black dark:text-white font-mono">
                    {finances.breakdown.eletrico.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {finances.breakdown.eletrico.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Itens registados:</span>
                  <span className="font-bold font-mono text-black dark:text-white">
                    {finances.breakdown.eletrico.itemCount}
                  </span>
                </div>
              </div>

              {/* 5. Acessórios & Fixação */}
              <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <span>Acessórios & Fixação</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                      {finances.breakdown.acessorios.percentageOfTotal}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-black dark:text-white font-mono">
                    {finances.breakdown.acessorios.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {finances.breakdown.acessorios.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Itens registados:</span>
                  <span className="font-bold font-mono text-black dark:text-white">
                    {finances.breakdown.acessorios.itemCount}
                  </span>
                </div>
              </div>

              {/* 6. Mão de Obra e Horas */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <HardHat className="w-4 h-4 text-emerald-500" />
                      <span>Mão de Obra & Horas</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                      {finances.breakdown.maodeobra.percentageOfTotal}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-black dark:text-white font-mono">
                    {finances.breakdown.maodeobra.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {finances.breakdown.maodeobra.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registos:</span>
                  <span className="font-bold font-mono text-black dark:text-white">
                    {finances.breakdown.maodeobra.itemCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick row for Despesas Manuais e Outros se existirem */}
            {(finances.breakdown.despesasManuais.amount > 0 || finances.breakdown.outros.amount > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {finances.breakdown.despesasManuais.amount > 0 && (
                  <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        Despesas sem Fatura (Manuais)
                      </span>
                      <p className="text-sm font-black font-mono mt-0.5 text-black dark:text-white">
                        {finances.breakdown.despesasManuais.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-orange-500">
                      {finances.breakdown.despesasManuais.percentageOfTotal}%
                    </span>
                  </div>
                )}
                {finances.breakdown.outros.amount > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500">Outros Materiais</span>
                      <p className="text-sm font-black font-mono mt-0.5 text-black dark:text-white">
                        {finances.breakdown.outros.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-400">
                      {finances.breakdown.outros.percentageOfTotal}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI AUDIT & DIAGNOSIS CARD (GEMINI 2.5 FLASH) */}
          <div className="rounded-3xl revolut-card revolut-shadow border border-blue-500/20 p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-black dark:text-white">
                      Auditoria Financeira & Técnica com IA
                    </h3>
                    {aiAnalysis?.status && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          aiAnalysis.status === 'excelente'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : aiAnalysis.status === 'adequada'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            : aiAnalysis.status === 'alerta'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {aiAnalysis.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Avaliação em tempo real dos rácios de máquinas, consumíveis, recebimentos e margem real.
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunAIAnalysis}
                disabled={isAnalyzingAI}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50"
              >
                {isAnalyzingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A Auditar Obra...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{aiAnalysis ? 'Atualizar Análise IA' : 'Gerar Análise com IA'}</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="p-3.5 mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiAnalysis ? (
              <div className="space-y-4">
                {/* Headline Banner */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                  <h4 className="text-sm font-black text-black dark:text-white">
                    {aiAnalysis.headline}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1 leading-relaxed">
                    {aiAnalysis.summary}
                  </p>
                </div>

                {/* Key Observations & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Observations */}
                  <div className="p-4 rounded-2xl bg-white/50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      <span>Pontos-Chave & Rácios</span>
                    </span>
                    <ul className="space-y-2">
                      {aiAnalysis.keyObservations?.map((obs: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 rounded-2xl bg-white/50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Recomendações Práticas</span>
                    </span>
                    <ul className="space-y-2">
                      {aiAnalysis.recommendations?.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-black/5 dark:border-white/5">
                  <span>Modelo de IA: Gemini 2.5 Flash</span>
                  <span>Última análise: {new Date(aiAnalysis.lastAnalyzedAt).toLocaleString('pt-PT')}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5 text-center">
                <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto">
                  Clique em <strong>&quot;Gerar Análise com IA&quot;</strong> para obter uma auditoria executiva sobre a rentabilidade desta obra, equilíbrio de materiais e situação dos recebimentos do cliente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: APURAMENTO FISCAL & CONTABILÍSTICO (REGRAS E FÓRMULAS DE CÁLCULO OBRIGATÓRIAS) */}
      {activeTab === 'relatorio' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Actions */}
          <div className="p-6 sm:p-7 rounded-3xl revolut-card revolut-shadow border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.04] via-blue-500/[0.02] to-transparent space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                  <Scale className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-black dark:text-white tracking-tight">
                      📊 Relatório Financeiro e Contabilístico: {obra.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Regras Oficiais Portugal (IVA 23%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    Cliente: <strong>{obra.client || 'Sem cliente associado'}</strong> • Fecho financeiro direto com apuramento de IVA e validação de tesouraria.
                  </p>
                </div>
              </div>

              {/* Actions & Calculation Mode */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setFiscalCalcMode('recebido')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      fiscalCalcMode === 'recebido'
                        ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Recebido ({finances.totalRecebidoCliente.toFixed(2)} €)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiscalCalcMode('orcamento')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      fiscalCalcMode === 'orcamento'
                        ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Orçamento ({obra.budget.toFixed(2)} €)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyFormattedReport(obraOfficialReport)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition ios-press-active"
                  title="Copiar relatório formatado em Markdown para colar em e-mail, WhatsApp ou Word"
                >
                  {copiedReportFeedback ? (
                    <>
                      <CheckCheck className="w-4 h-4 text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Relatório Formatado</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-black dark:text-white transition ios-press-active"
                  title="Imprimir relatório da obra"
                >
                  <Printer className="w-4 h-4 text-slate-600 dark:text-neutral-400" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {copiedReportFeedback && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Relatório financeiro formatado copiado para a área de transferência com rigor contabilístico!</span>
              </div>
            )}
          </div>

          {/* ESTRUTURA OFICIAL REQUERIDA */}
          <div className="space-y-6">
            {/* SECÇÃO 1: FATURAÇÃO AO CLIENTE */}
            <div className="p-6 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <h3 className="text-base font-black text-black dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <span>1. Faturação ao Cliente</span>
                </h3>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {obraPayments.length} recebimento(s) registado(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Cobrado ao Cliente (c/ IVA)
                  </span>
                  <p className="text-2xl font-black font-mono text-black dark:text-white">
                    {obraOfficialReport.totalCobradoClienteComIva.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Valor total faturado e recebido (inclui taxa de 23%)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    Receita Líquida (Base s/ IVA)
                  </span>
                  <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {obraOfficialReport.receitaLiquidaBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Receita efetiva da empresa ({obraOfficialReport.totalCobradoClienteComIva.toFixed(2)} € / 1.23)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                    IVA Cobrado ao Cliente (Liquidado)
                  </span>
                  <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                    {obraOfficialReport.ivaLiquidadoCliente.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] text-slate-400">
                    23% de imposto retido para entrega inicial ao Estado
                  </span>
                </div>
              </div>
            </div>

            {/* SECÇÃO 2: GASTOS DA OBRA */}
            <div className="p-6 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                <h3 className="text-base font-black text-black dark:text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-orange-500" />
                  <span>2. Gastos da Obra</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {obraInvoices.length} faturas anexadas • {obraExpenses.length} despesas s/ fatura • {obraLabor.length} registos MO
                </span>
              </div>

              {/* Tabela Obrigatória Formatada */}
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-slate-400">
                      <th className="pb-3 font-bold uppercase tracking-wider text-[11px]">Rubrica / Fornecedor</th>
                      <th className="pb-3 font-bold uppercase tracking-wider text-[11px] text-right">Base (s/ IVA)</th>
                      <th className="pb-3 font-bold uppercase tracking-wider text-[11px] text-right">IVA</th>
                      <th className="pb-3 font-bold uppercase tracking-wider text-[11px] text-right">Total Gasto (c/ IVA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {/* Materiais / Equipamentos */}
                    <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-black dark:text-white block">
                              Materiais / Equipamentos
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Máquinas AVAC, tubos refrigeração/água, canalização, eletricidade principal
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-neutral-300">
                        {obraOfficialReport.materiaisEquipamentos.baseWithoutTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {obraOfficialReport.materiaisEquipamentos.taxAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3.5 pl-3 text-right font-mono font-black text-black dark:text-white">
                        {obraOfficialReport.materiaisEquipamentos.totalWithTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                    </tr>

                    {/* Acessórios / Consumíveis */}
                    <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                            <Wrench className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-black dark:text-white block">
                              Acessórios / Consumíveis
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Fixação, ferramentas, consumíveis rápidos, combustível e pequenas compras
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-neutral-300">
                        {obraOfficialReport.acessoriosConsumiveis.baseWithoutTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {obraOfficialReport.acessoriosConsumiveis.taxAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3.5 pl-3 text-right font-mono font-black text-black dark:text-white">
                        {obraOfficialReport.acessoriosConsumiveis.totalWithTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                    </tr>

                    {/* Mão de Obra / Técnico */}
                    <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                            <HardHat className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-black dark:text-white block">
                              Mão de Obra / Técnico
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Equipa técnica, instaladores e montagem no local ({obraLabor.length} registos)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-neutral-300">
                        {obraOfficialReport.maoDeObraTecnico.baseWithoutTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-400">
                        {obraOfficialReport.maoDeObraTecnico.taxAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3.5 pl-3 text-right font-mono font-black text-black dark:text-white">
                        {obraOfficialReport.maoDeObraTecnico.totalWithTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                    </tr>

                    {/* TOTAL GASTOS (Linha de Destaque) */}
                    <tr className="bg-black/5 dark:bg-white/5 font-black border-t-2 border-black/10 dark:border-white/10">
                      <td className="py-4 pr-3 text-black dark:text-white uppercase tracking-wider text-xs sm:text-sm font-black">
                        TOTAL GASTOS
                      </td>
                      <td className="py-4 px-3 text-right font-mono text-black dark:text-white text-sm sm:text-base font-black">
                        {obraOfficialReport.totalGastos.baseWithoutTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-4 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 text-sm sm:text-base font-black">
                        {obraOfficialReport.totalGastos.taxAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-4 pl-3 text-right font-mono text-black dark:text-white text-base sm:text-lg font-black">
                        {obraOfficialReport.totalGastos.totalWithTax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Botão para ver fornecedores detalhados */}
              {obraIvaBySupplier.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSupplierDetailsInReport(!showSupplierDetailsInReport)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                  >
                    <span>{showSupplierDetailsInReport ? 'Ocultar fornecedores detalhados' : `Ver discriminação por fornecedor (${obraIvaBySupplier.length})`}</span>
                    {showSupplierDetailsInReport ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showSupplierDetailsInReport && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 animate-in fade-in duration-150">
                      {obraIvaBySupplier.map(([sName, sData]) => (
                        <div key={sName} className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs">
                          <span className="font-bold text-black dark:text-white block truncate">{sName}</span>
                          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                            <span>Base: {sData.base.toFixed(2)} €</span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">IVA: {sData.iva.toFixed(2)} €</span>
                          </div>
                          <div className="text-right font-mono font-black text-black dark:text-white text-[11px] mt-0.5">
                            Total: {sData.totalWithTax.toFixed(2)} €
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECÇÃO 3: ACERTO DE IVA COM AS FINANÇAS */}
            <div className="p-6 rounded-3xl revolut-card revolut-shadow border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.03] to-transparent space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <h3 className="text-base font-black text-black dark:text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-purple-600" />
                  <span>3. Acerto de IVA com as Finanças</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase">
                  Regra Fiscal Obrigatória
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-700 dark:text-neutral-300">
                <p className="font-semibold">
                  <strong>Regra de ouro contabilística:</strong> O utilizador <strong>NUNCA</strong> entrega a totalidade do IVA da fatura do cliente; abate sempre o IVA que já pagou nas despesas elegíveis de materiais e consumíveis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    IVA Cobrado ao Cliente
                  </span>
                  <p className="text-2xl font-black font-mono text-rose-500">
                    +{obraOfficialReport.ivaCobradoCliente.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] text-slate-400">
                    IVA Liquidado na fatura emitida
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    IVA a Deduzir das Despesas
                  </span>
                  <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    -{obraOfficialReport.ivaDedutivelDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] text-slate-400">
                    IVA Suportado nas faturas de fornecedores
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                    👉 IVA Efetivo a Devolver ao Estado
                  </span>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-purple-700 dark:text-purple-300">
                    {obraOfficialReport.ivaEfetivoDevolverEstado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    {obraOfficialReport.ivaEfetivoDevolverEstado >= 0
                      ? 'Saldo líquido a pagar à Autoridade Tributária'
                      : 'Crédito de IVA a recuperar a seu favor'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECÇÃO 4: LUCRO REAL DA OBRA & VERIFICAÇÃO DE TESOURARIA */}
            <div className="p-6 rounded-3xl revolut-card revolut-shadow border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-transparent space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <h3 className="text-base font-black text-black dark:text-white flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-500" />
                  <span>4. Lucro Real da Obra</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                  Rentabilidade Efetiva
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Margem de Lucro (Base Receita - Base Despesas)
                  </span>
                  <p className={`text-2xl font-black font-mono ${
                    obraOfficialReport.margemLucroBase >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {obraOfficialReport.margemLucroBase >= 0 ? '+' : ''}
                    {obraOfficialReport.margemLucroBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {obraOfficialReport.receitaLiquidaBase.toFixed(2)} € (Receita s/ IVA) - {obraOfficialReport.totalGastos.baseWithoutTax.toFixed(2)} € (Custos s/ IVA)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Margem Percentual
                  </span>
                  <p className={`text-2xl font-black font-mono ${
                    obraOfficialReport.margemPercentual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {obraOfficialReport.margemPercentual.toFixed(2)}%
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Percentagem de lucro sobre a receita líquida
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-200 block">
                    Valor Líquido que sobra na conta bancária
                  </span>
                  <p className={`text-2xl sm:text-3xl font-black font-mono ${
                    obraOfficialReport.saldoFinalEmCaixa >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {obraOfficialReport.saldoFinalEmCaixa >= 0 ? '+' : ''}
                    {obraOfficialReport.saldoFinalEmCaixa.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Após pagar fornecedores e entregar o IVA ao Estado
                  </span>
                </div>
              </div>

              {/* VALIDAÇÃO RIGOROSA DE TESOURARIA */}
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Verificação de Tesouraria (Saldo Final em Caixa)</span>
                  </span>
                  {obraOfficialReport.isCoerenteTesouraria ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                      100% Coerente
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-black uppercase">
                      Divergência
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  Fórmula: <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">
                    Saldo em Caixa = Total Recebido do Cliente (c/ IVA) - Total Pago a Fornecedores (c/ IVA) - IVA entregue ao Estado
                  </code>
                </p>

                <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-neutral-300">
                    Validação Matemática: {obraOfficialReport.saldoFinalEmCaixa.toFixed(2)} € (Saldo em Caixa) ≡ {obraOfficialReport.margemLucroBase.toFixed(2)} € (Lucro Operacional)
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Equação comprovada ao cêntimo</span>
                  </span>
                </div>
              </div>

              {/* AVISO LEGAL OBRIGATÓRIO VERBATIM */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 italic flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  *Aviso: Este lucro reflete o fecho direto da obra e acerto de IVA. Não inclui eventuais estimativas de retenção na fonte ou apuramento final de IRS/IRC anual.*
                </span>
              </div>
            </div>

            {/* ASSISTENTE FINANCEIRO & CONTABILÍSTICO RÁPIDO (SIMULADOR DE TEXTO / FATURA) */}
            <div className="p-6 rounded-3xl revolut-card revolut-shadow border border-indigo-500/20 bg-slate-50 dark:bg-neutral-900/60 space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-black dark:text-white">
                      Assistente de Leitura & Apuramento Rápido (Texto / Fatura)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Insira notas rápidas ou texto de valores para obter instantaneamente o apuramento formatado
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRunAssistantAnalysis} className="space-y-3">
                <div>
                  <textarea
                    rows={2}
                    value={assistantInputText}
                    onChange={(e) => setAssistantInputText(e.target.value)}
                    placeholder="Ex: Receita cliente 15000, materiais 4800, consumiveis 750, mao de obra 2100"
                    className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>Atalhos rápidos:</span>
                    <button
                      type="button"
                      onClick={() => setAssistantInputText(`Receita cliente ${obra.budget || 12000}, materiais ${totalMateriaisComIvaObra || 3500}, consumiveis 650, mao de obra ${finances.totalMaoDeObra || 1800}`)}
                      className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-neutral-300 font-medium"
                    >
                      Preencher com dados desta obra
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {assistantSimulatedReport && (
                      <button
                        type="button"
                        onClick={() => handleCopyFormattedReport(assistantSimulatedReport)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:bg-slate-300 transition"
                      >
                        Copiar Simulação
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
                    >
                      Apurar Valores do Texto
                    </button>
                  </div>
                </div>
              </form>

              {/* Resultado da Simulação Rápida */}
              {assistantSimulatedReport && (
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-indigo-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Resultado do Apuramento da Simulação
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      Lucro Líquido: +{assistantSimulatedReport.saldoFinalEmCaixa.toFixed(2)} € ({assistantSimulatedReport.margemPercentual.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                      <span className="text-[10px] text-slate-400 block font-sans">Receita c/ IVA</span>
                      <span className="font-bold">{assistantSimulatedReport.totalCobradoClienteComIva.toFixed(2)} €</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                      <span className="text-[10px] text-slate-400 block font-sans">Gastos c/ IVA</span>
                      <span className="font-bold">{assistantSimulatedReport.totalGastos.totalWithTax.toFixed(2)} €</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                      <span className="text-[10px] text-slate-400 block font-sans">IVA p/ Estado</span>
                      <span className="font-bold text-purple-600">{assistantSimulatedReport.ivaEfetivoDevolverEstado.toFixed(2)} €</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-sans">Lucro Real</span>
                      <span className="font-bold">+{assistantSimulatedReport.saldoFinalEmCaixa.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DESPESAS SEM FATURA */}
      {activeTab === 'despesas' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-orange-500" />
                <span>Despesas Manuais (Sem Fatura)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Custos pagos a pronto ou no local onde não solicitou fatura oficial (combustíveis, compras avulsas, cafés, etc.).
              </p>
            </div>

            <button
              onClick={() => setIsAddingExpense(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-sm ios-press-active"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Despesa</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
              Total Gasto em Despesas Manuais:
            </span>
            <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
              {finances.totalDespesasManuais.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          {/* Topic Filter Chips for Expenses */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setExpenseTopicFilter('todos')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                expenseTopicFilter === 'todos'
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}
            >
              Todos ({obraExpenses.length})
            </button>
            {availableTopics.map((top) => {
              const count = obraExpenses.filter((e) => (e.topic || 'Geral / Outros') === top).length;
              if (count === 0 && expenseTopicFilter !== top) return null;
              return (
                <button
                  key={top}
                  onClick={() => setExpenseTopicFilter(top)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    expenseTopicFilter === top
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  {top} ({count})
                </button>
              );
            })}
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10">
              <Banknote className="w-10 h-10 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-black dark:text-white">
                {expenseTopicFilter === 'todos' ? 'Nenhuma despesa manual registada' : `Nenhuma despesa para o tópico "${expenseTopicFilter}"`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Adicione despesas pagas em dinheiro ou sem pedido de fatura para ter o controlo exato de tudo o que gastou nesta obra.
              </p>
              <button
                onClick={() => {
                  if (expenseTopicFilter !== 'todos') setExpenseTopic(expenseTopicFilter);
                  setIsAddingExpense(true);
                }}
                className="mt-4 px-5 py-2.5 rounded-full bg-orange-500 text-white text-xs font-bold shadow-sm"
              >
                + Adicionar Despesa Sem Fatura
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 flex items-center justify-between gap-4 transition hover:border-black/10 dark:hover:border-white/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-black dark:text-white">{exp.description}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{exp.topic || 'Geral / Outros'}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-neutral-400">
                        <span className="font-mono">{new Date(exp.date).toLocaleDateString('pt-PT')}</span>
                        {exp.supplierOrPlace && <span>• {exp.supplierOrPlace}</span>}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-[10px] font-bold text-slate-600 dark:text-neutral-300">
                          {exp.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                          {exp.paymentMethod}
                        </span>
                      </div>
                      {exp.notes && (
                        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 italic">&quot;{exp.notes}&quot;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-black font-mono text-black dark:text-white">
                      {exp.amount.toFixed(2)} €
                    </span>
                    <button
                      onClick={() => setExpenseToDelete(exp)}
                      className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Eliminar despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECEBIMENTOS DO CLIENTE */}
      {activeTab === 'pagamentos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>Recebimentos & Adiantamentos do Cliente</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Registo de tranches, adiantamentos e pagamentos recebidos de {obra.client}.
              </p>
            </div>

            <button
              onClick={() => setIsAddingPayment(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm ios-press-active"
            >
              <Plus className="w-4 h-4" />
              <span>Registar Recebimento</span>
            </button>
          </div>

          <div className="p-5 rounded-3xl revolut-card revolut-shadow border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Progresso dos Recebimentos:
              </span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {finances.totalRecebidoCliente.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € de {obra.budget.toLocaleString('pt-PT')} €
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(finances.percentRecebido, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-neutral-400 mt-2">
              <span>{finances.percentRecebido}% liquidado pelo cliente</span>
              <span>Saldo pendente: {finances.saldoAReceber.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span>
            </div>
          </div>

          {obraPayments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10">
              <DollarSign className="w-10 h-10 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-black dark:text-white">Nenhum recebimento registado</h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Registe os adiantamentos (ex: 30% no início da obra) e tranches pagas pelo cliente para acompanhar o cashflow.
              </p>
              <button
                onClick={() => setIsAddingPayment(true)}
                className="mt-4 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                + Registar 1º Adiantamento
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {obraPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="p-4 rounded-2xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 flex items-center justify-between gap-4 transition hover:border-black/10 dark:hover:border-white/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-black dark:text-white">{pay.description}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-neutral-400">
                        <span className="font-mono">{new Date(pay.date).toLocaleDateString('pt-PT')}</span>
                        {pay.receiptNumber && <span>• Recibo: {pay.receiptNumber}</span>}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          {pay.paymentMethod}
                        </span>
                      </div>
                      {pay.notes && (
                        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 italic">&quot;{pay.notes}&quot;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      +{pay.amount.toFixed(2)} €
                    </span>
                    <button
                      onClick={() => setPaymentToDelete(pay)}
                      className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Eliminar recebimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FATURAS & MATERIAIS */}
      {activeTab === 'faturas' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <span>Faturas Oficiais da Obra</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Documentos comerciais digitalizados com discriminação de artigos, taxas de IVA e descontos.
              </p>
            </div>

            <button
              onClick={() => openScanner(obra.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm ios-press-active"
            >
              <Camera className="w-4 h-4" />
              <span>Digitalizar Fatura</span>
            </button>
          </div>

          {/* Resumo Financeiro das Faturas da Obra com IVA Acumulado */}
          <div className="p-5 rounded-2xl revolut-card revolut-shadow border border-indigo-500/20 bg-indigo-500/[0.03] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Resumo de IVA Acumulado nas Faturas Desta Obra
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {obraInvoices.length} {obraInvoices.length === 1 ? 'documento' : 'documentos associados'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Total IVA Suportado (Dedutível)
                </span>
                <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {totalIvaFaturasObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                </p>
                <span className="text-[10px] text-indigo-500/80 block mt-0.5">
                  Abate diretamente no IVA a pagar ao Estado
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Líquido Tributável (s/ IVA)
                </span>
                <p className="text-xl font-black font-mono text-black dark:text-white mt-0.5">
                  {totalMateriaisSemIvaObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Base de incidência de imposto
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Bruto Liquidado (c/ IVA)
                </span>
                <p className="text-xl font-black font-mono text-black dark:text-white mt-0.5">
                  {totalMateriaisComIvaObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Custo final de aquisição de materiais
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  IVA a Pagar ao Estado (Saldo)
                </span>
                <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                  {fiscalAnalysis.ivaAPagarAoEstado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                </p>
                <span className="text-[10px] text-purple-500/80 block mt-0.5">
                  IVA Cliente ({fiscalAnalysis.ivaLiquidadoCliente.toFixed(2)}€) - IVA Gastos
                </span>
              </div>
            </div>

            {/* Breakdown de taxas se houver faturas */}
            {obraInvoices.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
                <span className="text-slate-400 font-bold">Escalões de IVA:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono text-slate-600 dark:text-neutral-300">
                  Normal 23%: <strong>{obraIvaBreakdown.iva23.toFixed(2)} €</strong> (Base: {obraIvaBreakdown.base23.toFixed(2)} €)
                </span>
                {obraIvaBreakdown.iva13 > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono text-slate-600 dark:text-neutral-300">
                    Intermédio 13%: <strong>{obraIvaBreakdown.iva13.toFixed(2)} €</strong>
                  </span>
                )}
                {obraIvaBreakdown.iva6 > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono text-slate-600 dark:text-neutral-300">
                    Reduzido 6%: <strong>{obraIvaBreakdown.iva6.toFixed(2)} €</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Topic Filter Chips for Invoices */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setInvoiceTopicFilter('todos')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                invoiceTopicFilter === 'todos'
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}
            >
              Todos ({obraInvoices.length})
            </button>
            {availableTopics.map((top) => {
              const count = obraInvoices.filter((i) => (i.topic || 'Geral / Outros') === top).length;
              if (count === 0 && invoiceTopicFilter !== top) return null;
              return (
                <button
                  key={top}
                  onClick={() => setInvoiceTopicFilter(top)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    invoiceTopicFilter === top
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  {top} ({count})
                </button>
              );
            })}
          </div>

          {/* Alerta de Faturas Duplicadas Existentes nesta Obra */}
          {duplicateInvoicesInThisObra.size > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300">
                      ⚠️ Atenção: Foram detetadas {duplicateInvoicesInThisObra.size} fatura(s) duplicada(s) nesta obra!
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white uppercase">
                      Despesas Repetidas
                    </span>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Faturas repetidas duplicam os custos e distorcem a dedução de IVA desta obra. Elimine a cópia duplicada assinalada com &quot;⛔ Fatura Repetida&quot; abaixo para repor os valores exatos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10">
              <FileText className="w-10 h-10 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-black dark:text-white">
                {invoiceTopicFilter === 'todos' ? 'Nenhuma fatura associada a esta obra' : `Nenhuma fatura para o tópico "${invoiceTopicFilter}"`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Tire fotografias à fatura (suporta 2 ou mais páginas) para a IA ler artigos, descontos e totais automaticamente.
              </p>
              <button
                onClick={() => openScanner(obra.id)}
                className="mt-4 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Tirar Foto à Fatura
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((inv) => {
                const isExpanded = expandedInvoiceId === inv.id;
                const photoCount = (inv.receiptImageUrls && inv.receiptImageUrls.length > 0) ? inv.receiptImageUrls.length : (inv.receiptImageUrl ? 1 : 0);
                const isDup = duplicateInvoicesInThisObra.has(inv.id);

                return (
                  <div
                    key={inv.id}
                    className={`rounded-3xl revolut-card revolut-shadow border overflow-hidden transition ${
                      isDup
                        ? 'border-rose-500/50 bg-rose-500/[0.03]'
                        : 'border-black/5 dark:border-white/10'
                    }`}
                  >
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isDup ? 'bg-rose-500/20 text-rose-600' : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          {isDup ? <AlertTriangle className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-black text-black dark:text-white">{inv.storeName}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500">
                              {inv.invoiceNumber}
                            </span>
                            {isDup && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase shadow-sm">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>⛔ Fatura Repetida</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5" />
                              <span>{inv.topic || 'Geral / Outros'}</span>
                            </span>
                            {inv.category && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                                <Layers className="w-2.5 h-2.5" />
                                <span>{inv.category}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
                            <span className="font-mono">{new Date(inv.date).toLocaleDateString('pt-PT')}</span>
                            {inv.taxId && <span>NIF: {inv.taxId}</span>}
                            <span>{inv.items.length} artigos</span>

                            {/* Rounding adjustment pill */}
                            {inv.roundAdjustmentAmount !== undefined && inv.roundAdjustmentAmount !== 0 && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                Acerto: {inv.roundAdjustmentAmount > 0 ? '+' : ''}{inv.roundAdjustmentAmount.toFixed(2)}€
                              </span>
                            )}

                            {/* Global direct discount pill */}
                            {inv.globalDiscountAmount !== undefined && inv.globalDiscountAmount > 0 && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                Desconto Rodapé: -{inv.globalDiscountAmount.toFixed(2)}€
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                        <div className="text-right">
                          <span className="text-lg font-black font-mono text-black dark:text-white block">
                            {inv.totalWithTax.toFixed(2)} €
                          </span>
                          <span className="text-[11px] text-slate-400">
                            s/ IVA: {inv.subtotalWithoutTax.toFixed(2)} €
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Botão Ver Foto Real com contagem de páginas */}
                          {photoCount > 0 && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForPhoto(inv);
                                setActivePhotoPageIndex(0);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition border border-blue-200/60 dark:border-blue-800/60 shadow-sm"
                              title="Ver foto(s) original(is) digitalizada(s)"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Foto Real ({photoCount} {photoCount > 1 ? 'págs' : 'pág'})</span>
                            </button>
                          )}

                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Eliminar fatura"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            className="p-2 rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-neutral-900/40 p-4 sm:p-6 space-y-4">
                        {/* Topic selector, Category selector and photo quick button */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/5 shadow-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Topic selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Tópico:</span>
                              <select
                                value={inv.topic || 'Geral / Outros'}
                                onChange={(e) => updateInvoice(inv.id, { topic: e.target.value })}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-700 border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {availableTopics.map((top) => (
                                  <option key={top} value={top}>{top}</option>
                                ))}
                              </select>
                            </div>

                            {/* Overall Invoice Category selector */}
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
                                <option value="">Selecionar categoria da fatura...</option>
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

                          {photoCount > 0 && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForPhoto(inv);
                                setActivePhotoPageIndex(0);
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ver Foto Real ({photoCount} {photoCount > 1 ? 'páginas' : 'página'})</span>
                            </button>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Artigos Discriminados na Fatura
                            </h5>
                            <span className="text-[11px] text-slate-400">
                              Pode alterar a categoria de cada artigo individualmente no menu abaixo
                            </span>
                          </div>

                          <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 text-slate-400">
                                  <th className="pb-2 font-semibold">Artigo</th>
                                  <th className="pb-2 font-semibold">Categoria / Especialidade</th>
                                  <th className="pb-2 font-semibold text-center">Qtd</th>
                                  <th className="pb-2 font-semibold text-right">P. Unit s/ IVA</th>
                                  <th className="pb-2 font-semibold text-center">IVA</th>
                                  <th className="pb-2 font-semibold text-right">Total c/ IVA</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {inv.items.map((it, idx) => (
                                  <tr
                                    key={it.id || idx}
                                    className="hover:bg-blue-500/5 transition group"
                                  >
                                    <td
                                      onClick={() => handleOpenProduct(it.name, it, inv)}
                                      className="py-2.5 pr-2 cursor-pointer"
                                      title="Clique para ver ficha e histórico deste produto"
                                    >
                                      <span className="font-semibold text-black dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                        {it.name}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <select
                                        value={it.category || inv.category || 'Outros / Geral'}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          const updatedCat = e.target.value;
                                          const newItems = [...inv.items];
                                          newItems[idx] = { ...it, category: updatedCat as any };
                                          updateInvoice(inv.id, { items: newItems });
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px]"
                                      >
                                        {INVOICE_CATEGORY_OPTIONS.map((cat) => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td
                                      onClick={() => handleOpenProduct(it.name, it, inv)}
                                      className="py-2.5 px-2 text-center font-mono cursor-pointer"
                                    >
                                      {it.quantity} {it.unit}
                                    </td>
                                    <td
                                      onClick={() => handleOpenProduct(it.name, it, inv)}
                                      className="py-2.5 px-2 text-right font-mono text-slate-500 cursor-pointer"
                                    >
                                      {it.unitPriceWithoutTax.toFixed(2)} €
                                    </td>
                                    <td
                                      onClick={() => handleOpenProduct(it.name, it, inv)}
                                      className="py-2.5 px-2 text-center font-mono text-slate-400 cursor-pointer"
                                    >
                                      {it.taxRate}%
                                    </td>
                                    <td
                                      onClick={() => handleOpenProduct(it.name, it, inv)}
                                      className="py-2.5 pl-2 text-right font-mono font-bold text-black dark:text-white cursor-pointer"
                                    >
                                      {it.totalWithTax.toFixed(2)} €
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MÃO DE OBRA */}
      {activeTab === 'maodeobra' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-500" />
                <span>Horas e Mão de Obra</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Custos de pessoal, técnicos e subempreiteiros no local.
              </p>
            </div>

            <button
              onClick={() => setIsAddingLabor(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition shadow-sm ios-press-active"
            >
              <Plus className="w-4 h-4" />
              <span>Registar Horas</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Total Gasto em Mão de Obra:
            </span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {finances.totalMaoDeObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          {obraLabor.length === 0 ? (
            <div className="p-12 text-center rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10">
              <HardHat className="w-10 h-10 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-black dark:text-white">Nenhum registo de mão de obra</h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Adicione o número de horas ou dias de trabalho da equipa para contabilizar o custo real desta obra.
              </p>
              <button
                onClick={() => setIsAddingLabor(true)}
                className="mt-4 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-sm"
              >
                + Registar Mão de Obra
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {obraLabor.map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-2xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-black dark:text-white">{l.workerName}</h4>
                      <p className="text-xs text-slate-600 dark:text-neutral-300 mt-0.5">{l.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="font-mono">{new Date(l.date).toLocaleDateString('pt-PT')}</span>
                        <span>•</span>
                        <span>
                          {l.hoursOrDays} {l.unitType} @ {l.costRate}€/{l.unitType === 'horas' ? 'h' : 'dia'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-black font-mono text-black dark:text-white">
                      {l.totalCost.toFixed(2)} €
                    </span>
                    <button
                      onClick={() => setLaborToDelete(l)}
                      className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Eliminar registo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: EQUIPAMENTOS & MANUTENÇÕES PREVENTIVAS */}
      {activeTab === 'manutencao' && (() => {
        const equipamentos = obra.equipamentos_instalados || [];
        const baseDate = obra.completionDate || obra.startDate || new Date().toISOString().split('T')[0];
        const dataAgendada = obra.manutencao?.data_agendada || calcularDataLembrete(baseDate, equipamentos);
        const mensagemTexto = obra.manutencao?.mensagem_preparada || gerarTextoLembrete(obra.client, equipamentos);
        const isAtivo = obra.manutencao?.ativo ?? (equipamentos.length > 0);
        const estado = obra.manutencao?.estado || 'agendado';

        // Dias até à manutenção
        const targetDate = new Date(dataAgendada);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isUrgent = diffDays <= 30 && estado !== 'concluido' && isAtivo;
        const isOverdue = diffDays < 0 && estado !== 'concluido' && isAtivo;

        const handleToggleEquipmentInDetail = (eqKey: EquipamentoInstalado) => {
          const exists = equipamentos.includes(eqKey);
          const updated = exists ? equipamentos.filter((k) => k !== eqKey) : [...equipamentos, eqKey];
          updateObraEquipamentos(obra.id, updated);
        };

        const handleSendObraWhatsApp = () => {
          let cleanPhone = (obra.clientPhone || '').replace(/\D/g, '');
          if (cleanPhone.length === 9) {
            cleanPhone = `351${cleanPhone}`;
          }
          const encoded = encodeURIComponent(mensagemTexto);
          const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
          const todayStr = new Date().toISOString().split('T')[0];
          updateObraManutencao(obra.id, {
            ultimo_envio: todayStr,
            mensagem_preparada: mensagemTexto,
          });
          window.open(url, '_blank');
        };

        const handleMarkRevisionDone = () => {
          const todayStr = new Date().toISOString().split('T')[0];
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          const nextDateStr = nextYear.toISOString().split('T')[0];

          updateObraManutencao(obra.id, {
            estado: 'concluido',
            ultimo_envio: todayStr,
            data_agendada: nextDateStr,
            mensagem_preparada: gerarTextoLembrete(obra.client, equipamentos),
          });
        };

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Status & Summary Card */}
            <div className="p-6 rounded-3xl revolut-card border border-black/5 dark:border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <CalendarClock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-black dark:text-white">
                        Revisão Preventiva & Lembrete Sazonal
                      </h3>
                      {estado === 'concluido' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Revisão Realizada
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                          Atrasada ({Math.abs(diffDays)} dias)
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Faltam {diffDays} dias
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Agendada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                      Carência de 6 meses aplicada às montagens de outono/primavera e ciclo de 11 meses para revisão anual.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSendObraWhatsApp}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition ios-press-active"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp para {obra.client.split(' ')[0]}</span>
                  </button>

                  {estado === 'concluido' ? (
                    <button
                      onClick={() => updateObraManutencao(obra.id, { estado: 'agendado', ativo: true })}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-black dark:text-white text-xs font-bold transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reagendar</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkRevisionDone}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-emerald-500 hover:text-white text-black dark:text-white text-xs font-bold transition"
                      title="Marca como realizada e agenda o próximo ano automaticamente"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Concluir Revisão</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Informações de Contacto & Data Alvo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Contacto WhatsApp do Cliente
                  </span>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      value={obra.clientPhone || ''}
                      onChange={(e) => updateObra(obra.id, { clientPhone: e.target.value })}
                      placeholder="Ex: 912 345 678"
                      className="w-full bg-transparent text-xs font-bold text-black dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Data Prevista da Revisão
                  </span>
                  <input
                    type="date"
                    value={dataAgendada}
                    onChange={(e) => updateObraManutencao(obra.id, { data_agendada: e.target.value })}
                    className="w-full bg-transparent text-xs font-bold text-black dark:text-white outline-none font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Último Contacto Efetuado
                  </span>
                  <span className="text-xs font-bold text-blue-500 block">
                    {obra.manutencao?.ultimo_envio
                      ? new Date(obra.manutencao.ultimo_envio).toLocaleDateString('pt-PT')
                      : 'Nenhum lembrete enviado ainda'}
                  </span>
                </div>
              </div>
            </div>

            {/* Catálogo de Equipamentos Instalados (Seleção Rápida com 1 clique) */}
            <div className="p-6 rounded-3xl revolut-card border border-black/5 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-black dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    <span>Equipamentos Instalados nesta Obra ({equipamentos.length} selecionados)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clique nos equipamentos para ativar ou desativar. A mensagem e as datas adaptam-se instantaneamente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LISTA_EQUIPAMENTOS_OPCOES.map((option) => {
                  const isChecked = equipamentos.includes(option.key);
                  const item = (CATALOGO_EQUIPAMENTOS as any)[option.key];

                  return (
                    <div
                      key={option.key}
                      onClick={() => handleToggleEquipmentInDetail(option.key)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start justify-between select-none ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-600 dark:text-neutral-400 hover:bg-black/10'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-black block truncate">
                            {option.label}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase bg-black/10 dark:bg-white/10 shrink-0">
                            {item?.grupo_sazonal || 'anual'}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-80 line-clamp-2 leading-relaxed">
                          {item?.beneficio || ''}
                        </p>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 dark:border-neutral-700'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mensagem Preparada para o Cliente */}
            <div className="p-6 rounded-3xl revolut-card border border-black/5 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-black dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>Mensagem de Lembrete Pronta para WhatsApp</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gerada com base no catálogo técnico da ENAT e nas particularidades dos equipamentos instalados.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mensagemTexto);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:opacity-80 transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>

                  <button
                    onClick={handleSendObraWhatsApp}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={mensagemTexto}
                onChange={(e) => updateObraManutencao(obra.id, { mensagem_preparada: e.target.value })}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-xs text-black dark:text-white outline-none leading-relaxed resize-none font-medium"
              />
            </div>
          </div>
        );
      })()}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-black dark:text-white">Adicionar Despesa Sem Fatura</h3>
              </div>
              <button
                onClick={() => setIsAddingExpense(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Combustível da carrinha, Buchas na drogaria, Almoço equipa"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Valor (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-bold font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Categoria de Custo
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as MaterialCategory)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Acessórios & Fixação">Acessórios & Fixação (suportes, calhas, buchas, parafusos)</option>
                  <option value="Máquinas & Equipamentos">Máquinas & Equipamentos (ar condicionado, motores)</option>
                  <option value="Ligações Elétricas & Componentes">Ligações Elétricas & Componentes (cabos, quadros)</option>
                  <option value="Tubos de Refrigeração & Gás">Tubos de Refrigeração & Gás (cobre, armaflex, fluido)</option>
                  <option value="Tubos de Água & Canalização">Tubos de Água & Canalização (multicamada, esgotos)</option>
                  <option value="Combustível & Transporte">Combustível & Transporte</option>
                  <option value="Refeições & Estadia">Refeições & Estadia da Equipa</option>
                  <option value="Ferramentas & Equipamento">Ferramentas & Equipamento</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tópico / Sistema da Obra *
                </label>
                <select
                  value={expenseTopic}
                  onChange={(e) => setExpenseTopic(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableTopics.map((top) => (
                    <option key={top} value={top}>{top}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Fornecedor / Local
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Galp, Leroy local, Drogaria"
                    value={expenseSupplier}
                    onChange={(e) => setExpenseSupplier(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Método
                  </label>
                  <select
                    value={expensePaymentMethod}
                    onChange={(e: any) => setExpensePaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="mbway">MB Way</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Notas / Observações
                </label>
                <input
                  type="text"
                  placeholder="Informação adicional para o controlo"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20 active:scale-95"
                >
                  Registar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTAR RECEBIMENTO DE CLIENTE */}
      {isAddingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-black dark:text-white">Registar Recebimento do Cliente</h3>
              </div>
              <button
                onClick={() => setIsAddingPayment(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição / Tranche *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Adiantamento 30%, 2ª Tranche Tubagens, Entrega de Máquinas"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Valor Recebido (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-bold font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Método de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="cheque">Cheque</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="mbway">MB Way</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nº Recibo / Comprovativo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: REC-2024/05"
                    value={paymentReceipt}
                    onChange={(e) => setPaymentReceipt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Notas
                </label>
                <input
                  type="text"
                  placeholder="Observações do recebimento"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPayment(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  Registar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR MÃO DE OBRA */}
      {isAddingLabor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <HardHat className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-black dark:text-white">Registar Mão de Obra</h3>
              </div>
              <button
                onClick={() => setIsAddingLabor(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLabor} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Trabalhador / Equipa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva (Técnico AVAC)"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição do Trabalho *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Passagem de tubagem de refrigeração e calhas"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Qtd
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={hoursOrDays}
                    onChange={(e) => setHoursOrDays(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-bold font-mono text-black dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Unidade
                  </label>
                  <select
                    value={unitType}
                    onChange={(e: any) => setUnitType(e.target.value)}
                    className="w-full px-2 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none"
                  >
                    <option value="horas">Horas</option>
                    <option value="dias">Dias</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Valor/Uni (€)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={costRate}
                    onChange={(e) => setCostRate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-bold font-mono text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={laborDate}
                  onChange={(e) => setLaborDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingLabor(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition shadow-sm active:scale-95"
                >
                  Registar Horas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAÇÃO DE FATURA */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-black dark:text-white">
                Eliminar esta fatura?
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Tem a certeza que deseja remover a fatura <strong>{invoiceToDelete.storeName}</strong> ({invoiceToDelete.invoiceNumber}) no valor de <strong>{invoiceToDelete.totalWithTax.toFixed(2)} €</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:opacity-80 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInvoice(invoiceToDelete.id);
                  setInvoiceToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAÇÃO DE DESPESA MANUAL */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-black dark:text-white">
                Eliminar esta despesa?
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Deseja eliminar o registo &quot;{expenseToDelete.description}&quot; no valor de <strong>{expenseToDelete.amount.toFixed(2)} €</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteManualExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAÇÃO DE RECEBIMENTO */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-black dark:text-white">
                Eliminar recebimento?
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Deseja eliminar o recebimento &quot;{paymentToDelete.description}&quot; de <strong>{paymentToDelete.amount.toFixed(2)} €</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteClientPayment(paymentToDelete.id);
                  setPaymentToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAÇÃO DE MÃO DE OBRA */}
      {laborToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-black dark:text-white">
                Eliminar mão de obra?
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Deseja remover o registo de {laborToDelete.workerName} ({laborToDelete.totalCost.toFixed(2)} €)?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLaborToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLaborRecord(laborToDelete.id);
                  setLaborToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO / EDIÇÃO COMPLETA DA OBRA */}
      {isEditingObraSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black dark:text-white">Configuração da Obra</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Modifique nome, cliente/empresa, morada, orçamento e valores orçamentados por categoria.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingObraSettings(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveObraSettings} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Nome do Projeto & Nome do Cliente / Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nome do Projeto / Obra *
                  </label>
                  <input
                    type="text"
                    required
                    value={editObraName}
                    onChange={(e) => setEditObraName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nome da Empresa / Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={editObraClient}
                    onChange={(e) => setEditObraClient(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Morada da Obra & Orçamento Global */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Morada / Localização
                  </label>
                  <input
                    type="text"
                    value={editObraAddress}
                    onChange={(e) => setEditObraAddress(e.target.value)}
                    placeholder="Morada da obra"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Orçamento Global Aprovado (€) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0,00"
                    value={editObraBudget}
                    onChange={(e) => setEditObraBudget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 font-bold font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Data de Início & Estado da Obra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={editObraStartDate}
                    onChange={(e) => setEditObraStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Estado da Obra (Editável / Reabrir)
                  </label>
                  <select
                    value={editObraStatus}
                    onChange={(e: any) => setEditObraStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="em_curso">Em Curso</option>
                    <option value="concluida">Concluída (Terminada)</option>
                    <option value="orcamento">Em Orçamento</option>
                    <option value="pausada">Pausada</option>
                  </select>
                </div>
              </div>

              {/* Notas da Obra */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  value={editObraNotes}
                  onChange={(e) => setEditObraNotes(e.target.value)}
                  placeholder="Informações adicionais do cliente ou obra"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Valores Orçamentados por Categoria / Especialidade */}
              <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-black dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      <span>Orçamento / Valor Cliente por Categoria</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Defina quanto orçou ou faturou ao cliente para cada categoria/sistema.
                    </p>
                  </div>

                  {(() => {
                    const totalDraft = Object.values(topicBudgetsDraft).reduce((acc, v) => acc + (Number(String(v).replace(',', '.')) || 0), 0);
                    return (
                      <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        Soma: {totalDraft.toLocaleString('pt-PT')} €
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {availableTopics.map((top) => {
                    const val = topicBudgetsDraft[top] || '';
                    return (
                      <div
                        key={top}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3"
                      >
                        <span className="font-bold text-black dark:text-white text-xs">{top}</span>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={val}
                            onChange={(e) =>
                              setTopicBudgetsDraft((prev) => ({
                                ...prev,
                                [top]: e.target.value,
                              }))
                            }
                            className="w-28 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 text-xs font-bold font-mono text-black dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="absolute right-2 top-1.5 text-xs text-slate-400 pointer-events-none">€</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditingObraSettings(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-95"
                >
                  Guardar Configurações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR ORÇAMENTOS / FATURAÇÃO POR TÓPICO PARA APURAMENTO DE LUCRO */}
      {isEditingTopicBudgets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black dark:text-white">Faturação & Orçamentos por Tópico</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Indique o valor cobrado ao cliente por especialidade para calcular o lucro exato de cada uma.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingTopicBudgets(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopicBudgets} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-500">Orçamento Global da Obra:</span>
                <span className="font-black font-mono text-black dark:text-white text-sm">
                  {obra.budget.toLocaleString('pt-PT')} €
                </span>
              </div>

              <div className="space-y-3">
                {availableTopics.map((top) => {
                  const finance = finances.topicFinances.find((f) => f.topic === top);
                  const currentSpent = finance ? finance.totalGasto : 0;
                  const draftVal = topicBudgetsDraft[top] || '';
                  const draftNum = Number(draftVal.replace(',', '.')) || 0;
                  const previewProfit = draftNum > 0 ? draftNum - currentSpent : 0;
                  const previewMargin = draftNum > 0 ? ((previewProfit / draftNum) * 100).toFixed(1) : null;

                  return (
                    <div
                      key={top}
                      className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-[140px]">
                        <span className="text-xs font-bold text-black dark:text-white block">{top}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Gasto Real: {currentSpent.toFixed(2)} €
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={draftVal}
                            onChange={(e) =>
                              setTopicBudgetsDraft((prev) => ({
                                ...prev,
                                [top]: e.target.value,
                              }))
                            }
                            className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 text-xs font-bold font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                          />
                          <span className="absolute right-2 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                            €
                          </span>
                        </div>

                        <div className="min-w-[90px] text-right">
                          {draftNum > 0 ? (
                            <div>
                              <span
                                className={`text-xs font-black font-mono block ${
                                  previewProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                }`}
                              >
                                {previewProfit >= 0 ? '+' : ''}{previewProfit.toFixed(2)} €
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Margem: {previewMargin}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">S/ venda</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditingTopicBudgets(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-95"
                >
                  Guardar Faturação dos Tópicos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR NOVO TÓPICO PERSONALIZADO */}
      {isAddingCustomTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-black dark:text-white">Novo Tópico na Obra</h3>
              </div>
              <button
                onClick={() => setIsAddingCustomTopic(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomTopic} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Tópico / Especialidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Piso Radiante, Rede de Gás, Recuperador de Calor"
                  value={newCustomTopicName}
                  onChange={(e) => setNewCustomTopicName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomTopic(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
                >
                  Adicionar Tópico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZADOR DE FOTO REAL DA FATURA (SUPORTE MULTI-PÁGINAS) */}
      {selectedInvoiceForPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full bg-neutral-900 text-white rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex flex-col max-h-[94vh]">
            {/* Top Modal Header */}
            <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/90 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">
                      {selectedInvoiceForPhoto.storeName}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {selectedInvoiceForPhoto.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{new Date(selectedInvoiceForPhoto.date).toLocaleDateString('pt-PT')}</span>
                    <span>•</span>
                    <span className="text-blue-400 font-semibold">{selectedInvoiceForPhoto.topic || 'Geral / Outros'}</span>
                    <span>•</span>
                    <span className="text-white font-mono font-bold">{selectedInvoiceForPhoto.totalWithTax.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInvoiceForPhoto(null)}
                  className="p-2 rounded-full text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 transition"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Multi-Page Selector Tabs if 2 or more photos exist */}
            {(() => {
              const pages: string[] = selectedInvoiceForPhoto.receiptImageUrls && selectedInvoiceForPhoto.receiptImageUrls.length > 0
                ? selectedInvoiceForPhoto.receiptImageUrls
                : selectedInvoiceForPhoto.receiptImageUrl
                ? [selectedInvoiceForPhoto.receiptImageUrl]
                : [];

              if (pages.length <= 1) return null;

              return (
                <div className="p-3 bg-neutral-950/80 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Páginas ({pages.length}):</span>
                  </span>
                  {pages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoPageIndex(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                        activePhotoPageIndex === idx
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      <span>Página {idx + 1}</span>
                      {idx === 0 && <span className="text-[10px] opacity-75">(Artigos)</span>}
                      {idx === pages.length - 1 && pages.length > 1 && <span className="text-[10px] opacity-75">(Totais & Fim)</span>}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Main Photo Viewer Area */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-neutral-950/50 min-h-[350px]">
              {(() => {
                const pages: string[] = selectedInvoiceForPhoto.receiptImageUrls && selectedInvoiceForPhoto.receiptImageUrls.length > 0
                  ? selectedInvoiceForPhoto.receiptImageUrls
                  : selectedInvoiceForPhoto.receiptImageUrl
                  ? [selectedInvoiceForPhoto.receiptImageUrl]
                  : [];

                const currentImage = pages[activePhotoPageIndex] || pages[0];

                if (!currentImage) {
                  return (
                    <div className="p-12 text-center text-slate-400">
                      <p className="text-sm">Nenhuma fotografia anexada a este documento.</p>
                    </div>
                  );
                }

                return (
                  <div className="max-w-full max-h-[65vh] flex items-center justify-center">
                    <img
                      src={currentImage}
                      alt={`Fatura ${selectedInvoiceForPhoto.invoiceNumber} - Página ${activePhotoPageIndex + 1}`}
                      className="max-w-full max-h-[65vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Bottom Footer Details (Rounding & Footer Discounts) */}
            <div className="p-3.5 sm:p-4 bg-neutral-900 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {selectedInvoiceForPhoto.roundAdjustmentAmount !== undefined && selectedInvoiceForPhoto.roundAdjustmentAmount !== 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                    Acerto de Rodapé: {selectedInvoiceForPhoto.roundAdjustmentAmount > 0 ? '+' : ''}
                    {selectedInvoiceForPhoto.roundAdjustmentAmount.toFixed(2)} €
                  </span>
                )}
                {selectedInvoiceForPhoto.globalDiscountAmount !== undefined && selectedInvoiceForPhoto.globalDiscountAmount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    Desconto Comercial Global: -{selectedInvoiceForPhoto.globalDiscountAmount.toFixed(2)} €
                  </span>
                )}
                <span className="text-slate-400">
                  IVA discriminado: {selectedInvoiceForPhoto.taxAmount.toFixed(2)} €
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold">Total Documento:</span>
                <span className="text-base font-black font-mono text-white">
                  {selectedInvoiceForPhoto.totalWithTax.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO EXECUTIVO EM PDF */}
      {showPDFModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-[#121216] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black dark:text-white">
                    Relatório Financeiro em PDF
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Documento executivo com resumo de custos, especialidades e lucro
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPDFModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Obra Snapshot Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projeto / Obra</span>
                  <span className="text-sm font-bold text-black dark:text-white">{obra.name}</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  obra.status === 'concluida'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}>
                  {obra.status === 'concluida' ? 'Concluída 🏆' : 'Em Curso'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Orçado ao Cliente</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {(finances.topicFinances.reduce((acc, t) => acc + (t.budget || 0), 0) || obra.budget).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Já Gasto</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {finances.totalGastoObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Lucro da Obra</span>
                  <span className={`font-mono font-bold ${
                    finances.lucroTotalObra >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {finances.lucroTotalObra >= 0 ? '+' : ''}{finances.lucroTotalObra.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Margem de Lucro</span>
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] inline-block ${
                    finances.lucroTotalObra >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {finances.margemPercentualPrevista}%
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist of what's included in the PDF */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-black dark:text-white block text-[11px]">
                O relatório em PDF inclui:
              </span>
              <ul className="space-y-1.5 text-slate-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Resumo financeiro executivo (orçamento, gastos, saldo e lucro)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Rentabilidade detalhada por especialidade técnica (VMC, Bombas de calor, AC, UPAC)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Relação de {obraInvoices.length} faturas de fornecedores com IVA discriminado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Registos de mão de obra e despesas diretas associadas</span>
                </li>
              </ul>
            </div>

            {/* Success notification if just downloaded */}
            {pdfSuccessMessage && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 shrink-0" />
                <span>{pdfSuccessMessage}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowPDFModal(false)}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition"
              >
                Fechar
              </button>

              <button
                type="button"
                disabled={isGeneratingPDF}
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A gerar PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descarregar Relatório PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
