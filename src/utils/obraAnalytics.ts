import { Obra, Invoice, LaborRecord, ManualExpense, ClientPayment, InvoiceItem, DEFAULT_OBRA_TOPICS } from '../types';

export type ObraCostCategoryKey =
  | 'maquinas'
  | 'acessorios'
  | 'eletrico'
  | 'refrigeracao'
  | 'agua'
  | 'maodeobra'
  | 'despesasManuais'
  | 'outros';

export interface CategoryCostItem {
  key: ObraCostCategoryKey;
  label: string;
  amount: number;
  percentageOfTotal: number;
  itemCount: number;
  color: string;
  bgLight: string;
  textColor: string;
  description: string;
}

export interface ObraFinancialSummary {
  obraId: string;
  obraName: string;
  clientName: string;
  budget: number;

  // Totais globais
  totalMateriaisComIva: number;
  totalMateriaisSemIva: number;
  totalMaoDeObra: number;
  totalDespesasManuais: number;
  totalGastoObra: number;
  totalCustosReaisSemIva: number;
  totalIvaFaturas: number;

  // Recebimentos do cliente
  totalRecebidoCliente: number;
  saldoAReceber: number;
  percentRecebido: number;
  percentOrcamentoGasto: number;

  // Fiscal e Margens Finais (considerando IVA 23% e acerto com Estado)
  receitaBaseOrcamento: number;
  ivaLiquidadoOrcamento: number;
  ivaAPagarEstadoOrcamento: number;
  saldoFinalEmCaixaOrcamento: number;

  receitaBaseRecebida: number;
  ivaLiquidadoRecebido: number;
  ivaAPagarEstadoRecebido: number;
  saldoFinalEmCaixaRecebido: number;

  margemAtual: number; // Saldo real atual após pagar fornecedores e acerto de IVA
  lucroPrevisto: number; // Lucro Real da Obra (Receita Líquida s/ IVA - Custos s/ IVA)
  lucroTotalObra: number;
  margemPercentualPrevista: number;

  // Tópicos específicos da obra (VMC, Bomba AQS, Climatização, etc.)
  topicFinances: ObraTopicFinance[];

  // Categorias específicas solicitadas pelo utilizador
  breakdown: {
    maquinas: CategoryCostItem;
    acessorios: CategoryCostItem;
    eletrico: CategoryCostItem;
    refrigeracao: CategoryCostItem;
    agua: CategoryCostItem;
    maodeobra: CategoryCostItem;
    despesasManuais: CategoryCostItem;
    outros: CategoryCostItem;
  };
}

export interface ObraTopicFinance {
  topic: string;
  totalGasto: number;
  budget: number;
  lucro: number;
  margemPercent: number;
  invoicesCount: number;
  expensesCount: number;
}

/**
 * Classifies an individual line item or expense into one of the specialized contractor categories.
 * Supports explicit invoice category, item category, topic, brand/supplier recognition,
 * and handles combinations like "cablagem bomba de calor" (-> eletrico) vs "equipamentos ac" (-> maquinas).
 */
export function classifyCostCategory(
  name: string,
  category?: string,
  invoiceCategory?: string,
  invoiceTopic?: string,
  storeName?: string
): ObraCostCategoryKey {
  const catText = ((category || '') + ' ' + (invoiceCategory || '')).toLowerCase();
  const nameText = (name || '').toLowerCase();
  const topicText = (invoiceTopic || '').toLowerCase();
  const storeText = (storeName || '').toLowerCase();

  // Priority 1: Cablagem & Ligações Elétricas
  // Even if the description mentions "bomba de calor" (e.g., "cablagem bomba de calor", "cabo alimentação ar condicionado")
  if (
    catText.includes('cablagem') ||
    catText.includes('material elétrico') ||
    catText.includes('material eletrico') ||
    catText.includes('ligações elétricas') ||
    catText.includes('ligacoes eletricas') ||
    nameText.includes('cablagem') ||
    nameText.includes('cabo elét') ||
    nameText.includes('cabo elet') ||
    nameText.includes('cabo r2v') ||
    nameText.includes('cabo h07') ||
    nameText.includes('cabo solar') ||
    nameText.includes('disjuntor') ||
    nameText.includes('diferencial') ||
    nameText.includes('quadro elét') ||
    nameText.includes('quadro elet') ||
    nameText.includes('contactor') ||
    nameText.includes('relé') ||
    nameText.includes('rele') ||
    nameText.includes('terminal elét') ||
    nameText.includes('borne') ||
    nameText.includes('tubo corrugado') ||
    nameText.includes('canal elét')
  ) {
    return 'eletrico';
  }

  // Priority 2: Tubos de Refrigeração & Gás (Cobre frigorífico, armaflex, fluido R32/R410A)
  if (
    catText.includes('refrigeração') ||
    catText.includes('refrigeracao') ||
    catText.includes('gás') ||
    catText.includes('gas') ||
    catText.includes('cobre') ||
    nameText.includes('tubo de refrigera') ||
    nameText.includes('tubagem cobre') ||
    nameText.includes('tubo cobre') ||
    nameText.includes('cobre frigor') ||
    nameText.includes('armaflex') ||
    nameText.includes('isolamento térmico') ||
    nameText.includes('isolamento termico') ||
    nameText.includes('coquilha') ||
    nameText.includes('gás r') ||
    nameText.includes('gas r') ||
    nameText.includes('r32') ||
    nameText.includes('r410') ||
    nameText.includes('r410a') ||
    nameText.includes('refrigerante') ||
    nameText.includes('solda prata') ||
    nameText.includes('vareta prata')
  ) {
    return 'refrigeracao';
  }

  // Priority 3: Tubos de Água / Canalização (Multicamada, PPR, PVC, esgotos, torneiras, válvulas)
  if (
    catText.includes('canalização') ||
    catText.includes('canalizacao') ||
    catText.includes('água') ||
    catText.includes('agua') ||
    nameText.includes('tubo de água') ||
    nameText.includes('tubo de agua') ||
    nameText.includes('tubos de água') ||
    nameText.includes('tubos agua') ||
    nameText.includes('canaliza') ||
    nameText.includes('multicamada') ||
    nameText.includes('ppr') ||
    nameText.includes('pvc') ||
    nameText.includes('esgoto') ||
    nameText.includes('bomba de condensados') ||
    nameText.includes('válvula') ||
    nameText.includes('valvula') ||
    nameText.includes('torneira') ||
    nameText.includes('racor') ||
    nameText.includes('purgador') ||
    nameText.includes('sifão') ||
    nameText.includes('sifao')
  ) {
    return 'agua';
  }

  // Priority 4: Acessórios & Fixação (suportes, calhas, buchas, parafusos, amortecedores)
  if (
    (catText.includes('acessóri') || catText.includes('acessori') || catText.includes('fixação') || catText.includes('fixacao')) &&
    !catText.includes('equipamento') &&
    !catText.includes('máquina') &&
    !catText.includes('maquina')
  ) {
    return 'acessorios';
  }

  if (
    nameText.includes('suporte') ||
    nameText.includes('calha') ||
    nameText.includes('curva calha') ||
    nameText.includes('tampa calha') ||
    nameText.includes('parafuso') ||
    nameText.includes('bucha') ||
    nameText.includes('anilhas') ||
    nameText.includes('silent block') ||
    nameText.includes('amortecedor') ||
    nameText.includes('abraçadeira') ||
    nameText.includes('abracadeira') ||
    nameText.includes('fita') ||
    nameText.includes('cola') ||
    nameText.includes('silicone')
  ) {
    return 'acessorios';
  }

  // Priority 5: Material de Máquinas & Equipamentos
  // Explicitly check for Equipment categories (e.g. "Equipamentos do ar condicionado", "Equipamentos VMC", "Equipamentos Bomba de calor")
  if (
    catText.includes('equipamento') ||
    catText.includes('máquina') ||
    catText.includes('maquina') ||
    catText.includes('sistemas de refrigeração') ||
    catText.includes('ar condicionado') ||
    catText.includes('bomba de calor') ||
    catText.includes('bomba calor') ||
    catText.includes('vmc') ||
    catText.includes('ventiloconvector') ||
    catText.includes('upac')
  ) {
    return 'maquinas';
  }

  // Check HVAC Equipment brands, models, and technical units
  if (
    nameText.includes('ar condicionado') ||
    nameText.includes('bomba de calor') ||
    nameText.includes('bomba calor') ||
    nameText.includes('split') ||
    nameText.includes('multisplit') ||
    nameText.includes('mono-split') ||
    nameText.includes('monosplit') ||
    nameText.includes('unidade interior') ||
    nameText.includes('unidade exterior') ||
    nameText.includes('unid. int') ||
    nameText.includes('unid. ext') ||
    nameText.includes('unid int') ||
    nameText.includes('unid ext') ||
    nameText.includes('unidade mural') ||
    nameText.includes('unidade conduta') ||
    nameText.includes('unidade cassete') ||
    nameText.includes('mural') ||
    nameText.includes('conduta') ||
    nameText.includes('cassete') ||
    nameText.includes('recuperador') ||
    nameText.includes('vmc') ||
    nameText.includes('ventiloconvector') ||
    nameText.includes('ventiloconvectores') ||
    nameText.includes('fancoil') ||
    nameText.includes('termoacumulador') ||
    nameText.includes('depósito de inércia') ||
    nameText.includes('deposito de inercia') ||
    nameText.includes('depósito aqs') ||
    nameText.includes('deposito aqs') ||
    nameText.includes('caldeira') ||
    nameText.includes('compressor') ||
    nameText.includes('ventilador') ||
    nameText.includes('chiller') ||
    nameText.includes('aerotermia') ||
    nameText.includes('inversor') ||
    nameText.includes('inverter') ||
    // Major Portuguese HVAC Brands (Ernes, Rexel, Sanitop catalogs)
    nameText.includes('mitsubishi') ||
    nameText.includes('daikin') ||
    nameText.includes('panasonic') ||
    nameText.includes('haier') ||
    nameText.includes('baxi') ||
    nameText.includes('ariston') ||
    nameText.includes('vaillant') ||
    nameText.includes('daitsu') ||
    nameText.includes('gree') ||
    nameText.includes('midea') ||
    nameText.includes('toshiba') ||
    nameText.includes('hitachi') ||
    nameText.includes('carrier') ||
    nameText.includes('fujitsu') ||
    nameText.includes('vulcano') ||
    nameText.includes('junkers') ||
    nameText.includes('atlantic') ||
    nameText.includes('ecodan') ||
    nameText.includes('altherma') ||
    nameText.includes('aquarea') ||
    nameText.includes('therma v') ||
    // Model codes typical on Ernes and equipment supplier invoices
    nameText.startsWith('msz-') ||
    nameText.startsWith('muz-') ||
    nameText.startsWith('mxz-') ||
    nameText.startsWith('mfz-') ||
    nameText.startsWith('sez-') ||
    nameText.startsWith('pez-') ||
    nameText.startsWith('ftx-') ||
    nameText.includes(' msz') ||
    nameText.includes(' muz') ||
    nameText.includes(' mxz') ||
    nameText.includes(' ftx')
  ) {
    return 'maquinas';
  }

  // Distributor check: Ernes (Equipamentos de Refrigeração e Climatização)
  // If invoice comes from Ernes and is in an HVAC topic, classify as maquinas if not specifically electrical or plumbing
  if (
    storeText.includes('ernes') &&
    (topicText.includes('ar condicionado') ||
      topicText.includes('bomba') ||
      topicText.includes('climatiza') ||
      topicText.includes('vmc') ||
      topicText.includes('ventilo'))
  ) {
    return 'maquinas';
  }

  // Fallbacks
  if (catText.includes('elétric') || catText.includes('eletric')) return 'eletrico';
  if (catText.includes('água') || catText.includes('agua') || catText.includes('canaliza')) return 'agua';
  if (catText.includes('acessóri') || catText.includes('acessori')) return 'acessorios';
  if (catText.includes('refrigera')) return 'refrigeracao';

  return 'outros';
}

/**
 * Calculates complete obra analytics, breakdown, and client balances
 */
export function calculateObraFinances(
  obra: Obra,
  allInvoices: Invoice[],
  allLabor: LaborRecord[],
  allExpenses: ManualExpense[],
  allPayments: ClientPayment[]
): ObraFinancialSummary {
  const obraInvoices = allInvoices.filter((i) => i.obraId === obra.id);
  const obraLabor = allLabor.filter((l) => l.obraId === obra.id);
  const obraExpenses = allExpenses.filter((e) => e.obraId === obra.id);
  const obraPayments = allPayments.filter((p) => p.obraId === obra.id);

  const totalMateriaisComIva = Number(obraInvoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0).toFixed(2));
  const totalMateriaisSemIva = Number(obraInvoices.reduce((acc, i) => acc + (Number(i.subtotalWithoutTax) || 0), 0).toFixed(2));
  const totalIvaFaturas = Number(obraInvoices.reduce((acc, i) => acc + (Number(i.taxAmount) || 0), 0).toFixed(2));
  const totalMaoDeObra = Number(obraLabor.reduce((acc, l) => acc + (Number(l.totalCost) || 0), 0).toFixed(2));
  const totalDespesasManuais = Number(obraExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0).toFixed(2));
  const totalGastoObra = Number((totalMateriaisComIva + totalMaoDeObra + totalDespesasManuais).toFixed(2));
  const totalCustosReaisSemIva = Number((totalMateriaisSemIva + totalMaoDeObra + totalDespesasManuais).toFixed(2));

  // Contabilidade com base no Orçamento Total Contratado (com IVA 23%)
  const receitaBaseOrcamento = obra.budget > 0 ? Number((obra.budget / 1.23).toFixed(2)) : 0;
  const ivaLiquidadoOrcamento = obra.budget > 0 ? Number((obra.budget - receitaBaseOrcamento).toFixed(2)) : 0;
  const ivaAPagarEstadoOrcamento = Number((ivaLiquidadoOrcamento - totalIvaFaturas).toFixed(2));
  const lucroPrevisto = Number((receitaBaseOrcamento - totalCustosReaisSemIva).toFixed(2));
  const saldoFinalEmCaixaOrcamento = Number((obra.budget - totalGastoObra - ivaAPagarEstadoOrcamento).toFixed(2));
  const margemPercentualPrevista = receitaBaseOrcamento > 0 ? Number(((lucroPrevisto / receitaBaseOrcamento) * 100).toFixed(1)) : 0;

  // Contabilidade com base nos Recebimentos Reais à Data
  const totalRecebidoCliente = Number(obraPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toFixed(2));
  const saldoAReceber = Number(Math.max(0, obra.budget - totalRecebidoCliente).toFixed(2));
  const percentRecebido = obra.budget > 0 ? Number(((totalRecebidoCliente / obra.budget) * 100).toFixed(1)) : 0;
  const percentOrcamentoGasto = obra.budget > 0 ? Number(((totalGastoObra / obra.budget) * 100).toFixed(1)) : 0;

  const receitaBaseRecebida = totalRecebidoCliente > 0 ? Number((totalRecebidoCliente / 1.23).toFixed(2)) : 0;
  const ivaLiquidadoRecebido = totalRecebidoCliente > 0 ? Number((totalRecebidoCliente - receitaBaseRecebida).toFixed(2)) : 0;
  const ivaAPagarEstadoRecebido = Number((ivaLiquidadoRecebido - totalIvaFaturas).toFixed(2));
  const margemAtual = Number((receitaBaseRecebida - totalCustosReaisSemIva).toFixed(2));
  const saldoFinalEmCaixaRecebido = Number((totalRecebidoCliente - totalGastoObra - ivaAPagarEstadoRecebido).toFixed(2));

  // Categorization accumulators
  const catTotals: Record<ObraCostCategoryKey, { amount: number; count: number }> = {
    maquinas: { amount: 0, count: 0 },
    acessorios: { amount: 0, count: 0 },
    eletrico: { amount: 0, count: 0 },
    refrigeracao: { amount: 0, count: 0 },
    agua: { amount: 0, count: 0 },
    maodeobra: { amount: totalMaoDeObra, count: obraLabor.length },
    despesasManuais: { amount: 0, count: 0 },
    outros: { amount: 0, count: 0 },
  };

  // 1. Process items inside invoices (or entire invoice if items is empty)
  obraInvoices.forEach((inv) => {
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach((item) => {
        const cat = classifyCostCategory(
          item.name,
          item.category,
          inv.category,
          inv.topic,
          inv.storeName
        );
        const itemTotal = Number(item.totalWithTax) || 0;
        catTotals[cat].amount += itemTotal;
        catTotals[cat].count += 1;
      });
    } else {
      // In case invoice has no line items, classify the entire invoice total!
      const cat = classifyCostCategory(
        inv.storeName || 'Fatura Geral',
        inv.category,
        inv.category,
        inv.topic,
        inv.storeName
      );
      const invTotal = Number(inv.totalWithTax) || 0;
      catTotals[cat].amount += invTotal;
      catTotals[cat].count += 1;
    }
  });

  // 2. Process manual expenses without invoice
  obraExpenses.forEach((exp) => {
    const cat = classifyCostCategory(exp.description, exp.category, undefined, exp.topic, exp.supplierOrPlace);
    // If expense specifically falls under one of the materials, attribute to it, otherwise to despesasManuais
    if (['maquinas', 'acessorios', 'eletrico', 'refrigeracao', 'agua'].includes(cat)) {
      catTotals[cat].amount += exp.amount;
      catTotals[cat].count += 1;
    }
  });

  const calcPct = (amount: number) => {
    if (totalGastoObra <= 0) return 0;
    return Number(((amount / totalGastoObra) * 100).toFixed(1));
  };

  // 3. Compute topic finances (VMC, Bomba AQS, Ar Condicionado, etc.)
  const allTopicNames = Array.from(
    new Set([
      ...DEFAULT_OBRA_TOPICS,
      ...(obra.customTopics || []),
      ...obraInvoices.map((i) => i.topic).filter(Boolean),
      ...obraExpenses.map((e) => e.topic).filter(Boolean),
    ])
  ) as string[];

  const topicFinances: ObraTopicFinance[] = allTopicNames.map((top) => {
    const topInvoices = obraInvoices.filter((i) => (i.topic || 'Geral / Outros') === top);
    const topExpenses = obraExpenses.filter((e) => (e.topic || 'Geral / Outros') === top);

    const invTotal = topInvoices.reduce((acc, i) => acc + (Number(i.totalWithTax) || 0), 0);
    const expTotal = topExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalGasto = Number((invTotal + expTotal).toFixed(2));

    const topicBudget = Number(obra.topicBudgets?.[top]) || 0;
    const lucro = topicBudget > 0 ? Number((topicBudget - totalGasto).toFixed(2)) : 0;
    const margemPercent = topicBudget > 0 ? Number(((lucro / topicBudget) * 100).toFixed(1)) : 0;

    return {
      topic: top,
      totalGasto,
      budget: topicBudget,
      lucro,
      margemPercent,
      invoicesCount: topInvoices.length,
      expensesCount: topExpenses.length,
    };
  });

  return {
    obraId: obra.id,
    obraName: obra.name,
    clientName: obra.client,
    budget: obra.budget,
    totalMateriaisComIva,
    totalMateriaisSemIva,
    totalMaoDeObra,
    totalDespesasManuais,
    totalGastoObra,
    totalCustosReaisSemIva,
    totalIvaFaturas,
    totalRecebidoCliente,
    saldoAReceber,
    percentRecebido,
    percentOrcamentoGasto,
    receitaBaseOrcamento,
    ivaLiquidadoOrcamento,
    ivaAPagarEstadoOrcamento,
    saldoFinalEmCaixaOrcamento,
    receitaBaseRecebida,
    ivaLiquidadoRecebido,
    ivaAPagarEstadoRecebido,
    saldoFinalEmCaixaRecebido,
    margemAtual,
    lucroPrevisto,
    lucroTotalObra: lucroPrevisto,
    margemPercentualPrevista,
    topicFinances,
    breakdown: {
      maquinas: {
        key: 'maquinas',
        label: 'Material de Máquinas & Equipamentos',
        amount: Number(catTotals.maquinas.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.maquinas.amount),
        itemCount: catTotals.maquinas.count,
        color: '#2563EB', // Blue
        bgLight: 'bg-blue-500/10 dark:bg-blue-500/20',
        textColor: 'text-blue-600 dark:text-blue-400',
        description: 'Ar condicionado, bombas de calor, splits, recuperadores e equipamentos principais.',
      },
      acessorios: {
        key: 'acessorios',
        label: 'Acessórios & Fixação',
        amount: Number(catTotals.acessorios.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.acessorios.amount),
        itemCount: catTotals.acessorios.count,
        color: '#D97706', // Amber
        bgLight: 'bg-amber-500/10 dark:bg-amber-500/20',
        textColor: 'text-amber-600 dark:text-amber-400',
        description: 'Suportes de parede, calhas, buchas, parafusos, amortecedores e fitas.',
      },
      eletrico: {
        key: 'eletrico',
        label: 'Ligações Elétricas ou Componentes',
        amount: Number(catTotals.eletrico.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.eletrico.amount),
        itemCount: catTotals.eletrico.count,
        color: '#7C3AED', // Purple
        bgLight: 'bg-purple-500/10 dark:bg-purple-500/20',
        textColor: 'text-purple-600 dark:text-purple-400',
        description: 'Cabos elétricos, disjuntores, quadros, relés, diferenciais e terminais.',
      },
      refrigeracao: {
        key: 'refrigeracao',
        label: 'Tubos de Refrigeração & Gás',
        amount: Number(catTotals.refrigeracao.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.refrigeracao.amount),
        itemCount: catTotals.refrigeracao.count,
        color: '#0284C7', // Sky
        bgLight: 'bg-sky-500/10 dark:bg-sky-500/20',
        textColor: 'text-sky-600 dark:text-sky-400',
        description: 'Linhas de cobre frigorífico, isolamento armaflex e gás refrigerante R32/R410A.',
      },
      agua: {
        key: 'agua',
        label: 'Tubos de Água / Canalização',
        amount: Number(catTotals.agua.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.agua.amount),
        itemCount: catTotals.agua.count,
        color: '#0D9488', // Teal
        bgLight: 'bg-teal-500/10 dark:bg-teal-500/20',
        textColor: 'text-teal-600 dark:text-teal-400',
        description: 'Tubagem multicamada, tubos PPR/PVC, esgotos de condensados e válvulas.',
      },
      maodeobra: {
        key: 'maodeobra',
        label: 'Mão de Obra & Técnicos',
        amount: Number(totalMaoDeObra.toFixed(2)),
        percentageOfTotal: calcPct(totalMaoDeObra),
        itemCount: obraLabor.length,
        color: '#10B981', // Emerald
        bgLight: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        description: 'Horas e dias de trabalho da equipa no local da obra.',
      },
      despesasManuais: {
        key: 'despesasManuais',
        label: 'Despesas Sem Fatura / Diretas',
        amount: Number(catTotals.despesasManuais.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.despesasManuais.amount),
        itemCount: catTotals.despesasManuais.count,
        color: '#EA580C', // Orange
        bgLight: 'bg-orange-500/10 dark:bg-orange-500/20',
        textColor: 'text-orange-600 dark:text-orange-400',
        description: 'Despesas imediatas sem fatura (combustível, refeições, pequenos materiais avulsos).',
      },
      outros: {
        key: 'outros',
        label: 'Outros Materiais & Geral',
        amount: Number(catTotals.outros.amount.toFixed(2)),
        percentageOfTotal: calcPct(catTotals.outros.amount),
        itemCount: catTotals.outros.count,
        color: '#64748B', // Slate
        bgLight: 'bg-slate-500/10 dark:bg-slate-500/20',
        textColor: 'text-slate-600 dark:text-slate-400',
        description: 'Ferramentas de desgaste, consumíveis gerais e artigos diversos.',
      },
    },
  };
}
