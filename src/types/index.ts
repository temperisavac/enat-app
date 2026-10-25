export type MaterialCategory =
  | 'Máquinas & Equipamentos'
  | 'Tubos de Refrigeração & Gás'
  | 'Tubos de Água & Canalização'
  | 'Ligações Elétricas & Componentes'
  | 'Acessórios & Fixação'
  | 'Sistemas de Refrigeração'
  | 'Material Elétrico'
  | 'Canalização & Tubagens'
  | 'Ferramentas & Equipamento'
  | 'Construção Civil'
  | 'Combustível & Transporte'
  | 'Refeições & Estadia'
  | 'Outros';

export type ObraTopic =
  | 'VMC'
  | 'Bomba de calor AQS'
  | 'Bomba de calor Climatização'
  | 'Ar Condicionado'
  | 'Ventiloconvectores'
  | 'UPAC (Fotovoltaico)'
  | 'Piso Radiante'
  | 'Geral / Outros';

export const DEFAULT_OBRA_TOPICS: ObraTopic[] = [
  'VMC',
  'Bomba de calor AQS',
  'Bomba de calor Climatização',
  'Ar Condicionado',
  'Ventiloconvectores',
  'UPAC (Fotovoltaico)',
  'Piso Radiante',
  'Geral / Outros',
];

export const INVOICE_CATEGORY_OPTIONS = [
  'Equipamentos do ar condicionado',
  'Equipamentos VMC',
  'Equipamentos Bomba de calor',
  'Equipamentos Ventiloconvectores',
  'Equipamentos UPAC (Fotovoltaico)',
  'Equipamentos Piso Radiante',
  'Equipamentos Solar Térmico',
  'Máquinas & Equipamentos Gerais',
  'Cablagem / Material Elétrico',
  'Cablagem Bomba de calor',
  'Cablagem Ar condicionado',
  'Tubos de Refrigeração & Gás',
  'Tubos de Água & Canalização',
  'Acessórios & Fixação',
  'Ferramentas & Consumíveis',
  'Outros / Geral',
] as const;

export type InvoiceCategory = typeof INVOICE_CATEGORY_OPTIONS[number];

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  obraId: string;
  reference?: string;          // Código ou referência do artigo tal como impresso
  name: string;
  category: MaterialCategory | string;
  quantity: number;
  unit: string;
  listPriceWithoutTax: number; // Preço de tabela/catálogo unitário sem IVA
  discountPercent: number;     // Desconto comercial em % (ex: 25%)
  discountAmount?: number;     // Valor monetário do desconto
  taxRate: number;             // Taxa de IVA (ex: 23, 13, 6, 0)
  unitPriceWithoutTax: number; // Preço unitário líquido pago sem IVA
  unitPriceWithTax: number;    // Preço unitário final pago com IVA
  totalWithoutTax: number;     // Total líquido da linha sem IVA
  totalWithTax: number;        // Total da linha com IVA
}

export interface Invoice {
  id: string;
  obraId: string;
  topic?: string;              // Tópico da obra: VMC, Bomba AQS, Climatização, etc.
  category?: string;           // Categoria geral da fatura (ex: "Equipamentos do ar condicionado", "Equipamentos VMC", "Cablagem / Material Elétrico", etc.)
  storeName: string;
  invoiceNumber: string;
  date: string;
  taxId?: string;
  subtotalWithoutTax: number;
  taxAmount: number;
  totalWithTax: number;
  roundAdjustmentAmount?: number;  // Acerto de contas de 1 ou 2 cêntimos no fim
  globalDiscountAmount?: number;   // Desconto comercial direto global no fim
  receiptImageUrl?: string;        // Primeira página
  receiptImageUrls?: string[];     // Múltiplas páginas (Página 1, Página 2, etc.)
  items: InvoiceItem[];
  notes?: string;
  createdAt: string;
}

export interface LaborRecord {
  id: string;
  obraId: string;
  date: string;
  workerName: string;
  description: string;
  hoursOrDays: number;
  unitType: 'horas' | 'dias';
  costRate: number;
  totalCost: number;
  createdAt: string;
}

export interface ManualExpense {
  id: string;
  obraId: string;
  topic?: string;              // Tópico da obra: VMC, Bomba AQS, etc.
  description: string;
  category: MaterialCategory;
  amount: number;
  date: string;
  supplierOrPlace?: string;
  paymentMethod?: 'dinheiro' | 'mbway' | 'transferencia' | 'cartao' | 'outro';
  notes?: string;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  obraId: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod?: 'transferencia' | 'dinheiro' | 'mbway' | 'cheque' | 'outro';
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface ObraAIAnalysis {
  status: 'excelente' | 'adequada' | 'alerta' | 'prejuizo';
  headline: string;
  summary: string;
  keyObservations: string[];
  recommendations: string[];
  lastAnalyzedAt: string;
}

export type EquipamentoInstalado =
  | 'ar_condicionado'
  | 'bc_aqs'
  | 'bc_clima'
  | 'piso_radiante'
  | 'ventiloconvectores'
  | 'vmc'
  | 'upac'
  | 'solar_termico'
  | 'bc_piscina';

export interface ObraManutencao {
  ativo: boolean;
  data_agendada: string;
  estado: 'agendado' | 'concluido' | 'pausado';
  mensagem_preparada: string;
  ultimo_envio: string | null;
}

export interface Obra {
  id: string;
  name: string;
  client: string;
  clientPhone?: string;                  // Contacto telefónico / WhatsApp para lembretes
  address: string;
  status: 'em_curso' | 'concluida' | 'orcamento' | 'pausada';
  budget: number;
  startDate: string;
  completionDate?: string;               // Data de conclusão da montagem para cálculo de carência
  createdAt: string;
  notes?: string;
  topicBudgets?: Record<string, number>; // Orçamento / Valor faturado ao cliente por tópico para apuramento de lucro
  customTopics?: string[];               // Tópicos personalizados além dos predefinidos
  aiAnalysisCache?: ObraAIAnalysis;
  equipamentos_instalados?: EquipamentoInstalado[];
  manutencao?: ObraManutencao;
}

export interface GoogleSheetsConfig {
  webhookUrl: string;
  spreadsheetName: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

export interface ProductPriceHistoryPoint {
  date: string;
  storeName: string;
  invoiceNumber: string;
  invoiceId?: string;
  obraName: string;
  obraId?: string;
  listPriceWithoutTax?: number;
  discountPercent?: number;
  taxRate?: number;
  unitPriceWithoutTax: number;
  unitPriceWithTax: number;
  quantity: number;
  unit: string;
}

export interface ProductDetailInfo {
  name: string;
  category: MaterialCategory;
  latestListPriceWithoutTax: number;
  latestDiscountPercent: number;
  latestTaxRate: number;
  latestPriceWithoutTax: number;
  latestPriceWithTax: number;
  unit: string;
  latestStoreName: string;
  latestDate: string;
  latestInvoiceNumber: string;
  latestObraName: string;
  totalQuantityPurchased: number;
  minPrice: number;
  maxPrice: number;
  priceHistory: ProductPriceHistoryPoint[];
}

export type OrcamentoCategoryOption =
  | 'Ar condicionado: Murais'
  | 'Ar condicionado: Conduta'
  | 'Bomba de calor aqs'
  | 'Bomba de calor climatização'
  | 'Ventiloconvectores'
  | 'Piso radiante'
  | 'VMC'
  | 'UPAC'
  | 'Paineis Solares Termicos'
  | 'Recuperador de calor';

export const ORCAMENTO_DEFAULT_CATEGORIES: { id: string; label: string; group?: string }[] = [
  { id: 'ac_murais', label: 'Ar condicionado: Murais' },
  { id: 'ac_conduta', label: 'Ar condicionado: Conduta' },
  { id: 'bc_aqs', label: 'Bomba de calor aqs' },
  { id: 'bc_clima', label: 'Bomba de calor climatização' },
  { id: 'ventilo', label: 'Ventiloconvectores' },
  { id: 'piso_rad', label: 'Piso radiante' },
  { id: 'vmc', label: 'VMC' },
  { id: 'upac', label: 'UPAC (Fotovoltaico)' },
  { id: 'solar_term', label: 'Paineis Solares Termicos' },
  { id: 'recup_calor', label: 'Recuperador de calor' },
];

export interface OrcamentoItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string; // 'un' | 'm' | 'rolo' | 'cx' etc.
  unitPrice: number; // Preço de venda unitário s/IVA (usado no cálculo interno, NÃO aparece no PDF do cliente)
  totalPrice: number; // quantity * unitPrice
  fromDatabase?: boolean; // Se veio da base de dados de faturas
}

export interface OrcamentoLaborItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // 'serviço' | 'h' | 'dias'
  unitPrice: number;
  totalPrice: number;
}

export interface OrcamentoClient {
  name: string;
  address: string;
  contact: string;
  email?: string;
  nif: string;
}

export interface OrcamentoSentLog {
  date: string;
  method: 'email' | 'whatsapp' | 'manual' | 'pdf';
  recipient?: string;
  notes?: string;
}

export interface Orcamento {
  id: string;
  number: string; // ex: 'ORÇ-2026/001'
  date: string; // YYYY-MM-DD
  location: string; // 'Ponte de Lima'
  commercialResponsible: string; // 'João Lima'
  client: OrcamentoClient;
  selectedCategories: string[];
  customTitle?: string;
  title: string; // 'Orçamento para: Ar condicionado: Murais e Bomba de calor aqs'
  items: OrcamentoItem[];
  laborItems: OrcamentoLaborItem[];
  subtotalItems: number;
  subtotalLabor: number;
  baseCostWithoutTax?: number; // Custo base de materiais + mão de obra antes da margem
  profitMarginPercent?: number; // % de lucro escolhida (ex: 15, 20, 25%)
  profitAmount?: number; // Valor monetário do lucro (€)
  subtotalWithoutTax: number; // Valor de venda final s/IVA (baseCost + profitAmount)
  taxRate: number; // 23, 13, 6, 0
  taxAmount: number;
  totalWithTax: number;
  validityDays: number; // 15 dias
  deliveryTerm: string; // 'A combinar'
  paymentConditions: string; // '50% na adjudicação'
  workInChargeOf: string; // 'Enat Energias'
  installationWarranty: string; // '2 anos'
  equipmentWarranty: string; // 'Consultar ficha técnica do equipamento'
  notes: string;
  status: 'orcamento_feito' | 'enviado' | 'adjudicado' | 'recusado' | 'rascunho' | 'aprovado';
  obraId?: string;
  sentAt?: string;
  sentCount?: number;
  lastSentMethod?: 'email' | 'whatsapp' | 'manual' | 'pdf';
  sentHistory?: OrcamentoSentLog[];
  createdAt: string;
  updatedAt: string;
}
