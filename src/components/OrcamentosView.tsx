import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calculator,
  Plus,
  Search,
  FileText,
  Download,
  Printer,
  Eye,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Building2,
  User,
  MapPin,
  Phone,
  FileSpreadsheet,
  Layers,
  AlertTriangle,
  Check,
  ShieldCheck,
  Clock,
  CreditCard,
  ChevronRight,
  Package,
  Wrench,
  Tag,
  X,
  Share2,
  Percent,
  TrendingUp,
  Send,
  Mail,
  MessageSquare,
  UserPlus,
  History,
  RefreshCw,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Orcamento,
  OrcamentoItem,
  OrcamentoLaborItem,
  ORCAMENTO_DEFAULT_CATEGORIES,
} from '../types';
import { downloadOrcamentoPDF, generateOrcamentoPDF } from '../utils/orcamentoPdfGenerator';

// Modelos de Equipamentos e Materiais por Sistema Técnico
export const SYSTEM_TEMPLATES: Record<
  string,
  {
    items: Array<{ name: string; category: string; quantity: number; unit: string; unitPrice: number }>;
    labor: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>;
  }
> = {
  'Ar condicionado: Murais': {
    items: [
      { name: 'Ar Condicionado Mono-Split Inverter 12000 BTU Classe A++', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 680 },
      { name: 'Linha frigorífica em tubo de cobre 1/4" e 3/8" com isolamento térmico', category: 'Canalização & Tubagens', quantity: 5, unit: 'm', unitPrice: 14 },
      { name: 'Suportes de parede para unidade exterior com silentblocks antivibráticos', category: 'Acessórios & Fixação', quantity: 1, unit: 'conjunto', unitPrice: 45 },
      { name: 'Tubo de condensados rígido e cabo de interligação 4x1.5mm²', category: 'Material Elétrico', quantity: 5, unit: 'm', unitPrice: 4 },
    ],
    labor: [
      { description: 'Montagem mecânica da unidade interior e exterior com fixação antivibrática', quantity: 1, unit: 'serviço', unitPrice: 200 },
      { description: 'Interligação frigorífica, ensaio de estanquicidade a azoto, vácuo e comissionamento', quantity: 1, unit: 'serviço', unitPrice: 120 },
    ],
  },
  'Ar condicionado: Conduta': {
    items: [
      { name: 'Unidade de Conduta Inverter de Baixa/Média Silhueta com comando por cabo', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 1450 },
      { name: 'Plenum de insuflação e retorno com isolamento térmico e acústico', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 280 },
      { name: 'Condutas flexíveis isoladas e grelhas de difusão linear de ar', category: 'Acessórios & Fixação', quantity: 1, unit: 'conjunto', unitPrice: 350 },
      { name: 'Linha frigorífica reforçada e bomba de esgoto para condensados', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 160 },
    ],
    labor: [
      { description: 'Instalação suspensa da unidade de conduta, montagem de plenuns e grelhas', quantity: 1, unit: 'serviço', unitPrice: 450 },
      { description: 'Ligações frigoríficas, elétricas, ensaios de estanquicidade e regulação de caudais', quantity: 1, unit: 'serviço', unitPrice: 220 },
    ],
  },
  'Bomba de calor aqs': {
    items: [
      { name: 'Bomba de calor AQS Monobloco 200L com serpentina inox alta eficiência A+', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 1850 },
      { name: 'Acessórios de ligação hidráulica, tubagem multicamada, válvula de segurança e vaso de expansão', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 240 },
    ],
    labor: [
      { description: 'Montagem mecânica e assentamento da bomba de calor AQS e ligação à rede de águas', quantity: 1, unit: 'serviço', unitPrice: 350 },
      { description: 'Ligação elétrica, proteção disjuntor diferencial, arranque e parametrização', quantity: 1, unit: 'serviço', unitPrice: 120 },
    ],
  },
  'Bomba de calor climatização': {
    items: [
      { name: 'Bomba de calor Climatização Ar-Água 12kW Inverter (Aquecimento / Arrefecimento)', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 4300 },
      { name: 'Depósito de inércia 100L com isolamento térmico e grupo circulador de alta eficiência', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 650 },
      { name: 'Filtro deslamador magnético, purgadores automáticos, válvulas de corte e manómetros', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 320 },
    ],
    labor: [
      { description: 'Instalação mecânica e hidráulica da bomba de calor de climatização e depósito de inércia', quantity: 1, unit: 'serviço', unitPrice: 600 },
      { description: 'Cablagem de sinal, ligação ao quadro elétrico, regulação de curvas climáticas e arranque', quantity: 1, unit: 'serviço', unitPrice: 250 },
    ],
  },
  'Ventiloconvectores': {
    items: [
      { name: 'Ventiloconvectores de embutir/parede ultra-silenciosos com motor EC Inverter', category: 'Máquinas & Equipamentos', quantity: 3, unit: 'un', unitPrice: 420 },
      { name: 'Válvulas termostáticas de 3 vias com atuador eletrotérmico e termóstato digital', category: 'Acessórios & Fixação', quantity: 3, unit: 'conjunto', unitPrice: 95 },
      { name: 'Rede de distribuição hidráulica isolada e drenagem de condensados', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 260 },
    ],
    labor: [
      { description: 'Fixação dos ventiloconvectores, ligação hidráulica e ligação aos termóstatos de ambiente', quantity: 1, unit: 'serviço', unitPrice: 380 },
    ],
  },
  'Piso radiante': {
    items: [
      { name: 'Placa de isolamento térmico e acústico com nódulos para piso radiante', category: 'Canalização & Tubagens', quantity: 120, unit: 'm²', unitPrice: 14 },
      { name: 'Tubo PE-RT com barreira anti-oxigénio 16x2.0mm', category: 'Canalização & Tubagens', quantity: 800, unit: 'm', unitPrice: 0.95 },
      { name: 'Coletor de distribuição em inox com fluxómetros reguláveis e caixa metálica de embutir', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 420 },
      { name: 'Banda perimetral de dilatação e aditivo fluidificante para betonilha', category: 'Acessórios & Fixação', quantity: 1, unit: 'conjunto', unitPrice: 110 },
    ],
    labor: [
      { description: 'Colocação de banda perimetral, placas de isolamento e assentamento de tubagem de piso radiante', quantity: 1, unit: 'serviço', unitPrice: 750 },
      { description: 'Ensaio de estanquicidade sob pressão a 6 bar e purga do sistema', quantity: 1, unit: 'serviço', unitPrice: 180 },
    ],
  },
  'VMC': {
    items: [
      { name: 'Unidade de VMC Duplo Fluxo com recuperação de calor de alta eficiência (>85%) e bypass', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 1650 },
      { name: 'Caixas de distribuição e condutas flexíveis semi-rígidas PE antibacterianas e antiestáticas', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 580 },
      { name: 'Bocas de insuflação e extração auto-reguláveis e grelhas exteriores de fachada', category: 'Acessórios & Fixação', quantity: 1, unit: 'conjunto', unitPrice: 190 },
    ],
    labor: [
      { description: 'Montagem da máquina VMC, furações de passagem e distribuição de condutas', quantity: 1, unit: 'serviço', unitPrice: 480 },
      { description: 'Equilibração de caudais de ar, ligação ao comando central e colocação em serviço', quantity: 1, unit: 'serviço', unitPrice: 150 },
    ],
  },
  'UPAC (Fotovoltaico)': {
    items: [
      { name: 'Módulos Solares Fotovoltaicos Monocristalinos Tier-1 de Alta Eficiência (550W+)', category: 'Máquinas & Equipamentos', quantity: 8, unit: 'un', unitPrice: 125 },
      { name: 'Inversor Solar Híbrido Monofásico/Trifásico com monitorização WiFi em tempo real', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 1100 },
      { name: 'Estrutura de fixação em alumínio para cobertura com calha e grampos inox', category: 'Acessórios & Fixação', quantity: 1, unit: 'conjunto', unitPrice: 280 },
      { name: 'Quadro de proteção AC/DC com descarregadores de sobretensões e cablagem solar 6mm²', category: 'Material Elétrico', quantity: 1, unit: 'conjunto', unitPrice: 240 },
    ],
    labor: [
      { description: 'Montagem mecânica dos painéis solares em cobertura e assentamento da estrutura', quantity: 1, unit: 'serviço', unitPrice: 420 },
      { description: 'Instalação elétrica, ligação ao inversor e quadro geral, ensaios de isolamento e configuração da App', quantity: 1, unit: 'serviço', unitPrice: 280 },
    ],
  },
  'Paineis Solares Termicos': {
    items: [
      { name: 'Coletores Solares Térmicos Planos de alto rendimento com vidro temperado prismático', category: 'Máquinas & Equipamentos', quantity: 2, unit: 'un', unitPrice: 480 },
      { name: 'Termosifão / Termoacumulador Solar com dupla serpentina esmaltada de 300L', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 1150 },
      { name: 'Grupo hidráulico solar com controlador diferencial, vaso de expansão solar e glicol solar', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 380 },
    ],
    labor: [
      { description: 'Instalação dos coletores solares em cobertura com estrutura de fixação', quantity: 1, unit: 'serviço', unitPrice: 380 },
      { description: 'Interligação hidráulica solar, enchimento com fluido térmico, pressurização e purga', quantity: 1, unit: 'serviço', unitPrice: 190 },
    ],
  },
  'Recuperador de calor': {
    items: [
      { name: 'Recuperador de Calor a Pellets ou Lenha de Alto Rendimento com porta estanque', category: 'Máquinas & Equipamentos', quantity: 1, unit: 'un', unitPrice: 1550 },
      { name: 'Tubagem de evacuação de fumos em Inox AISI 316L com isolamento térmico e terminal anti-vento', category: 'Canalização & Tubagens', quantity: 1, unit: 'conjunto', unitPrice: 360 },
      { name: 'Grelhas de ventilação para circulação de ar por convecção e aro de remate', category: 'Acessórios & Fixação', quantity: 1, unit: 'conjunto', unitPrice: 120 },
    ],
    labor: [
      { description: 'Assentamento e nivelamento do recuperador de calor e fixação mecânica', quantity: 1, unit: 'serviço', unitPrice: 320 },
      { description: 'Montagem de conduta de fumos, isolamento corta-fogo e primeiro acendimento técnico', quantity: 1, unit: 'serviço', unitPrice: 180 },
    ],
  },
};

export const OrcamentosView: React.FC = () => {
  const {
    orcamentos,
    addOrcamento,
    updateOrcamento,
    deleteOrcamento,
    allProducts,
    invoices,
    obras,
    setActiveTab,
  } = useApp();

  // Mode: 'list' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('list');
  const [activeOrcamentoId, setActiveOrcamentoId] = useState<string | null>(null);

  // Search & Filters in list mode
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'orcamento_feito' | 'enviado' | 'adjudicado' | 'recusado' | 'rascunho' | 'aprovado'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'profit_desc' | 'client_asc'>('date_desc');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isDeletingModalOpen, setIsDeletingModalOpen] = useState(false);
  const [orcamentoToDelete, setOrcamentoToDelete] = useState<Orcamento | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Resend Modal State
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [orcamentoToResend, setOrcamentoToResend] = useState<Orcamento | null>(null);
  const [resendChannel, setResendChannel] = useState<'whatsapp' | 'email' | 'manual' | 'pdf'>('whatsapp');
  const [resendNotes, setResendNotes] = useState('');
  const [resendCopiedType, setResendCopiedType] = useState<string | null>(null);

  // Duplicate for New Client Modal State
  const [isDuplicateNewClientModalOpen, setIsDuplicateNewClientModalOpen] = useState(false);
  const [orcamentoToDuplicateForNewClient, setOrcamentoToDuplicateForNewClient] = useState<Orcamento | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNif, setNewClientNif] = useState('');
  const [newQuoteNumber, setNewQuoteNumber] = useState('');

  // Form State for Create / Edit
  const [formNumber, setFormNumber] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('Ponte de Lima');
  const [formCommercial, setFormCommercial] = useState('João Lima');

  // Client Info (all optional - "deixar avançar se não preencher as informações todas")
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNif, setClientNif] = useState('');

  // Quick item addition bar state
  const [quickItemName, setQuickItemName] = useState('');
  const [quickItemCategory, setQuickItemCategory] = useState('Máquinas & Equipamentos');
  const [quickItemQuantity, setQuickItemQuantity] = useState('1');
  const [quickItemUnit, setQuickItemUnit] = useState('un');
  const [quickItemUnitPrice, setQuickItemUnitPrice] = useState('');

  // Selected categories for "Orçamento para: ..."
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');

  // Items list
  const [items, setItems] = useState<OrcamentoItem[]>([]);

  // Labor / Installation items
  const [laborItems, setLaborItems] = useState<OrcamentoLaborItem[]>([
    {
      id: 'labor-1',
      description: 'Mão de obra especializada de montagem mecânica, ligações frigoríficas e elétricas',
      quantity: 1,
      unit: 'serviço',
      unitPrice: 450,
      totalPrice: 450,
    },
    {
      id: 'labor-2',
      description: 'Ensaios de estanquicidade, vácuo digital, ensaios de drenagem e comissionamento',
      quantity: 1,
      unit: 'serviço',
      unitPrice: 150,
      totalPrice: 150,
    },
    {
      id: 'labor-3',
      description: 'Parametrização, arranque do sistema e instruções de funcionamento ao cliente',
      quantity: 1,
      unit: 'serviço',
      unitPrice: 100,
      totalPrice: 100,
    },
  ]);

  // Tax and conditions
  const [taxRate, setTaxRate] = useState<number>(23);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(20);
  const [customMarginInput, setCustomMarginInput] = useState<string>('');
  const [validityDays, setValidityDays] = useState<number>(15);
  const [deliveryTerm, setDeliveryTerm] = useState('A combinar');
  const [paymentConditions, setPaymentConditions] = useState('50% na adjudicação');
  const [workInChargeOf, setWorkInChargeOf] = useState('Enat Energias');
  const [installationWarranty, setInstallationWarranty] = useState('2 anos');
  const [equipmentWarranty, setEquipmentWarranty] = useState('Consultar ficha técnica do equipamento');
  const [notes, setNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'orcamento_feito' | 'enviado' | 'adjudicado' | 'recusado' | 'rascunho' | 'aprovado'>('orcamento_feito');

  // Autocomplete state for material search
  const [activeItemAutocompleteIdx, setActiveItemAutocompleteIdx] = useState<number | null>(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setActiveItemAutocompleteIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered materials from database of invoices
  const suggestedMaterials = useMemo(() => {
    if (!autocompleteQuery || autocompleteQuery.trim().length < 1) {
      return allProducts.slice(0, 10);
    }
    const q = autocompleteQuery.toLowerCase();
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 12);
  }, [allProducts, autocompleteQuery]);

  // Dynamic Title calculation based on selected categories
  const calculatedTitle = useMemo(() => {
    if (customTitle && customTitle.trim()) {
      return customTitle.trim();
    }
    if (selectedCategories.length === 0) {
      return 'Orçamento para: Fornecimento e Instalação de Equipamentos';
    }
    const joined = selectedCategories.join(' e ');
    return `Orçamento para: Fornecimento e Instalação de ${joined}`;
  }, [selectedCategories, customTitle]);

  // Financial Totals calculation
  const subtotalItems = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
  }, [items]);

  const subtotalLabor = useMemo(() => {
    return laborItems.reduce((acc, lb) => acc + (Number(lb.totalPrice) || 0), 0);
  }, [laborItems]);

  // Custo base de materiais + mão de obra antes da margem de lucro
  const baseCostWithoutTax = useMemo(() => {
    return subtotalItems + subtotalLabor;
  }, [subtotalItems, subtotalLabor]);

  // Valor monetário do lucro (€)
  const profitAmount = useMemo(() => {
    return (baseCostWithoutTax * (Number(profitMarginPercent) || 0)) / 100;
  }, [baseCostWithoutTax, profitMarginPercent]);

  // Subtotal de venda s/IVA (Custo Base + Lucro)
  const subtotalWithoutTax = useMemo(() => {
    return baseCostWithoutTax + profitAmount;
  }, [baseCostWithoutTax, profitAmount]);

  const taxAmount = useMemo(() => {
    return (subtotalWithoutTax * taxRate) / 100;
  }, [subtotalWithoutTax, taxRate]);

  const totalWithTax = useMemo(() => {
    return subtotalWithoutTax + taxAmount;
  }, [subtotalWithoutTax, taxAmount]);

  // Currently selected orcamento for preview
  const currentPreviewOrcamento = useMemo(() => {
    if (activeOrcamentoId) {
      const found = orcamentos.find((o) => o.id === activeOrcamentoId);
      if (found) return found;
    }
    // Fallback to active editor data
    return buildOrcamentoFromForm();
  }, [activeOrcamentoId, orcamentos, formNumber, formDate, formLocation, formCommercial, clientName, clientAddress, clientContact, clientEmail, clientNif, selectedCategories, calculatedTitle, items, laborItems, subtotalItems, subtotalLabor, baseCostWithoutTax, profitMarginPercent, profitAmount, subtotalWithoutTax, taxRate, taxAmount, totalWithTax, validityDays, deliveryTerm, paymentConditions, workInChargeOf, installationWarranty, equipmentWarranty, notes, formStatus]);

  function buildOrcamentoFromForm(): Orcamento {
    return {
      id: activeOrcamentoId || `orc-temp-${Date.now()}`,
      number: formNumber || `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`,
      date: formDate || new Date().toISOString().split('T')[0],
      location: formLocation || 'Ponte de Lima',
      commercialResponsible: formCommercial || 'João Lima',
      client: {
        name: clientName,
        address: clientAddress,
        contact: clientContact,
        email: clientEmail,
        nif: clientNif,
      },
      selectedCategories,
      customTitle,
      title: calculatedTitle,
      items,
      laborItems,
      subtotalItems,
      subtotalLabor,
      baseCostWithoutTax,
      profitMarginPercent,
      profitAmount,
      subtotalWithoutTax,
      taxRate,
      taxAmount,
      totalWithTax,
      validityDays,
      deliveryTerm,
      paymentConditions,
      workInChargeOf,
      installationWarranty,
      equipmentWarranty,
      notes,
      status: formStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Toggle category in Step 1 and automatically load system items
  const toggleCategory = (catLabel: string) => {
    setSelectedCategories((prev) => {
      const willSelect = !prev.includes(catLabel);
      if (willSelect) {
        // Automatically inject templates for this selected system
        const tmpl = SYSTEM_TEMPLATES[catLabel];
        if (tmpl) {
          const newItems: OrcamentoItem[] = tmpl.items.map((it, idx) => ({
            id: `item-${Date.now()}-${catLabel.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4)}-${idx}`,
            name: it.name,
            category: it.category,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            totalPrice: it.quantity * it.unitPrice,
            fromDatabase: false,
          }));
          setItems((currentItems) => [...currentItems, ...newItems]);

          const newLabor: OrcamentoLaborItem[] = tmpl.labor.map((lb, idx) => ({
            id: `labor-${Date.now()}-${catLabel.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4)}-${idx}`,
            description: lb.description,
            quantity: lb.quantity,
            unit: lb.unit,
            unitPrice: lb.unitPrice,
            totalPrice: lb.quantity * lb.unitPrice,
          }));
          setLaborItems((currentLabor) => [...currentLabor, ...newLabor]);
          showToast(`Adicionados equipamentos e mão de obra de "${catLabel}"!`);
        }
        return [...prev, catLabel];
      } else {
        return prev.filter((c) => c !== catLabel);
      }
    });
  };

  // Start new quote
  const handleStartNewOrcamento = () => {
    const nextNum = `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`;
    setActiveOrcamentoId(null);
    setFormNumber(nextNum);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormLocation('Ponte de Lima');
    setFormCommercial('João Lima');
    setClientName('');
    setClientAddress('');
    setClientContact('');
    setClientEmail('');
    setClientNif('');
    setSelectedCategories(['Bomba de calor aqs']);
    setCustomTitle('');
    
    // Load initial items from Bomba de calor aqs
    const bcAqs = SYSTEM_TEMPLATES['Bomba de calor aqs'];
    setItems(
      bcAqs.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        name: it.name,
        category: it.category,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        totalPrice: it.quantity * it.unitPrice,
      }))
    );
    setLaborItems(
      bcAqs.labor.map((lb, idx) => ({
        id: `labor-${Date.now()}-${idx}`,
        description: lb.description,
        quantity: lb.quantity,
        unit: lb.unit,
        unitPrice: lb.unitPrice,
        totalPrice: lb.quantity * lb.unitPrice,
      }))
    );
    setTaxRate(23);
    setProfitMarginPercent(20);
    setCustomMarginInput('');
    setValidityDays(15);
    setDeliveryTerm('A combinar');
    setPaymentConditions('50% na adjudicação');
    setWorkInChargeOf('Enat Energias');
    setInstallationWarranty('2 anos');
    setEquipmentWarranty('Consultar ficha técnica do equipamento');
    setNotes('Proposta inclui arranque dos equipamentos e ensaios de estanquicidade.');
    setFormStatus('orcamento_feito');
    setViewMode('editor');
  };

  // Edit existing quote
  const handleEditOrcamento = (orc: Orcamento) => {
    setActiveOrcamentoId(orc.id);
    setFormNumber(orc.number);
    setFormDate(orc.date);
    setFormLocation(orc.location || 'Ponte de Lima');
    setFormCommercial(orc.commercialResponsible || 'João Lima');
    setClientName(orc.client.name || '');
    setClientAddress(orc.client.address || '');
    setClientContact(orc.client.contact || '');
    setClientEmail(orc.client.email || '');
    setClientNif(orc.client.nif || '');
    setSelectedCategories(orc.selectedCategories || []);
    setCustomTitle(orc.customTitle || '');
    setItems(orc.items || []);
    setLaborItems(orc.laborItems || []);
    setTaxRate(orc.taxRate !== undefined ? orc.taxRate : 23);
    const margin = orc.profitMarginPercent !== undefined ? orc.profitMarginPercent : 20;
    setProfitMarginPercent(margin);
    setCustomMarginInput([0, 10, 15, 20, 25, 30, 35, 40].includes(margin) ? '' : String(margin));
    setValidityDays(orc.validityDays || 15);
    setDeliveryTerm(orc.deliveryTerm || 'A combinar');
    setPaymentConditions(orc.paymentConditions || '50% na adjudicação');
    setWorkInChargeOf(orc.workInChargeOf || 'Enat Energias');
    setInstallationWarranty(orc.installationWarranty || '2 anos');
    setEquipmentWarranty(orc.equipmentWarranty || 'Consultar ficha técnica do equipamento');
    setNotes(orc.notes || '');
    setFormStatus((orc.status as any) || 'orcamento_feito');
    setViewMode('editor');
  };

  // Preview quote
  const handleOpenPreview = (orc: Orcamento) => {
    setActiveOrcamentoId(orc.id);
    setViewMode('preview');
  };

  // Duplicate quote (clone)
  const handleDuplicateOrcamento = (orc: Orcamento) => {
    const nextNum = `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`;
    const duplicatedData = {
      ...orc,
      number: nextNum,
      date: new Date().toISOString().split('T')[0],
      title: orc.title,
      status: 'orcamento_feito' as const,
      sentAt: undefined,
      sentCount: 0,
      sentHistory: [],
    };
    const newId = addOrcamento(duplicatedData);
    showToast(`Orçamento duplicado com sucesso como ${nextNum}`);
    const created = { ...duplicatedData, id: newId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    handleEditOrcamento(created);
  };

  // Open Resend Modal
  const handleOpenResendModal = (orc: Orcamento) => {
    setOrcamentoToResend(orc);
    setResendChannel(orc.client?.contact ? 'whatsapp' : 'email');
    setResendNotes('');
    setResendCopiedType(null);
    setIsResendModalOpen(true);
  };

  // Confirm Resend action
  const handleConfirmResend = (channel: 'whatsapp' | 'email' | 'manual' | 'pdf') => {
    if (!orcamentoToResend) return;

    const nowIso = new Date().toISOString();
    const newHistory = [
      ...(orcamentoToResend.sentHistory || []),
      {
        date: nowIso,
        method: channel,
        recipient: orcamentoToResend.client?.contact || orcamentoToResend.client?.name || 'Cliente',
        notes: resendNotes.trim() || undefined,
      },
    ];

    updateOrcamento(orcamentoToResend.id, {
      status: 'enviado',
      sentAt: nowIso,
      sentCount: (orcamentoToResend.sentCount || 0) + 1,
      lastSentMethod: channel,
      sentHistory: newHistory,
    });

    setIsResendModalOpen(false);
    showToast(`Orçamento ${orcamentoToResend.number} registado como reenviado via ${channel.toUpperCase()}!`);
  };

  // Open Duplicate for New Client Modal
  const handleOpenDuplicateForNewClientModal = (orc: Orcamento) => {
    setOrcamentoToDuplicateForNewClient(orc);
    const nextNum = `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`;
    setNewQuoteNumber(nextNum);
    setNewClientName('');
    setNewClientAddress('');
    setNewClientContact('');
    setNewClientEmail('');
    setNewClientNif('');
    setIsDuplicateNewClientModalOpen(true);
  };

  // Confirm Duplicate for New Client
  const handleConfirmDuplicateForNewClient = () => {
    if (!orcamentoToDuplicateForNewClient) return;

    const finalNumber = newQuoteNumber.trim() || `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`;
    const duplicatedData = {
      ...orcamentoToDuplicateForNewClient,
      number: finalNumber,
      date: new Date().toISOString().split('T')[0],
      client: {
        name: newClientName.trim(),
        address: newClientAddress.trim(),
        contact: newClientContact.trim(),
        email: newClientEmail.trim(),
        nif: newClientNif.trim(),
      },
      status: 'orcamento_feito' as const,
      sentAt: undefined,
      sentCount: 0,
      sentHistory: [],
    };

    const newId = addOrcamento(duplicatedData);
    setIsDuplicateNewClientModalOpen(false);
    showToast(`Orçamento ${finalNumber} criado para novo cliente!`);

    const created = {
      ...duplicatedData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleEditOrcamento(created);
  };

  // Quick Status change
  const handleQuickStatusChange = (orc: Orcamento, newStatus: 'orcamento_feito' | 'enviado' | 'adjudicado' | 'recusado' | 'rascunho' | 'aprovado') => {
    updateOrcamento(orc.id, { status: newStatus });
    const labelMap: Record<string, string> = {
      orcamento_feito: 'Orçamento feito',
      rascunho: 'Orçamento feito',
      enviado: 'Enviado',
      adjudicado: 'Adjudicado',
      aprovado: 'Adjudicado',
      recusado: 'Recusado',
    };
    showToast(`Estado de ${orc.number} alterado para "${labelMap[newStatus] || newStatus}".`);
  };

  // Helper to format WhatsApp phone with 351 Portugal code
  const formatWhatsAppPhone = (rawPhone: string) => {
    const digits = (rawPhone || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('2'))) {
      return `351${digits}`;
    }
    return digits;
  };

  // Text generator for WhatsApp with verified universal UTF-8 emojis
  const getWhatsAppText = (orc: Orcamento) => {
    const totalStr = (Number(orc.totalWithTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const clientGreeting = orc.client?.name ? `Olá ${orc.client.name}` : 'Olá';
    return `${clientGreeting},\n\nJunto partilhamos a proposta comercial da *Enat Energias* (*${orc.number}*).\n\n📋 *Solução:* ${orc.title}\n💰 *Valor Global (c/ IVA):* ${totalStr} €\n⏱️ *Validade:* ${orc.validityDays} dias\n🛡️ *Garantia:* ${orc.installationWarranty}\n\nFicamos inteiramente à sua disposição para qualquer esclarecimento técnico!\n\nCom os melhores cumprimentos,\n*${orc.commercialResponsible}*\nEnat Energias • Ponte de Lima`;
  };

  // Text generator for Email Subject & Body
  const getEmailSubject = (orc: Orcamento) => {
    return `Proposta Comercial ${orc.number} - Enat Energias - ${orc.client?.name || 'Cliente'}`;
  };

  const getEmailBodyText = (orc: Orcamento) => {
    const totalStr = (Number(orc.totalWithTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const subtotalStr = (Number(orc.subtotalWithoutTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const clientName = orc.client?.name || 'Estimado(a) Cliente';
    return `Exmo.(a) Sr.(a) ${clientName},\n\nNo seguimento do seu pedido, apresentamos a proposta comercial elaborada pela Enat Energias:\n\n📋 Orçamento Nº: ${orc.number}\n📅 Data: ${orc.date}\n🏷️ Solução: ${orc.title}\n\n• Total Ilíquido (s/ IVA): ${subtotalStr} €\n• IVA (${orc.taxRate}%): ${(Number(orc.taxAmount) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €\n• VALOR TOTAL COM IVA: ${totalStr} €\n\nCondições Comerciais:\n- Prazo de Entrega: ${orc.deliveryTerm}\n- Condições de Pagamento: ${orc.paymentConditions}\n- Validade: ${orc.validityDays} dias\n- Garantia de Instalação: ${orc.installationWarranty}\n- Garantia de Equipamentos: ${orc.equipmentWarranty}\n\nFicamos inteiramente ao dispor para qualquer esclarecimento técnico.\n\nCom os melhores cumprimentos,\n${orc.commercialResponsible}\nEnat Energias • Ponte de Lima`;
  };

  // Direct WhatsApp Forwarding Handler
  const handleShareWhatsApp = (orc: Orcamento) => {
    const phone = formatWhatsAppPhone(orc.client?.contact || '');
    const text = encodeURIComponent(getWhatsAppText(orc));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    updateOrcamento(orc.id, {
      status: 'enviado',
      sentAt: new Date().toISOString(),
      sentCount: (orc.sentCount || 0) + 1,
      lastSentMethod: 'whatsapp',
    });
    showToast(`A abrir WhatsApp para ${orc.client?.name || 'cliente'}...`);
  };

  // Direct Email Forwarding Handler
  const handleShareEmail = (orc: Orcamento) => {
    const email = (orc.client?.email || '').trim();
    const subject = encodeURIComponent(getEmailSubject(orc));
    const body = encodeURIComponent(getEmailBodyText(orc));
    const url = email ? `mailto:${email}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = url;

    updateOrcamento(orc.id, {
      status: 'enviado',
      sentAt: new Date().toISOString(),
      sentCount: (orc.sentCount || 0) + 1,
      lastSentMethod: 'email',
    });
    showToast(`A abrir aplicação de Email para ${email || 'cliente'}...`);
  };

  // Quick commit from quick add bar
  const handleCommitQuickItem = () => {
    if (!quickItemName.trim()) {
      handleAddItem();
      return;
    }
    const q = parseFloat(quickItemQuantity) || 1;
    const p = parseFloat(quickItemUnitPrice) || 0;
    handleAddItem({
      name: quickItemName.trim(),
      category: quickItemCategory,
      quantity: q,
      unit: quickItemUnit.trim() || 'un',
      unitPrice: p,
      totalPrice: q * p,
    });
    setQuickItemName('');
    setQuickItemQuantity('1');
    setQuickItemUnitPrice('');
    showToast('Artigo adicionado com sucesso!');
  };

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setResendCopiedType(type);
    setTimeout(() => setResendCopiedType(null), 3000);
  };

  // Save Quote
  const handleSaveOrcamento = () => {
    const dataToSave = {
      number: formNumber.trim() || `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`,
      date: formDate || new Date().toISOString().split('T')[0],
      location: formLocation.trim() || 'Ponte de Lima',
      commercialResponsible: formCommercial.trim() || 'João Lima',
      client: {
        name: clientName.trim(),
        address: clientAddress.trim(),
        contact: clientContact.trim(),
        email: clientEmail.trim(),
        nif: clientNif.trim(),
      },
      selectedCategories,
      customTitle: customTitle.trim(),
      title: calculatedTitle,
      items,
      laborItems,
      subtotalItems,
      subtotalLabor,
      baseCostWithoutTax,
      profitMarginPercent,
      profitAmount,
      subtotalWithoutTax,
      taxRate,
      taxAmount,
      totalWithTax,
      validityDays,
      deliveryTerm: deliveryTerm.trim(),
      paymentConditions: paymentConditions.trim(),
      workInChargeOf: workInChargeOf.trim(),
      installationWarranty: installationWarranty.trim(),
      equipmentWarranty: equipmentWarranty.trim(),
      notes: notes.trim(),
      status: formStatus,
    };

    if (activeOrcamentoId) {
      updateOrcamento(activeOrcamentoId, dataToSave);
      showToast('Orçamento atualizado com sucesso!');
    } else {
      const newId = addOrcamento(dataToSave);
      setActiveOrcamentoId(newId);
      showToast('Orçamento guardado com sucesso!');
    }
    setViewMode('preview');
  };

  // Download PDF
  const handleDownloadPDF = async (orc: Orcamento) => {
    setIsGeneratingPdf(true);
    try {
      await downloadOrcamentoPDF(orc);
      showToast('Ficheiro PDF gerado e descarregado com sucesso!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao gerar o ficheiro PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Item manipulation
  const handleAddItem = (preset?: Partial<OrcamentoItem>) => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        name: preset?.name || '',
        category: preset?.category || 'Máquinas & Equipamentos',
        quantity: preset?.quantity || 1,
        unit: preset?.unit || 'un',
        unitPrice: preset?.unitPrice || 0,
        totalPrice: (preset?.quantity || 1) * (preset?.unitPrice || 0),
      },
    ]);
  };

  const handleQuickAddProductPreset = (name: string, category: string, unit: string, defaultPrice: number) => {
    handleAddItem({
      name,
      category,
      unit,
      unitPrice: defaultPrice,
      quantity: 1,
    });
  };

  const handleQuickAddLaborPreset = (description: string, defaultPrice: number) => {
    setLaborItems((prev) => [
      ...prev,
      {
        id: `labor-${Date.now()}-${prev.length}`,
        description,
        quantity: 1,
        unit: 'serviço',
        unitPrice: defaultPrice,
        totalPrice: defaultPrice,
      },
    ]);
  };

  const handleUpdateItem = (index: number, updates: Partial<OrcamentoItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], ...updates };
      const qty = Number(target.quantity) || 0;
      const unitP = Number(target.unitPrice) || 0;
      target.totalPrice = qty * unitP;
      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Select material from database autocomplete
  const handleSelectSuggestedProduct = (index: number, product: any) => {
    handleUpdateItem(index, {
      name: product.name,
      category: product.category,
      unit: product.unit || 'un',
      unitPrice: product.latestPriceWithoutTax || 0,
      fromDatabase: true,
    });
    setActiveItemAutocompleteIdx(null);
    setAutocompleteQuery('');
  };

  // Labor manipulation
  const handleAddLabor = () => {
    setLaborItems((prev) => [
      ...prev,
      {
        id: `labor-${Date.now()}-${prev.length}`,
        description: 'Trabalhos adicionais de instalação e ensaios',
        quantity: 1,
        unit: 'serviço',
        unitPrice: 150,
        totalPrice: 150,
      },
    ]);
  };

  const handleUpdateLabor = (index: number, updates: Partial<OrcamentoLaborItem>) => {
    setLaborItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], ...updates };
      const qty = Number(target.quantity) || 0;
      const unitP = Number(target.unitPrice) || 0;
      target.totalPrice = qty * unitP;
      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveLabor = (index: number) => {
    setLaborItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Filtered and sorted orcamentos in the History Panel
  const filteredOrcamentos = useMemo(() => {
    return orcamentos
      .filter((o) => {
        if (statusFilter !== 'all') {
          if (statusFilter === 'orcamento_feito' && o.status !== 'orcamento_feito' && o.status !== 'rascunho') return false;
          if (statusFilter === 'adjudicado' && o.status !== 'adjudicado' && o.status !== 'aprovado') return false;
          if (statusFilter === 'enviado' && o.status !== 'enviado') return false;
          if (statusFilter === 'recusado' && o.status !== 'recusado') return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNum = o.number?.toLowerCase().includes(q);
          const matchClient = o.client?.name?.toLowerCase().includes(q);
          const matchTitle = o.title?.toLowerCase().includes(q);
          const matchNif = o.client?.nif?.toLowerCase().includes(q);
          const matchAddress = o.client?.address?.toLowerCase().includes(q);
          const matchContact = o.client?.contact?.toLowerCase().includes(q);
          const matchItems = o.items?.some((it) => it.name?.toLowerCase().includes(q));
          if (!matchNum && !matchClient && !matchTitle && !matchNif && !matchAddress && !matchContact && !matchItems) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_asc') {
          return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
        }
        if (sortBy === 'total_desc') {
          return (Number(b.totalWithTax) || 0) - (Number(a.totalWithTax) || 0);
        }
        if (sortBy === 'profit_desc') {
          return (Number(b.profitAmount) || 0) - (Number(a.profitAmount) || 0);
        }
        if (sortBy === 'client_asc') {
          return (a.client?.name || '').localeCompare(b.client?.name || '');
        }
        // default date_desc
        return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
      });
  }, [orcamentos, statusFilter, searchTerm, sortBy]);

  // Executive History Statistics
  const historyStats = useMemo(() => {
    const totalCount = orcamentos.length;
    const totalValue = orcamentos.reduce((acc, o) => acc + (Number(o.totalWithTax) || 0), 0);
    const adjudicadoQuotes = orcamentos.filter((o) => o.status === 'adjudicado' || o.status === 'aprovado');
    const adjudicadoCount = adjudicadoQuotes.length;
    const adjudicadoValue = adjudicadoQuotes.reduce((acc, o) => acc + (Number(o.totalWithTax) || 0), 0);
    const sentCount = orcamentos.filter((o) => o.status === 'enviado').length;
    const feitoCount = orcamentos.filter((o) => o.status === 'orcamento_feito' || o.status === 'rascunho').length;
    const rejectedCount = orcamentos.filter((o) => o.status === 'recusado').length;
    const totalProfit = orcamentos.reduce((acc, o) => acc + (Number(o.profitAmount) || 0), 0);
    const conversionRate = totalCount > 0 ? Math.round((adjudicadoCount / totalCount) * 100) : 0;

    return {
      totalCount,
      totalValue,
      adjudicadoCount,
      adjudicadoValue,
      sentCount,
      feitoCount,
      rejectedCount,
      totalProfit,
      conversionRate,
    };
  }, [orcamentos]);

  // Total amount of all approved/adjudicated quotes
  const totalOrcadoAprovado = historyStats.adjudicadoValue;

  return (
    <div className="space-y-6 pb-28">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          MODE 1: PAINEL & HISTÓRICO DE ORÇAMENTOS
         ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
                  <History className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight flex items-center gap-2">
                    <span>Painel & Histórico de Orçamentos</span>
                    <span className="text-xs font-mono font-bold py-0.5 px-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {orcamentos.length}
                    </span>
                  </h1>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Histórico integral de propostas da Enat Energias: visualize documentos, reenvie por WhatsApp/Email e duplique orçamentos para novos clientes.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={handleStartNewOrcamento}
                className="py-2.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Criar Novo Orçamento</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Row (5 Executive Indicators) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-3xl revolut-card revolut-shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total de Propostas
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white mt-1">
                {historyStats.totalCount}
              </p>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                {historyStats.totalValue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € emitidos
              </span>
            </div>

            <div className="p-4 rounded-3xl revolut-card revolut-shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Orçamento feito
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                {historyStats.feitoCount}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Prontos / Em preparação
              </span>
            </div>

            <div className="p-4 rounded-3xl revolut-card revolut-shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Enviados
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                {historyStats.sentCount}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Aguardam feedback
              </span>
            </div>

            <div className="p-4 rounded-3xl revolut-card revolut-shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Adjudicados
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {historyStats.adjudicadoCount}
                </p>
                <span className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
                  ({historyStats.conversionRate}%)
                </span>
              </div>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-mono block mt-0.5 truncate">
                {historyStats.adjudicadoValue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            <div className="p-4 rounded-3xl revolut-card revolut-shadow col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Lucro Previsto Total
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                +{historyStats.totalProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Margem comercial total
              </span>
            </div>
          </div>

          {/* Search, Filter & Sort Bar */}
          <div className="p-4 rounded-3xl revolut-card revolut-shadow space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nº de orçamento, cliente, morada, contacto ou equipamento..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                  Ordenar por:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#141418] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none shadow-sm"
                >
                  <option value="date_desc">Mais Recentes</option>
                  <option value="date_asc">Mais Antigos</option>
                  <option value="total_desc">Maior Valor (€)</option>
                  <option value="profit_desc">Maior Lucro (€)</option>
                  <option value="client_asc">Nome do Cliente (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-black/5 dark:border-white/5">
              {[
                { id: 'all', label: 'Todos', count: historyStats.totalCount },
                { id: 'orcamento_feito', label: 'Orçamento feito', count: historyStats.feitoCount },
                { id: 'enviado', label: 'Enviados', count: historyStats.sentCount },
                { id: 'adjudicado', label: 'Adjudicados', count: historyStats.adjudicadoCount },
                { id: 'recusado', label: 'Recusados', count: historyStats.rejectedCount },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`py-1.5 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    statusFilter === st.id
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:bg-black/10'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] py-0.2 px-1.5 rounded-full font-mono font-bold ${
                      statusFilter === st.id
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                        : 'bg-black/10 dark:bg-white/10 text-slate-500'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Orçamentos List / History Cards */}
          {filteredOrcamentos.length === 0 ? (
            <div className="p-10 rounded-3xl revolut-card revolut-shadow text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Calculator className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {orcamentos.length === 0 ? 'Nenhum orçamento gerado no histórico' : 'Nenhum orçamento encontrado com estes filtros'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                  {orcamentos.length === 0
                    ? 'Crie o seu primeiro orçamento para Ar Condicionado, Bomba de Calor, VMC, UPAC ou Piso Radiante. Ficará gravado aqui no histórico para consultas, reenvios e duplicações.'
                    : 'Tente alterar os termos da pesquisa ou o filtro de estado.'}
                </p>
              </div>
              <button
                onClick={handleStartNewOrcamento}
                className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Criar Novo Orçamento</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrcamentos.map((orc) => {
                const totalItemsCount = (orc.items?.length || 0) + (orc.laborItems?.length || 0);
                const hasSent = Boolean(orc.sentAt || orc.status === 'enviado');

                return (
                  <div
                    key={orc.id}
                    className="p-4 sm:p-5 rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/5 hover:border-blue-500/30 transition space-y-3.5"
                  >
                    {/* Top Row: Number, Client Name, Interactive Status, Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="py-1 px-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs tracking-wide">
                          {orc.number}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-black dark:text-white truncate">
                          {orc.client.name ? orc.client.name : 'Cliente a indicar'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        {/* Interactive Status Selector */}
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                          {[
                            { id: 'orcamento_feito', label: 'Orçamento feito' },
                            { id: 'enviado', label: 'Enviado' },
                            { id: 'adjudicado', label: 'Adjudicado' },
                            { id: 'recusado', label: 'Recusado' },
                          ].map((st) => {
                            const isSelected =
                              orc.status === st.id ||
                              (st.id === 'orcamento_feito' && orc.status === 'rascunho') ||
                              (st.id === 'adjudicado' && orc.status === 'aprovado');
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleQuickStatusChange(orc, st.id as any)}
                                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase transition ${
                                  isSelected
                                    ? st.id === 'adjudicado'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : st.id === 'enviado'
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : st.id === 'recusado'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-amber-600 text-white shadow-sm'
                                    : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                                title={`Mudar estado para ${st.label}`}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>

                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{orc.date}</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Section: Proposal Title, Client Address & Contact, Sent Log */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs border-y border-black/5 dark:border-white/5 py-3">
                      {/* Left: Solution & Client details */}
                      <div className="md:col-span-8 space-y-1.5 cursor-pointer" onClick={() => handleOpenPreview(orc)}>
                        <p className="font-bold text-slate-800 dark:text-neutral-200 line-clamp-1 hover:text-blue-500 transition-colors">
                          {orc.title}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-neutral-400 flex-wrap">
                          {orc.client.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-xs">{orc.client.address}</span>
                            </span>
                          )}
                          {orc.client.contact && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{orc.client.contact}</span>
                            </span>
                          )}
                          {orc.client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-xs">{orc.client.email}</span>
                            </span>
                          )}
                          {orc.client.nif && (
                            <span className="font-mono">NIF: {orc.client.nif}</span>
                          )}
                          <span>•</span>
                          <span>{totalItemsCount} linhas descritivas</span>
                        </div>
                      </div>

                      {/* Right: Sending History Log Badge */}
                      <div className="md:col-span-4 flex items-center md:justify-end">
                        {hasSent ? (
                          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] flex items-center gap-2">
                            <CheckCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                              <span className="font-bold block">
                                {orc.sentCount && orc.sentCount > 1
                                  ? `Reenviado (${orc.sentCount}x)`
                                  : 'Enviado ao Cliente'}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                                {orc.sentAt
                                  ? `A ${new Date(orc.sentAt).toLocaleDateString('pt-PT')} via ${(orc.lastSentMethod || 'email').toUpperCase()}`
                                  : 'Marcado como enviado'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] text-slate-500 text-[11px] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Pendente de envio ao cliente</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Financial Values and Main Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      {/* Financials & Profit */}
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-black font-mono text-black dark:text-white">
                            {(Number(orc.totalWithTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-sm font-bold text-emerald-500">€</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          s/IVA: {(Number(orc.subtotalWithoutTax) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                        </span>
                        {orc.profitMarginPercent !== undefined && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold py-0.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{orc.profitMarginPercent}% (+{((Number(orc.profitAmount) || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € lucro)</span>
                          </span>
                        )}
                      </div>

                      {/* Main Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                        {/* 1. Ver Orçamento (Destaque Principal) */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(orc)}
                          className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition active:scale-95"
                          title="Visualizar documento do orçamento completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Orçamento</span>
                        </button>

                        {/* Direct WhatsApp Share Button */}
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(orc)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                          title={orc.client.contact ? `Reencaminhar proposta por WhatsApp para ${orc.client.contact}` : 'Reencaminhar proposta por WhatsApp'}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Direct Email Share Button */}
                        <button
                          type="button"
                          onClick={() => handleShareEmail(orc)}
                          className="py-1.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                          title={orc.client.email ? `Reencaminhar proposta por Email para ${orc.client.email}` : 'Reencaminhar proposta por Email'}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </button>

                        {/* 2. Reenviar (Modal) */}
                        <button
                          type="button"
                          onClick={() => handleOpenResendModal(orc)}
                          className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                          title="Opções de envio com histórico e notas"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Mais Opções</span>
                        </button>

                        {/* 3. Duplicar para Novo Cliente */}
                        <button
                          type="button"
                          onClick={() => handleOpenDuplicateForNewClientModal(orc)}
                          className="py-1.5 px-3 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                          title="Duplicar este orçamento para um novo cliente"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Duplicar p/ Cliente</span>
                        </button>

                        {/* 4. Descarregar PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(orc)}
                          disabled={isGeneratingPdf}
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition"
                          title="Descarregar PDF oficial"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* 5. Editar */}
                        <button
                          type="button"
                          onClick={() => handleEditOrcamento(orc)}
                          className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-neutral-300 transition"
                          title="Editar dados"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* 6. Eliminar */}
                        <button
                          type="button"
                          onClick={() => {
                            setOrcamentoToDelete(orc);
                            setIsDeletingModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Eliminar orçamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: EDITOR / CREATION FORM
         ========================================================================= */}
      {viewMode === 'editor' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Bar with Back and Save */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setViewMode('list')}
              className="py-2 px-3.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos Orçamentos</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('preview')}
                className="py-2 px-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition"
              >
                <Eye className="w-4 h-4" />
                <span>Pré-visualizar</span>
              </button>
              <button
                onClick={handleSaveOrcamento}
                className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Orçamento</span>
              </button>
            </div>
          </div>

          {/* Section 1: Top Metadata & Document Info */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Identificação da Proposta
              </span>
              <span className="text-[11px] text-emerald-500 font-bold">Enat Energias</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nº do Orçamento
                </label>
                <input
                  type="text"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Localidade
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Ponte de Lima"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Responsável Comercial
                </label>
                <input
                  type="text"
                  value={formCommercial}
                  onChange={(e) => setFormCommercial(e.target.value)}
                  placeholder="João Lima"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Especialidades / Tipo de Trabalho ("Orçamento para: ...") */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  2. Tipo de Instalação ("Orçamento para:")
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Selecione uma ou várias opções para gerar o título do orçamento
                </span>
              </div>
            </div>

            {/* Category Chips Selection */}
            <div className="flex flex-wrap gap-2 pt-1">
              {ORCAMENTO_DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.label);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.label)}
                    className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-black/5 dark:bg-white/5 text-slate-700 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Generated / Custom Title Field */}
            <div className="pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Título Final da Proposta (Editável)
              </label>
              <input
                type="text"
                value={customTitle || calculatedTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Orçamento para: Fornecimento e Instalação..."
                className="w-full py-2.5 px-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 3: Dados do Cliente ("Deixar avançar se não preencher as informações todas") */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  3. Dados do Cliente
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  (Opcional: pode avançar mesmo que não preencha tudo)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Cliente
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Manuel Silva"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Morada da Obra
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Ex: Rua Principal nº 12, Ponte de Lima"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Telemóvel / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    placeholder="Ex: 912 345 678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-medium text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email do Cliente
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Ex: cliente@email.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  NIF do Cliente
                </label>
                <input
                  type="text"
                  value={clientNif}
                  onChange={(e) => setClientNif(e.target.value)}
                  placeholder="Ex: 234 567 890"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-medium text-black dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Equipamentos e Materiais (com pesquisa na base de dados de faturas) */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  4. Equipamentos e Materiais ({items.length} {items.length === 1 ? 'artigo' : 'artigos'})
                </span>
                <span className="text-[11px] text-blue-500 font-semibold">
                  Adicione qualquer artigo com o botão +, digite livremente ou escolha das sugestões.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Adicionar Linha Vazia</span>
              </button>
            </div>

            {/* BARRA RÁPIDA: Adicionar Qualquer Artigo Personalizado com botão "+" */}
            <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Adicionar Artigo / Equipamento Personalizado (Escreva o que quiser):</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={quickItemName}
                    onChange={(e) => setQuickItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommitQuickItem();
                      }
                    }}
                    placeholder="Nome do artigo/equipamento (ex: Unidade Exterior 9kW...)"
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <select
                    value={quickItemCategory}
                    onChange={(e) => setQuickItemCategory(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Máquinas & Equipamentos">Equipamentos</option>
                    <option value="Canalização & Tubagens">Tubagens & Hidráulica</option>
                    <option value="Acessórios & Fixação">Acessórios & Fixação</option>
                    <option value="Material Elétrico">Material Elétrico</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={quickItemQuantity}
                    onChange={(e) => setQuickItemQuantity(e.target.value)}
                    placeholder="Qtd"
                    title="Quantidade"
                    className="w-full py-2 px-2 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-center text-black dark:text-white"
                  />
                </div>

                <div className="sm:col-span-1">
                  <input
                    type="text"
                    value={quickItemUnit}
                    onChange={(e) => setQuickItemUnit(e.target.value)}
                    placeholder="un"
                    title="Unidade de medida"
                    className="w-full py-2 px-2 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-medium text-center text-black dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={quickItemUnitPrice}
                      onChange={(e) => setQuickItemUnitPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCommitQuickItem();
                        }
                      }}
                      placeholder="Preço s/IVA €"
                      className="w-full py-2 pl-3 pr-6 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">€</span>
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleCommitQuickItem}
                    className="w-full h-full min-h-[36px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-blue-500/25 active:scale-95 transition"
                    title="Adicionar artigo à lista"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span className="sm:hidden">Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Add Presets Bar for Materials */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Sugestões rápidas de catálogo:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Bomba de calor AQS Monobloco 200L com serpentina', cat: 'Máquinas & Equipamentos', unit: 'un', price: 1850 },
                  { name: 'Bomba de calor Climatização e AQS Ar-Água 12kW', cat: 'Máquinas & Equipamentos', unit: 'un', price: 4200 },
                  { name: 'Ar Condicionado Mono-Split Inverter 12000 BTU', cat: 'Máquinas & Equipamentos', unit: 'un', price: 680 },
                  { name: 'Tubo multicamada isolado 16x2.0 (rolo 50m)', cat: 'Canalização & Tubagens', unit: 'rolo', price: 78 },
                  { name: 'Tubo de cobre frigorífico 1/4" e 3/8" com isolamento', cat: 'Canalização & Tubagens', unit: 'm', price: 12 },
                  { name: 'Acessórios de fixação, suportes de parede e silentblocks', cat: 'Acessórios & Fixação', unit: 'conjunto', price: 65 },
                  { name: 'Cabo elétrico 3G2.5mm² e tubo anelado cinzento', cat: 'Material Elétrico', unit: 'm', price: 3.5 },
                  { name: 'Válvula de retenção, passador e filtro em Y 1"', cat: 'Canalização & Tubagens', unit: 'conjunto', price: 55 },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleQuickAddProductPreset(preset.name, preset.cat, preset.unit, preset.price)}
                    className="py-1 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-blue-500/10 hover:text-blue-500 text-slate-600 dark:text-neutral-300 text-[11px] font-medium transition flex items-center gap-1 active:scale-95 border border-black/5 dark:border-white/5"
                  >
                    <Plus className="w-3 h-3 text-blue-500" />
                    <span>{preset.name.split(' ')[0]} {preset.name.split(' ')[1]} {preset.name.split(' ')[2] || ''}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Informational banner: Prices won't appear on PDF */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>Regra de Sigilo Comercial:</strong> Os valores unitários inseridos abaixo servem apenas para o cálculo da proposta. No documento PDF entregue ao cliente <strong>NÃO aparecerá o preço de cada artigo</strong>, apenas a quantidade e o valor final global da obra.
              </span>
            </div>

            {/* Items Table / Cards */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 relative space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Artigo #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                      title="Remover linha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Item Name / Description with Autocomplete */}
                    <div className="sm:col-span-6 relative">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Descrição do Equipamento / Material
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          handleUpdateItem(index, { name: e.target.value, fromDatabase: false });
                          setActiveItemAutocompleteIdx(index);
                          setAutocompleteQuery(e.target.value);
                        }}
                        onFocus={() => {
                          setActiveItemAutocompleteIdx(index);
                          setAutocompleteQuery(item.name || '');
                        }}
                        placeholder="Ex: Bomba de calor AQS Monobloco 200L ou tubo cobre 3/8..."
                        className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white"
                      />

                      {/* Autocomplete Dropdown from Invoices DB */}
                      {activeItemAutocompleteIdx === index && suggestedMaterials.length > 0 && (
                        <div
                          ref={autocompleteRef}
                          className="absolute z-30 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-[#18181C] border border-black/10 dark:border-white/15 shadow-xl p-1.5 divide-y divide-black/5 dark:divide-white/5"
                        >
                          <div className="px-2 py-1 text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Sugerido das faturas ({suggestedMaterials.length})</span>
                            <span className="text-slate-400 font-normal">Toque para selecionar</span>
                          </div>
                          {suggestedMaterials.map((prod, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => handleSelectSuggestedProduct(index, prod)}
                              className="p-2 rounded-xl hover:bg-blue-500/10 cursor-pointer transition flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-black dark:text-white truncate">{prod.name}</p>
                                <span className="text-[10px] text-slate-400 block">
                                  {prod.category} • Último fornecedor: {prod.latestStoreName || 'Fatura'}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-emerald-500 block">
                                  {(Number(prod.latestPriceWithoutTax) || 0).toFixed(2)} €
                                </span>
                                <span className="text-[10px] text-slate-400">/{prod.unit || 'un'} s/IVA</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Qtd
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white"
                      />
                    </div>

                    {/* Unit */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Unidade (m, un, rolo...)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                          placeholder="un / m"
                          className="w-full py-2 px-2.5 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(index, { unit: item.unit === 'm' ? 'un' : item.unit === 'un' ? 'conjunto' : 'm' })}
                          className="py-2 px-2 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-bold text-blue-500 shrink-0"
                          title="Alternar unidade"
                        >
                          {item.unit || 'un'}
                        </button>
                      </div>
                    </div>

                    {/* Unit Price (s/IVA) */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        P. Venda s/IVA (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Product Button (Prominent & Clear) */}
            <button
              type="button"
              onClick={() => handleAddItem()}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-blue-500/30 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Adicionar Outro Produto / Artigo</span>
            </button>
          </div>

          {/* Section 5: Mão de Obra e Instalação */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  5. Mão de Obra, Instalação & Ensaios ({laborItems.length} {laborItems.length === 1 ? 'serviço' : 'serviços'})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Descreva os serviços técnicos incluídos (no PDF aparecerão descriminados como incluídos)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddLabor}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Adicionar Serviço</span>
              </button>
            </div>

            {/* Quick Add Presets Bar for Labor */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Adicionar rapidamente:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { desc: 'Montagem mecânica e hidráulica dos equipamentos com teste de estanquicidade', price: 400 },
                  { desc: 'Instalação de linhas frigoríficas, vácuo digital a 500 microns e carga de gás refrigerante', price: 250 },
                  { desc: 'Ligação elétrica, colocação de disjuntor de proteção dedicado e ensaios de terra', price: 120 },
                  { desc: 'Parametrização, comissionamento e instruções de funcionamento ao cliente', price: 90 },
                  { desc: 'Abertura de roços em alvenaria e furação de paredes para passagem de tubagens', price: 150 },
                  { desc: 'Deslocação técnica e transporte especializado de equipamentos', price: 80 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickAddLaborPreset(preset.desc, preset.price)}
                    className="py-1 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-slate-600 dark:text-neutral-300 text-[11px] font-medium transition flex items-center gap-1 active:scale-95 border border-black/5 dark:border-white/5"
                  >
                    <Plus className="w-3 h-3 text-emerald-500" />
                    <span>{preset.desc.split(' ')[0]} {preset.desc.split(' ')[1]} {preset.desc.split(' ')[2] || ''}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {laborItems.map((labor, idx) => (
                <div
                  key={labor.id}
                  className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={labor.description}
                      onChange={(e) => handleUpdateLabor(idx, { description: e.target.value })}
                      placeholder="Ex: Montagem de tubagens frigoríficas, bomba de calor e ensaios..."
                      className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="w-32">
                      <div className="relative">
                        <input
                          type="number"
                          value={labor.unitPrice}
                          onChange={(e) => handleUpdateLabor(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full py-2 pr-7 pl-3 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">€</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLabor(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Labor Button (Prominent & Clear) */}
            <button
              type="button"
              onClick={handleAddLabor}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Adicionar Outro Serviço / Mão de Obra</span>
            </button>
          </div>

          {/* Section 6: Quadro Financeiro, % de Lucro e IVA (Estilo TOC Online) */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-5">
            <div className="border-b border-black/5 dark:border-white/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                6. Contas Finais, Margem de Lucro & IVA
              </span>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                Defina a percentagem de lucro pretendida sobre os custos. A margem é estritamente confidencial para gestão comercial interna e nunca aparece discriminada no documento do cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Lucro & IVA selectors */}
              <div className="lg:col-span-7 space-y-5">
                {/* % de Lucro Selector */}
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>Percentagem de Lucro Comercial (% de Lucro)</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold py-0.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Margem Atual: {profitMarginPercent}%
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { percent: 0, label: '0% (Custo Puro)' },
                      { percent: 10, label: '10%' },
                      { percent: 15, label: '15%' },
                      { percent: 20, label: '20%' },
                      { percent: 25, label: '25%' },
                      { percent: 30, label: '30%' },
                      { percent: 35, label: '35%' },
                      { percent: 40, label: '40%' },
                    ].map((p) => {
                      const isSelected = profitMarginPercent === p.percent && customMarginInput === '';
                      return (
                        <button
                          key={p.percent}
                          type="button"
                          onClick={() => {
                            setProfitMarginPercent(p.percent);
                            setCustomMarginInput('');
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                              : 'bg-black/5 dark:bg-white/5 text-slate-700 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Input */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                      Ou digite outra % de lucro:
                    </span>
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="500"
                        step="0.5"
                        placeholder="Ex: 22.5"
                        value={customMarginInput}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setCustomMarginInput(valStr);
                          const parsed = parseFloat(valStr);
                          if (!isNaN(parsed) && parsed >= 0) {
                            setProfitMarginPercent(parsed);
                          } else if (valStr === '') {
                            setProfitMarginPercent(0);
                          }
                        }}
                        className="w-full py-1.5 pl-3 pr-7 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Profit summary feedback */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                      Lucro bruto previsto ({profitMarginPercent}% sobre {baseCostWithoutTax.toFixed(2)} € de custos):
                    </span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      + {profitAmount.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Taxa de IVA */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-black dark:text-white block">
                    Taxa de IVA Aplicável
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { rate: 23, label: '23% (Normal)' },
                      { rate: 13, label: '13% (Intermédia)' },
                      { rate: 6, label: '6% (Reduzida)' },
                      { rate: 0, label: '0% (Isento / Autoliquidação)' },
                    ].map((t) => (
                      <button
                        key={t.rate}
                        type="button"
                        onClick={() => setTaxRate(t.rate)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                          taxRate === t.rate
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:bg-black/10'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Accounting Style Box (Estilo TOC Online) */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Resumo Financeiro (TOC Online)
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500 dark:text-neutral-400">
                    <span>Custos Materiais (s/ IVA):</span>
                    <span className="font-mono">{subtotalItems.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 dark:text-neutral-400">
                    <span>Custos Mão de Obra (s/ IVA):</span>
                    <span className="font-mono">{subtotalLabor.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700 dark:text-neutral-300 font-semibold pt-1 border-t border-black/5 dark:border-white/5">
                    <span>Custo Base da Obra:</span>
                    <span className="font-mono">{baseCostWithoutTax.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-xl">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Margem de Lucro (+{profitMarginPercent}%):</span>
                    </span>
                    <span className="font-mono text-sm">+ {profitAmount.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-black dark:text-white pt-1">
                    <span>Total de Venda Ilíquido (s/ IVA):</span>
                    <span className="font-mono font-bold text-sm">{subtotalWithoutTax.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 dark:text-neutral-400">
                    <span>Incidência de IVA ({taxRate}%):</span>
                    <span className="font-mono text-amber-500 font-bold">{taxAmount.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-base sm:text-lg font-black text-black dark:text-white pt-2.5 border-t-2 border-emerald-500">
                    <span className="text-emerald-600 dark:text-emerald-400">TOTAL COM IVA:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xl sm:text-2xl font-black">
                      {totalWithTax.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>🔒 Confidencialidade:</strong> No documento entregue ao cliente apenas aparecerá o Total Ilíquido ({subtotalWithoutTax.toFixed(2)} €), o IVA e o Total Final ({totalWithTax.toFixed(2)} €). Os custos individuais e a margem de {profitMarginPercent}% são confidenciais da Enat.
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Condições Comerciais e Observações */}
          <div className="p-5 sm:p-6 rounded-3xl revolut-card revolut-shadow space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-black/5 dark:border-white/5 pb-3">
              7. Condições Comerciais & Observações Finais
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Validade da Proposta
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value) || 15)}
                    className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">dias</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Prazo de Entrega
                </label>
                <input
                  type="text"
                  value={deliveryTerm}
                  onChange={(e) => setDeliveryTerm(e.target.value)}
                  placeholder="A combinar"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Condições de Pagamento
                </label>
                <input
                  type="text"
                  value={paymentConditions}
                  onChange={(e) => setPaymentConditions(e.target.value)}
                  placeholder="50% na adjudicação"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Obra a Cargo de
                </label>
                <input
                  type="text"
                  value={workInChargeOf}
                  onChange={(e) => setWorkInChargeOf(e.target.value)}
                  placeholder="Enat Energias"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Garantia de Instalação
                </label>
                <input
                  type="text"
                  value={installationWarranty}
                  onChange={(e) => setInstallationWarranty(e.target.value)}
                  placeholder="2 anos"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Garantia de Equipamentos
                </label>
                <input
                  type="text"
                  value={equipmentWarranty}
                  onChange={(e) => setEquipmentWarranty(e.target.value)}
                  placeholder="Consultar ficha técnica do equipamento"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Observações Técnicas Adicionais (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Exclusões, instruções para o cliente ou particularidades da montagem..."
                className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
              />
            </div>

            {/* Status Selector in Editor */}
            <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Estado do Orçamento (fica "Orçamento feito" por defeito)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'orcamento_feito', label: 'Orçamento feito (por defeito)' },
                  { id: 'enviado', label: 'Enviado' },
                  { id: 'adjudicado', label: 'Adjudicado' },
                  { id: 'recusado', label: 'Recusado' },
                ].map((st) => {
                  const isSelected =
                    formStatus === st.id ||
                    (st.id === 'orcamento_feito' && formStatus === 'rascunho') ||
                    (st.id === 'adjudicado' && formStatus === 'aprovado');
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFormStatus(st.id as any)}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                        isSelected
                          ? st.id === 'adjudicado'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : st.id === 'enviado'
                            ? 'bg-blue-600 text-white shadow-md'
                            : st.id === 'recusado'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-amber-600 text-white shadow-md'
                          : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:bg-black/10'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setViewMode('list')}
              className="py-2.5 px-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveOrcamento}
              className="py-2.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Guardar e Concluir Orçamento</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 3: PREVIEW & PDF DOWNLOAD VIEW
         ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="py-2 px-3.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Lista</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {/* WhatsApp direct share */}
              <button
                type="button"
                onClick={() => handleShareWhatsApp(currentPreviewOrcamento)}
                className="py-2 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition active:scale-95"
                title={currentPreviewOrcamento.client?.contact ? `Reencaminhar proposta por WhatsApp para ${currentPreviewOrcamento.client.contact}` : 'Reencaminhar proposta por WhatsApp'}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              {/* Email direct share */}
              <button
                type="button"
                onClick={() => handleShareEmail(currentPreviewOrcamento)}
                className="py-2 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition active:scale-95"
                title={currentPreviewOrcamento.client?.email ? `Reencaminhar proposta por Email para ${currentPreviewOrcamento.client.email}` : 'Reencaminhar proposta por Email'}
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>

              <button
                onClick={() => {
                  if (currentPreviewOrcamento) handleEditOrcamento(currentPreviewOrcamento);
                }}
                className="py-2 px-3.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Dados</span>
              </button>

              <button
                onClick={handlePrint}
                className="py-2 px-3.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition"
                title="Imprimir Proposta"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={() => handleDownloadPDF(currentPreviewOrcamento)}
                disabled={isGeneratingPdf}
                className="py-2 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-700/25 transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'A Gerar PDF...' : 'Descarregar PDF Formal'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenResendModal(currentPreviewOrcamento)}
                className="py-2 px-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                title="Histórico de envios e outras opções"
              >
                <Send className="w-4 h-4" />
                <span>Opções de Envio</span>
              </button>
            </div>
          </div>

          {/* Interactive Status Bar in Preview Mode */}
          <div className="max-w-4xl mx-auto p-4 rounded-3xl revolut-card revolut-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                Estado da Proposta:
              </span>
              <span className={`py-1 px-3 rounded-full text-xs font-black uppercase tracking-wider ${
                currentPreviewOrcamento.status === 'adjudicado' || currentPreviewOrcamento.status === 'aprovado'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : currentPreviewOrcamento.status === 'enviado'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : currentPreviewOrcamento.status === 'recusado'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                {currentPreviewOrcamento.status === 'adjudicado' || currentPreviewOrcamento.status === 'aprovado'
                  ? 'Adjudicado'
                  : currentPreviewOrcamento.status === 'enviado'
                  ? 'Enviado'
                  : currentPreviewOrcamento.status === 'recusado'
                  ? 'Recusado'
                  : 'Orçamento feito'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400">Alterar estado:</span>
              {[
                { id: 'orcamento_feito', label: 'Orçamento feito' },
                { id: 'enviado', label: 'Enviado' },
                { id: 'adjudicado', label: 'Adjudicado' },
                { id: 'recusado', label: 'Recusado' },
              ].map((st) => {
                const isSelected =
                  currentPreviewOrcamento.status === st.id ||
                  (st.id === 'orcamento_feito' && currentPreviewOrcamento.status === 'rascunho') ||
                  (st.id === 'adjudicado' && currentPreviewOrcamento.status === 'aprovado');
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      handleQuickStatusChange(currentPreviewOrcamento, st.id as any);
                      setFormStatus(st.id as any);
                    }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                      isSelected
                        ? st.id === 'adjudicado'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : st.id === 'enviado'
                          ? 'bg-blue-600 text-white shadow-md'
                          : st.id === 'recusado'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-amber-600 text-white shadow-md'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/10'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Executive Internal Commercial Margin Badge (Internal use only, not on PDF) */}
          <div className="max-w-4xl mx-auto p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Gestão Comercial Interna:</span>
              </span>
              <span className="text-emerald-800 dark:text-emerald-300 font-mono">
                Custo Base: {((currentPreviewOrcamento.baseCostWithoutTax ?? (currentPreviewOrcamento.subtotalItems + currentPreviewOrcamento.subtotalLabor))).toFixed(2)} €
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">•</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-200 font-mono">
                Margem: +{currentPreviewOrcamento.profitMarginPercent ?? 0}% (+{(currentPreviewOrcamento.profitAmount ?? 0).toFixed(2)} € lucro)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">•</span>
              <span className="text-emerald-800 dark:text-emerald-300 font-mono">
                Venda s/IVA: {currentPreviewOrcamento.subtotalWithoutTax.toFixed(2)} €
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium shrink-0">
              🔒 Informação confidencial excluída do PDF do cliente
            </span>
          </div>

          {/* Interactive Document Preview Container (Responsive Paper Look) */}
          <div className="max-w-4xl mx-auto bg-white text-black rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-12 space-y-8 select-text">
            {/* Header: Logo & Title */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
              {/* Logo on Left */}
              <div className="flex items-center gap-3">
                <img
                  src="/enat-logo.png?v=4"
                  alt="Enat Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    // Fallback visual
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h2 className="text-xl font-black text-[#0F2240] tracking-tight leading-none">
                    ENAT ENERGIAS
                  </h2>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mt-1">
                    Climatização & Renováveis
                  </span>
                </div>
              </div>

              {/* Number and Date on Right */}
              <div className="text-left sm:text-right">
                <span className="text-lg font-black font-mono text-[#0F2240] block">
                  ORÇAMENTO Nº {currentPreviewOrcamento.number}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Data: {currentPreviewOrcamento.date}
                </span>
                <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                  Validade: {currentPreviewOrcamento.validityDays} dias
                </span>
              </div>
            </div>

            {/* Company & Client Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-[#0F2240] block uppercase tracking-wider text-[10px]">
                  Empresa Adjudicatária
                </span>
                <p className="font-bold text-slate-900">Enat Energias</p>
                <p className="text-slate-600">Ponte de Lima - Portugal</p>
                <p className="text-slate-600">Responsável Comercial: {currentPreviewOrcamento.commercialResponsible}</p>
                <p className="text-slate-600">Obra a cargo de: {currentPreviewOrcamento.workInChargeOf}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-[#0F2240] block uppercase tracking-wider text-[10px]">
                  Exmo.(a) Sr.(a) Cliente
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {currentPreviewOrcamento.client.name || 'Cliente'}
                </p>
                <p className="text-slate-600">
                  {currentPreviewOrcamento.client.address || 'Morada a indicar'}
                </p>
                {currentPreviewOrcamento.client.contact && (
                  <p className="text-slate-600">Contacto: {currentPreviewOrcamento.client.contact}</p>
                )}
                {currentPreviewOrcamento.client.nif && (
                  <p className="text-slate-600 font-mono">NIF: {currentPreviewOrcamento.client.nif}</p>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="p-4 rounded-2xl bg-[#0F2240] text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Proposta Comercial
              </span>
              <h3 className="text-sm sm:text-base font-bold mt-0.5">
                {currentPreviewOrcamento.title}
              </h3>
            </div>

            {/* Section: Equipment & Materials List (NO INDIVIDUAL PRICES AS REQUESTED) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                Discriminação dos Equipamentos e Materiais
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                      <th className="py-2 pr-3 w-8">#</th>
                      <th className="py-2 pr-3">Descrição da Solução / Equipamento</th>
                      <th className="py-2 pr-3 text-right w-24">Quantidade</th>
                      <th className="py-2 text-right w-20">Unidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPreviewOrcamento.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 font-bold text-slate-900 pr-3">{item.name}</td>
                        <td className="py-2.5 font-bold text-slate-900 text-right font-mono">{item.quantity}</td>
                        <td className="py-2.5 text-slate-600 text-right">{item.unit || 'un'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section: Installation & Labor Works */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                Trabalhos de Montagem, Mão de Obra e Ensaios
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentPreviewOrcamento.laborItems.map((lb, idx) => (
                  <li key={lb.id || idx} className="flex items-start justify-between gap-3 p-2 rounded-xl bg-slate-50">
                    <span className="font-medium">• {lb.description}</span>
                    <span className="font-bold text-emerald-600 text-[10px] uppercase tracking-wider shrink-0">
                      Incluído
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Financial Summary Box (Style TOC Online) */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-80 rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Ilíquido (s/ IVA):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentPreviewOrcamento.subtotalWithoutTax.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>IVA ({currentPreviewOrcamento.taxRate}%):</span>
                  <span className="font-mono text-slate-900">
                    {currentPreviewOrcamento.taxAmount.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-[#0F2240] pt-2 border-t-2 border-emerald-500">
                  <span>VALOR TOTAL (c/ IVA):</span>
                  <span className="font-mono text-emerald-600 text-lg">
                    {currentPreviewOrcamento.totalWithTax.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            {/* Commercial Conditions & Warranties */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
              <span className="font-bold text-[#0F2240] block uppercase tracking-wider text-[10px]">
                Condições Comerciais e Garantias
              </span>
              <p>• <strong>Validade:</strong> Válido por {currentPreviewOrcamento.validityDays} dias.</p>
              <p>• <strong>Prazo de entrega:</strong> {currentPreviewOrcamento.deliveryTerm}.</p>
              <p>• <strong>Condições de pagamento:</strong> {currentPreviewOrcamento.paymentConditions}.</p>
              <p>• <strong>Obra a cargo de:</strong> {currentPreviewOrcamento.workInChargeOf}.</p>
              <p>• <strong>Garantia de instalação:</strong> {currentPreviewOrcamento.installationWarranty}.</p>
              <p>• <strong>Garantia de equipamentos:</strong> {currentPreviewOrcamento.equipmentWarranty}.</p>
              {currentPreviewOrcamento.notes && (
                <p className="pt-1 italic text-slate-500">Nota: {currentPreviewOrcamento.notes}</p>
              )}
            </div>

            {/* Sign-off Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                {currentPreviewOrcamento.location}, {currentPreviewOrcamento.date}
              </span>
              <div className="text-center sm:text-right">
                <span className="font-bold text-[#0F2240] block">ENAT ENERGIAS</span>
                <span className="text-slate-500 text-[11px] block">
                  Responsável Comercial: {currentPreviewOrcamento.commercialResponsible}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REENVIAR ORÇAMENTO (WHATSAPP, EMAIL, PDF)
         ========================================================================= */}
      {isResendModalOpen && orcamentoToResend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl p-6 bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Send className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 py-0.5 px-2 rounded-lg">
                      {orcamentoToResend.number}
                    </span>
                    <h3 className="text-base font-bold text-black dark:text-white">
                      Reenviar Proposta Comercial
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    Cliente: <strong className="text-black dark:text-white">{orcamentoToResend.client?.name || 'A definir'}</strong> • Total: <span className="font-mono font-bold text-emerald-600">{(orcamentoToResend.totalWithTax || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResendModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Channel Tabs */}
            <div className="flex items-center gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setResendChannel('whatsapp')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  resendChannel === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setResendChannel('email')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  resendChannel === 'email'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setResendChannel('pdf')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  resendChannel === 'pdf'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Ficheiro PDF</span>
              </button>
            </div>

            {/* Channel Body: WhatsApp */}
            {resendChannel === 'whatsapp' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-neutral-300">
                    Mensagem de WhatsApp formatada:
                  </span>
                  {orcamentoToResend.client?.contact && (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Destino: {formatWhatsAppPhone(orcamentoToResend.client.contact)}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-mono text-slate-800 dark:text-neutral-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-text">
                  {getWhatsAppText(orcamentoToResend)}
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {/* Open in WhatsApp Web / App */}
                  <a
                    href={`https://wa.me/${formatWhatsAppPhone(orcamentoToResend.client?.contact || '')}?text=${encodeURIComponent(getWhatsAppText(orcamentoToResend))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleConfirmResend('whatsapp')}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Abrir no WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyText(getWhatsAppText(orcamentoToResend), 'whatsapp')}
                    className="py-2 px-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition"
                  >
                    {resendCopiedType === 'whatsapp' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500">Mensagem Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Mensagem</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Channel Body: Email */}
            {resendChannel === 'email' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-neutral-300">
                    Mensagem de Email:
                  </span>
                  {orcamentoToResend.client?.email && (
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                      Destino: {orcamentoToResend.client.email}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Assunto do Email
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={getEmailSubject(orcamentoToResend)}
                    className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Corpo do Email
                  </label>
                  <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-neutral-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-text">
                    {getEmailBodyText(orcamentoToResend)}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <a
                    href={`mailto:${orcamentoToResend.client?.email || ''}?subject=${encodeURIComponent(getEmailSubject(orcamentoToResend))}&body=${encodeURIComponent(getEmailBodyText(orcamentoToResend))}`}
                    onClick={() => handleConfirmResend('email')}
                    className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Abrir Aplicação de Email</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyText(getEmailBodyText(orcamentoToResend), 'email')}
                    className="py-2 px-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 transition"
                  >
                    {resendCopiedType === 'email' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500">Email Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Channel Body: PDF */}
            {resendChannel === 'pdf' && (
              <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                  <Download className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-black dark:text-white">
                    Descarregar Documento PDF Atualizado
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                    Ficheiro A4 oficial com logo da Enat Energias, condições gerais de garantia e discriminação de artigos sem preços unitários (sigilo comercial garantido).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadPDF(orcamentoToResend);
                    handleConfirmResend('pdf');
                  }}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'A Gerar PDF...' : 'Descarregar PDF e Registar Envio'}</span>
                </button>
              </div>
            )}

            {/* Previous Resends Log */}
            {orcamentoToResend.sentHistory && orcamentoToResend.sentHistory.length > 0 && (
              <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Histórico de Reenvios Anteriores ({orcamentoToResend.sentHistory.length})
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                  {orcamentoToResend.sentHistory.map((h, i) => (
                    <div key={i} className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {new Date(h.date).toLocaleDateString('pt-PT')} às {new Date(h.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} via <strong>{h.method.toUpperCase()}</strong>
                      </span>
                      {h.notes && <span className="italic text-[10px] text-slate-400 truncate max-w-xs">{h.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Internal Register Note */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Nota de Registo Interno deste Envio (opcional)
              </label>
              <input
                type="text"
                value={resendNotes}
                onChange={(e) => setResendNotes(e.target.value)}
                placeholder="Ex: Reenviado a pedido por telefone ou nova mensagem de WhatsApp..."
                className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
              />
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsResendModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 transition"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => handleConfirmResend(resendChannel)}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-95"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Registar Envio & Atualizar Estado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DUPLICAR ORÇAMENTO PARA NOVO CLIENTE
         ========================================================================= */}
      {isDuplicateNewClientModalOpen && orcamentoToDuplicateForNewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl p-6 bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white">
                    Duplicar Orçamento para Novo Cliente
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    Aproveite todos os materiais, equipamentos e margens para uma nova proposta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDuplicateNewClientModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cloned Solution Summary Pill */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                Conteúdo Herdado do Orçamento Original ({orcamentoToDuplicateForNewClient.number})
              </span>
              <p className="font-bold text-purple-950 dark:text-purple-100">
                {orcamentoToDuplicateForNewClient.title}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-purple-800 dark:text-purple-300 pt-0.5 font-mono">
                <span>{orcamentoToDuplicateForNewClient.items?.length || 0} materiais</span>
                <span>•</span>
                <span>{orcamentoToDuplicateForNewClient.laborItems?.length || 0} serviços</span>
                <span>•</span>
                <span>Margem: {orcamentoToDuplicateForNewClient.profitMarginPercent ?? 0}%</span>
                <span>•</span>
                <span className="font-bold">Total: {(orcamentoToDuplicateForNewClient.totalWithTax || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</span>
              </div>
            </div>

            {/* Form for the New Client */}
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Novo Número de Orçamento Sequencial
                </label>
                <input
                  type="text"
                  value={newQuoteNumber}
                  onChange={(e) => setNewQuoteNumber(e.target.value)}
                  placeholder="Ex: ORÇ-2026/004"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Novo Cliente <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: António Manuel Silva"
                  className="w-full py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Morada da Nova Obra / Cliente
                  </label>
                  <input
                    type="text"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    placeholder="Ex: Rua Direita, Arcos de Valdevez"
                    className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Contacto Telefónico
                  </label>
                  <input
                    type="text"
                    value={newClientContact}
                    onChange={(e) => setNewClientContact(e.target.value)}
                    placeholder="Ex: 912 345 678"
                    className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-medium text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email do Novo Cliente (opcional)
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="Ex: cliente@email.com"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  NIF do Cliente (opcional)
                </label>
                <input
                  type="text"
                  value={newClientNif}
                  onChange={(e) => setNewClientNif(e.target.value)}
                  placeholder="Ex: 234 567 890"
                  className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-medium text-black dark:text-white"
                />
              </div>
            </div>

            {/* Information note */}
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl">
              💡 Ao confirmar, o novo orçamento será criado com estado <strong>Rascunho</strong> e abrirá diretamente no editor para poder fazer pequenos ajustes ou descarregar o PDF imediatamente.
            </p>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsDuplicateNewClientModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-slate-700 dark:text-neutral-300 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDuplicateForNewClient}
                className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/25 transition active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Duplicar e Abrir Orçamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeletingModalOpen && orcamentoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl p-6 bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white">
              Eliminar Orçamento?
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
              Deseja eliminar a proposta <strong className="text-black dark:text-white">{orcamentoToDelete.number}</strong> para{' '}
              <strong className="text-black dark:text-white">{orcamentoToDelete.client.name || 'o cliente'}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsDeletingModalOpen(false);
                  setOrcamentoToDelete(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (orcamentoToDelete) {
                    await deleteOrcamento(orcamentoToDelete.id);
                    setIsDeletingModalOpen(false);
                    setOrcamentoToDelete(null);
                    showToast('Orçamento eliminado com sucesso.');
                  }
                }}
                className="px-5 py-2 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
