import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import {
  Obra,
  Invoice,
  LaborRecord,
  ManualExpense,
  ClientPayment,
  GoogleSheetsConfig,
  ProductDetailInfo,
  Orcamento,
  EquipamentoInstalado,
  ObraManutencao,
} from '../types';
import { calcularDataLembrete, gerarTextoLembrete } from '../utils/manutencoes';
import { INITIAL_OBRAS, INITIAL_INVOICES, INITIAL_LABOR } from '../data/mockData';
import { getAllAggregatedProducts } from '../utils/materialSearch';
import { buildSyncDataPayload } from '../utils/excelExport';
import { buildBackupPayload, downloadBackupJSON, saveAutoBackupSnapshot } from '../utils/backupService';
import { ParsedExcelResult } from '../utils/excelImport';
import { checkDuplicateInvoice, DuplicateCheckResult } from '../utils/invoiceDuplicateUtils';
import {
  db,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  handleFirestoreError,
  OperationType,
} from '../firebase';

export type ThemeMode = 'system' | 'dark' | 'light';

interface AppContextType {
  obras: Obra[];
  invoices: Invoice[];
  labor: LaborRecord[];
  manualExpenses: ManualExpense[];
  clientPayments: ClientPayment[];
  orcamentos: Orcamento[];
  allProducts: ProductDetailInfo[];
  selectedObraId: string | null;
  activeTab: 'dashboard' | 'obras' | 'faturas' | 'orcamentos' | 'materiais' | 'sheets' | 'manutencoes';
  isDarkMode: boolean;
  themeMode: ThemeMode;
  sheetsConfig: GoogleSheetsConfig;
  selectedProductForModal: ProductDetailInfo | null;
  isScannerOpen: boolean;
  scannerTargetObraId: string | null;
  isSyncingSheets: boolean;
  lastSyncMessage: string | null;

  // Cloud & Auth
  currentUser: User | null;
  isAuthLoading: boolean;
  isCloudSynced: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Actions
  setActiveTab: (tab: 'dashboard' | 'obras' | 'faturas' | 'orcamentos' | 'materiais' | 'sheets' | 'manutencoes') => void;
  setSelectedObraId: (id: string | null) => void;
  toggleDarkMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  openScanner: (targetObraId?: string | null) => void;
  closeScanner: () => void;
  openProductModal: (product: ProductDetailInfo) => void;
  closeProductModal: () => void;
  isNotificationModalOpen: boolean;
  openNotificationModal: () => void;
  closeNotificationModal: () => void;

  // Data mutations
  addObra: (obra: Omit<Obra, 'id' | 'createdAt'>) => string;
  updateObra: (id: string, updates: Partial<Obra>) => void;
  updateObraManutencao: (obraId: string, updates: Partial<ObraManutencao>) => void;
  updateObraEquipamentos: (obraId: string, equipamentos: EquipamentoInstalado[], dataConclusao?: string) => void;
  deleteObra: (id: string) => Promise<void>;

  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  addMultipleInvoices: (invoices: Omit<Invoice, 'id' | 'createdAt'>[]) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  deleteAllInvoices: () => Promise<void>;
  checkDuplicateInvoice: (
    candidate: {
      id?: string;
      invoiceNumber?: string;
      storeName?: string;
      taxId?: string;
      date?: string;
      totalWithTax?: number;
    },
    targetObraId: string
  ) => DuplicateCheckResult;

  addLaborRecord: (record: Omit<LaborRecord, 'id' | 'createdAt'>) => void;
  deleteLaborRecord: (id: string) => void;

  addManualExpense: (expense: Omit<ManualExpense, 'id' | 'createdAt'>) => string;
  updateManualExpense: (id: string, updates: Partial<ManualExpense>) => void;
  deleteManualExpense: (id: string) => void;

  addClientPayment: (payment: Omit<ClientPayment, 'id' | 'createdAt'>) => string;
  deleteClientPayment: (id: string) => void;

  // Orçamentos
  addOrcamento: (data: Omit<Orcamento, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateOrcamento: (id: string, updates: Partial<Orcamento>) => void;
  deleteOrcamento: (id: string) => Promise<void>;
  deleteAllOrcamentos: () => Promise<void>;

  updateSheetsConfig: (updates: Partial<GoogleSheetsConfig>) => void;
  triggerGoogleSheetsLiveSync: () => Promise<{ success: boolean; message: string }>;
  downloadFullBackup: () => void;
  restoreBackupData: (backupData: any, mode: 'merge' | 'replace') => Promise<{ success: boolean; message: string }>;
  importExcelData: (parsed: ParsedExcelResult, mode?: 'merge' | 'replace') => Promise<{ success: boolean; message: string }>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  OBRAS: 'revolut_obras_clean_v2',
  INVOICES: 'revolut_invoices_clean_v2',
  LABOR: 'revolut_labor_clean_v2',
  MANUAL_EXPENSES: 'revolut_manual_expenses_v2',
  CLIENT_PAYMENTS: 'revolut_client_payments_v2',
  ORCAMENTOS: 'revolut_orcamentos_clean_v1',
  THEME_MODE: 'revolut_theme_mode_v2',
  SHEETS: 'revolut_sheets_clean_v2',
};

/**
 * Sanitizes data for Firestore:
 * 1. Strips all undefined fields (Firestore throws invalid data on undefined).
 * 2. Ensures large image strings do not breach Firestore 1MB document boundary.
 */
function cleanFirestorePayload<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      continue;
    }
    // Prevent huge base64 strings (> 200KB) from causing Firestore document limit failures
    if (key === 'receiptImageUrl' && typeof val === 'string' && val.length > 200000) {
      clean[key] = '';
      continue;
    }
    if (key === 'receiptImageUrls' && Array.isArray(val)) {
      clean[key] = val.filter((item) => typeof item === 'string' && item.length <= 200000);
      continue;
    }
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = cleanFirestorePayload(val);
    } else if (Array.isArray(val)) {
      clean[key] = val.map((item) =>
        item !== null && typeof item === 'object' ? cleanFirestorePayload(item) : item
      );
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme Mode: 'system' by default to automatically follow OS settings
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved as ThemeMode;
    }
    return 'system';
  });

  // Active boolean state reflecting current dark or light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
      if (savedMode === 'dark') return true;
      if (savedMode === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Data states
  const [obras, setObras] = useState<Obra[]>(() => {
    const isCleared = localStorage.getItem('enat_data_cleared_by_user') === 'true';
    if (isCleared) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.OBRAS);
    return saved !== null ? JSON.parse(saved) : INITIAL_OBRAS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const isCleared = localStorage.getItem('enat_data_cleared_by_user') === 'true';
    if (isCleared) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return saved !== null ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [labor, setLabor] = useState<LaborRecord[]>(() => {
    const isCleared = localStorage.getItem('enat_data_cleared_by_user') === 'true';
    if (isCleared) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.LABOR);
    return saved !== null ? JSON.parse(saved) : INITIAL_LABOR;
  });

  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MANUAL_EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });

  const [clientPayments, setClientPayments] = useState<ClientPayment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENT_PAYMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(() => {
    const isCleared = localStorage.getItem('enat_data_cleared_by_user') === 'true';
    if (isCleared) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.ORCAMENTOS);
    return saved !== null ? JSON.parse(saved) : [];
  });

  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHEETS);
    return saved
      ? JSON.parse(saved)
      : {
          webhookUrl: '',
          spreadsheetName: 'Controlo Geral de Obras & Materiais',
          autoSync: true,
          lastSyncedAt: null,
        };
  });

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'dashboard' | 'obras' | 'faturas' | 'orcamentos' | 'materiais' | 'sheets' | 'manutencoes'>('dashboard');
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductDetailInfo | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetObraId, setScannerTargetObraId] = useState<string | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Cloud Sync & Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Migration refs to ensure local->cloud migration only runs once on initial login
  const hasMigratedObrasRef = useRef(false);
  const hasMigratedInvoicesRef = useRef(false);
  const hasMigratedLaborRef = useRef(false);
  const hasMigratedExpensesRef = useRef(false);
  const hasMigratedPaymentsRef = useRef(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync when User is Logged In
  useEffect(() => {
    if (!currentUser) {
      setIsCloudSynced(false);
      return;
    }

    const uid = currentUser.uid;
    setIsCloudSynced(true);

    // 1. Listen to Obras in Firestore
    const obrasQuery = query(collection(db, 'obras'), where('ownerId', '==', uid));
    const unsubObras = onSnapshot(
      obrasQuery,
      (snapshot) => {
        const cloudObras: Obra[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudObras.push({
            id: docSnap.id,
            name: data.name || '',
            client: data.client || '',
            clientPhone: data.clientPhone || '',
            address: data.address || '',
            status: data.status || 'em_curso',
            budget: Number(data.budget) || 0,
            startDate: data.startDate || '',
            completionDate: data.completionDate || '',
            createdAt: data.createdAt || new Date().toISOString(),
            notes: data.notes || '',
            topicBudgets: data.topicBudgets || {},
            customTopics: Array.isArray(data.customTopics) ? data.customTopics : [],
            aiAnalysisCache: data.aiAnalysisCache || undefined,
            equipamentos_instalados: Array.isArray(data.equipamentos_instalados) ? data.equipamentos_instalados : [],
            manutencao: data.manutencao ? {
              ativo: data.manutencao.ativo ?? true,
              data_agendada: data.manutencao.data_agendada || '',
              estado: data.manutencao.estado || 'agendado',
              mensagem_preparada: data.manutencao.mensagem_preparada || '',
              ultimo_envio: data.manutencao.ultimo_envio || null,
            } : undefined,
          });
        });

        // If first load and cloud is empty, migrate existing local obras
        if (!hasMigratedObrasRef.current) {
          hasMigratedObrasRef.current = true;
          if (snapshot.empty && obras.length > 0) {
            obras.forEach(async (localObra) => {
              try {
                const payload = cleanFirestorePayload({
                  ...localObra,
                  ownerId: uid,
                });
                await setDoc(doc(db, 'obras', localObra.id), payload);
              } catch (e) {
                console.warn('Sync local obra error:', e);
              }
            });
            return;
          }
        }

        // Always update state (even if empty, e.g. after deletion)
        cloudObras.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setObras(cloudObras);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'obras');
      }
    );

    // 2. Listen to Invoices in Firestore
    const invoicesQuery = query(collection(db, 'invoices'), where('ownerId', '==', uid));
    const unsubInvoices = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        const cloudInvoices: Invoice[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const imageUrls = Array.isArray(data.receiptImageUrls) && data.receiptImageUrls.length > 0
            ? data.receiptImageUrls
            : (data.receiptImageUrl ? [data.receiptImageUrl] : []);
          cloudInvoices.push({
            id: docSnap.id,
            obraId: data.obraId || '',
            topic: data.topic || 'Geral / Outros',
            storeName: data.storeName || '',
            invoiceNumber: data.invoiceNumber || '',
            date: data.date || '',
            taxId: data.taxId || '',
            subtotalWithoutTax: Number(data.subtotalWithoutTax) || 0,
            taxAmount: Number(data.taxAmount) || 0,
            totalWithTax: Number(data.totalWithTax) || 0,
            roundAdjustmentAmount: Number(data.roundAdjustmentAmount) || 0,
            globalDiscountAmount: Number(data.globalDiscountAmount) || 0,
            receiptImageUrl: data.receiptImageUrl || (imageUrls[0] || ''),
            receiptImageUrls: imageUrls,
            items: Array.isArray(data.items) ? data.items : [],
            notes: data.notes || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        // If first load and cloud is empty, migrate existing local invoices once
        if (!hasMigratedInvoicesRef.current) {
          hasMigratedInvoicesRef.current = true;
          if (snapshot.empty && invoices.length > 0) {
            invoices.forEach(async (localInv) => {
              try {
                const payload = cleanFirestorePayload({
                  ...localInv,
                  ownerId: uid,
                });
                await setDoc(doc(db, 'invoices', localInv.id), payload);
              } catch (e) {
                console.warn('Sync local invoice error:', e);
              }
            });
            return;
          }
        }

        // Always update state to match cloud (even if empty, e.g. after deleting invoices)
        cloudInvoices.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        setInvoices(cloudInvoices);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'invoices');
      }
    );

    // 3. Listen to Labor in Firestore
    const laborQuery = query(collection(db, 'labor'), where('ownerId', '==', uid));
    const unsubLabor = onSnapshot(
      laborQuery,
      (snapshot) => {
        const cloudLabor: LaborRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudLabor.push({
            id: docSnap.id,
            obraId: data.obraId || '',
            date: data.date || '',
            workerName: data.workerName || '',
            description: data.description || '',
            hoursOrDays: Number(data.hoursOrDays) || 0,
            unitType: data.unitType || 'horas',
            costRate: Number(data.costRate) || 0,
            totalCost: Number(data.totalCost) || 0,
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        if (!hasMigratedLaborRef.current) {
          hasMigratedLaborRef.current = true;
          if (snapshot.empty && labor.length > 0) {
            labor.forEach(async (localLab) => {
              try {
                await setDoc(doc(db, 'labor', localLab.id), {
                  ...localLab,
                  ownerId: uid,
                });
              } catch (e) {
                console.warn('Sync local labor error:', e);
              }
            });
            return;
          }
        }

        cloudLabor.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        setLabor(cloudLabor);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'labor');
      }
    );

    // 4. Listen to Manual Expenses (Despesas sem fatura) in Firestore
    const expensesQuery = query(collection(db, 'manual_expenses'), where('ownerId', '==', uid));
    const unsubExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const cloudExpenses: ManualExpense[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudExpenses.push({
            id: docSnap.id,
            obraId: data.obraId || '',
            topic: data.topic || 'Geral / Outros',
            description: data.description || '',
            category: data.category || 'Outros',
            amount: Number(data.amount) || 0,
            date: data.date || '',
            supplierOrPlace: data.supplierOrPlace || '',
            paymentMethod: data.paymentMethod || 'dinheiro',
            notes: data.notes || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        if (!hasMigratedExpensesRef.current) {
          hasMigratedExpensesRef.current = true;
          if (snapshot.empty && manualExpenses.length > 0) {
            manualExpenses.forEach(async (localExp) => {
              try {
                const payload = cleanFirestorePayload({
                  ...localExp,
                  ownerId: uid,
                });
                await setDoc(doc(db, 'manual_expenses', localExp.id), payload);
              } catch (e) {
                console.warn('Sync local manual expense error:', e);
              }
            });
            return;
          }
        }

        cloudExpenses.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        setManualExpenses(cloudExpenses);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'manual_expenses');
      }
    );

    // 5. Listen to Client Payments (Recebimentos do cliente) in Firestore
    const paymentsQuery = query(collection(db, 'client_payments'), where('ownerId', '==', uid));
    const unsubPayments = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const cloudPayments: ClientPayment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudPayments.push({
            id: docSnap.id,
            obraId: data.obraId || '',
            amount: Number(data.amount) || 0,
            date: data.date || '',
            description: data.description || '',
            paymentMethod: data.paymentMethod || 'transferencia',
            receiptNumber: data.receiptNumber || '',
            notes: data.notes || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        if (!hasMigratedPaymentsRef.current) {
          hasMigratedPaymentsRef.current = true;
          if (snapshot.empty && clientPayments.length > 0) {
            clientPayments.forEach(async (localPay) => {
              try {
                const payload = cleanFirestorePayload({
                  ...localPay,
                  ownerId: uid,
                });
                await setDoc(doc(db, 'client_payments', localPay.id), payload);
              } catch (e) {
                console.warn('Sync local client payment error:', e);
              }
            });
            return;
          }
        }

        cloudPayments.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        setClientPayments(cloudPayments);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'client_payments');
      }
    );

    // 6. Listen to Orçamentos in Firestore
    const orcamentosQuery = query(collection(db, 'orcamentos'), where('ownerId', '==', uid));
    const unsubOrcamentos = onSnapshot(
      orcamentosQuery,
      (snapshot) => {
        const cloudOrcamentos: Orcamento[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudOrcamentos.push({
            id: docSnap.id,
            number: data.number || '',
            date: data.date || '',
            location: data.location || 'Ponte de Lima',
            commercialResponsible: data.commercialResponsible || 'João Lima',
            client: data.client || { name: '', address: '', contact: '', nif: '' },
            selectedCategories: Array.isArray(data.selectedCategories) ? data.selectedCategories : [],
            customTitle: data.customTitle || '',
            title: data.title || 'Orçamento para: Fornecimento e Instalação de Equipamentos',
            items: Array.isArray(data.items) ? data.items : [],
            laborItems: Array.isArray(data.laborItems) ? data.laborItems : [],
            subtotalItems: Number(data.subtotalItems) || 0,
            subtotalLabor: Number(data.subtotalLabor) || 0,
            baseCostWithoutTax: Number(data.baseCostWithoutTax) || (Number(data.subtotalItems) || 0) + (Number(data.subtotalLabor) || 0),
            profitMarginPercent: data.profitMarginPercent !== undefined ? Number(data.profitMarginPercent) : 0,
            profitAmount: Number(data.profitAmount) || 0,
            subtotalWithoutTax: Number(data.subtotalWithoutTax) || 0,
            taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 23,
            taxAmount: Number(data.taxAmount) || 0,
            totalWithTax: Number(data.totalWithTax) || 0,
            validityDays: Number(data.validityDays) || 15,
            deliveryTerm: data.deliveryTerm || 'A combinar',
            paymentConditions: data.paymentConditions || '50% na adjudicação',
            workInChargeOf: data.workInChargeOf || 'Enat Energias',
            installationWarranty: data.installationWarranty || '2 anos',
            equipmentWarranty: data.equipmentWarranty || 'Consultar ficha técnica do equipamento',
            notes: data.notes || '',
            status: data.status || 'rascunho',
            obraId: data.obraId || undefined,
            sentAt: data.sentAt || undefined,
            sentCount: Number(data.sentCount) || 0,
            lastSentMethod: data.lastSentMethod || undefined,
            sentHistory: Array.isArray(data.sentHistory) ? data.sentHistory : [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        cloudOrcamentos.sort(
          (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
        );
        setOrcamentos(cloudOrcamentos);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orcamentos');
      }
    );

    return () => {
      unsubObras();
      unsubInvoices();
      unsubLabor();
      unsubExpenses();
      unsubPayments();
      unsubOrcamentos();
    };
  }, [currentUser]);

  // Save orcamentos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORCAMENTOS, JSON.stringify(orcamentos));
    } catch (e) {
      console.warn('LocalStorage save error (orcamentos):', e);
    }
  }, [orcamentos]);

  // System Theme Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark: boolean) => {
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#000000' : '#F4F4F7');
      }
    };

    const updateTheme = () => {
      if (themeMode === 'system') {
        applyTheme(mediaQuery.matches);
      } else {
        applyTheme(themeMode === 'dark');
      }
    };

    updateTheme();

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        applyTheme(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  };

  const toggleDarkMode = () => {
    if (themeMode === 'system') {
      setThemeMode(isDarkMode ? 'light' : 'dark');
    } else if (themeMode === 'dark') {
      setThemeMode('light');
    } else {
      setThemeMode('system');
    }
  };

  // Persist locally as offline backup
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obras));
  }, [obras]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LABOR, JSON.stringify(labor));
  }, [labor]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MANUAL_EXPENSES, JSON.stringify(manualExpenses));
  }, [manualExpenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENT_PAYMENTS, JSON.stringify(clientPayments));
  }, [clientPayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHEETS, JSON.stringify(sheetsConfig));
  }, [sheetsConfig]);

  // Aggregated products for quick search
  const allProducts = React.useMemo(() => {
    return getAllAggregatedProducts(invoices, obras);
  }, [invoices, obras]);

  // Google Sign In & Out
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsCloudSynced(false);
    } catch (err: any) {
      console.error('Sign-Out Error:', err);
    }
  };

  const openScanner = (targetObraId: string | null = null) => {
    setScannerTargetObraId(targetObraId || (selectedObraId ? selectedObraId : null));
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setScannerTargetObraId(null);
  };

  const openProductModal = (product: ProductDetailInfo) => {
    setSelectedProductForModal(product);
  };

  const closeProductModal = () => {
    setSelectedProductForModal(null);
  };

  const openNotificationModal = () => {
    setIsNotificationModalOpen(true);
  };

  const closeNotificationModal = () => {
    setIsNotificationModalOpen(false);
  };

  // Obra Mutations (Cloud + Local)
  const addObra = (data: Omit<Obra, 'id' | 'createdAt'>): string => {
    const newId = `obra-${Date.now()}`;
    const equipamentos = data.equipamentos_instalados || [];
    const baseDate = data.completionDate || data.startDate || new Date().toISOString().split('T')[0];
    const defaultDataAgendada = calcularDataLembrete(baseDate, equipamentos);
    const defaultMsg = gerarTextoLembrete(data.client, equipamentos);
    const manutencao = data.manutencao || (equipamentos.length > 0 ? {
      ativo: true,
      data_agendada: defaultDataAgendada,
      estado: 'agendado' as const,
      mensagem_preparada: defaultMsg,
      ultimo_envio: null,
    } : undefined);

    const newObra: Obra = {
      ...data,
      id: newId,
      name: (data.name || 'Obra Sem Nome').trim(),
      client: (data.client || 'Cliente Geral').trim(),
      clientPhone: data.clientPhone?.trim() || '',
      address: (data.address || 'Portugal').trim(),
      status: data.status || 'em_curso',
      budget: Number(data.budget) || 0,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      completionDate: data.completionDate || '',
      notes: data.notes || '',
      equipamentos_instalados: equipamentos,
      manutencao: manutencao,
      createdAt: new Date().toISOString(),
    };

    setObras((prev) => [newObra, ...prev]);

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...newObra,
          ownerId: currentUser.uid,
        });
        setDoc(doc(db, 'obras', newId), payload).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `obras/${newId}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `obras/${newId}`);
      }
    }

    return newId;
  };

  const updateObra = (id: string, updates: Partial<Obra>) => {
    setObras((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload(updates);
        updateDoc(doc(db, 'obras', id), payload).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `obras/${id}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `obras/${id}`);
      }
    }
  };

  const updateObraManutencao = (obraId: string, updates: Partial<ObraManutencao>) => {
    setObras((prev) => {
      const target = prev.find((o) => o.id === obraId);
      if (!target) return prev;
      const baseDate = target.completionDate || target.startDate || new Date().toISOString().split('T')[0];
      const defaultDataAgendada = calcularDataLembrete(baseDate, target.equipamentos_instalados || []);
      const defaultMsg = gerarTextoLembrete(target.client, target.equipamentos_instalados || []);
      const currentManut: ObraManutencao = target.manutencao || {
        ativo: true,
        data_agendada: defaultDataAgendada,
        estado: 'agendado',
        mensagem_preparada: defaultMsg,
        ultimo_envio: null,
      };
      const merged: ObraManutencao = {
        ...currentManut,
        ...updates,
      };
      const updatedList = prev.map((o) => (o.id === obraId ? { ...o, manutencao: merged } : o));
      if (currentUser) {
        try {
          const payload = cleanFirestorePayload({ manutencao: merged });
          updateDoc(doc(db, 'obras', obraId), payload).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, `obras/${obraId}`);
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `obras/${obraId}`);
        }
      }
      return updatedList;
    });
  };

  const updateObraEquipamentos = (obraId: string, equipamentos: EquipamentoInstalado[], dataConclusao?: string) => {
    setObras((prev) => {
      const target = prev.find((o) => o.id === obraId);
      if (!target) return prev;
      const effectiveCompletionDate = dataConclusao !== undefined ? dataConclusao : (target.completionDate || target.startDate || new Date().toISOString().split('T')[0]);
      const dataAgendada = calcularDataLembrete(effectiveCompletionDate, equipamentos);
      const msg = gerarTextoLembrete(target.client, equipamentos);
      const currentManut = target.manutencao;
      const updatedManut: ObraManutencao = {
        ativo: currentManut ? currentManut.ativo : (equipamentos.length > 0),
        data_agendada: dataAgendada,
        estado: currentManut ? currentManut.estado : 'agendado',
        mensagem_preparada: msg,
        ultimo_envio: currentManut?.ultimo_envio || null,
      };

      const obraUpdates: Partial<Obra> = {
        equipamentos_instalados: equipamentos,
        ...(dataConclusao !== undefined ? { completionDate: dataConclusao } : {}),
        manutencao: updatedManut,
      };

      const updatedList = prev.map((o) => (o.id === obraId ? { ...o, ...obraUpdates } : o));

      if (currentUser) {
        try {
          const payload = cleanFirestorePayload(obraUpdates);
          updateDoc(doc(db, 'obras', obraId), payload).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, `obras/${obraId}`);
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `obras/${obraId}`);
        }
      }
      return updatedList;
    });
  };

  const deleteObra = async (id: string) => {
    // 1. Cascade delete in local state
    setObras((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setInvoices((prev) => {
      const updated = prev.filter((i) => i.obraId !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setLabor((prev) => {
      const updated = prev.filter((l) => l.obraId !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.LABOR, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setManualExpenses((prev) => {
      const updated = prev.filter((e) => e.obraId !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.MANUAL_EXPENSES, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setClientPayments((prev) => {
      const updated = prev.filter((p) => p.obraId !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.CLIENT_PAYMENTS, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    if (selectedObraId === id) setSelectedObraId(null);

    // 2. Cascade delete from Firestore if logged in
    if (currentUser) {
      const uid = currentUser.uid;
      try {
        await deleteDoc(doc(db, 'obras', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `obras/${id}`);
      }

      // Cascade delete invoices of this obra from Firestore
      try {
        const invQ = query(collection(db, 'invoices'), where('obraId', '==', id), where('ownerId', '==', uid));
        const snap = await getDocs(invQ);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Error deleting cascaded invoices in Firestore:', e);
      }

      // Cascade delete labor of this obra from Firestore
      try {
        const labQ = query(collection(db, 'labor'), where('obraId', '==', id), where('ownerId', '==', uid));
        const snap = await getDocs(labQ);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Error deleting cascaded labor in Firestore:', e);
      }

      // Cascade delete manual expenses of this obra from Firestore
      try {
        const expQ = query(collection(db, 'manual_expenses'), where('obraId', '==', id), where('ownerId', '==', uid));
        const snap = await getDocs(expQ);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Error deleting cascaded expenses in Firestore:', e);
      }

      // Cascade delete client payments of this obra from Firestore
      try {
        const payQ = query(collection(db, 'client_payments'), where('obraId', '==', id), where('ownerId', '==', uid));
        const snap = await getDocs(payQ);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn('Error deleting cascaded payments in Firestore:', e);
      }
    }
  };

  // Helper to check duplicate invoice against current app state
  const checkDuplicateInvoiceForObra = (
    candidate: {
      id?: string;
      invoiceNumber?: string;
      storeName?: string;
      taxId?: string;
      date?: string;
      totalWithTax?: number;
    },
    targetObraId: string
  ): DuplicateCheckResult => {
    return checkDuplicateInvoice(candidate, invoices, targetObraId, obras);
  };

  // Invoice Mutations (Cloud + Local)
  const addInvoice = (data: Omit<Invoice, 'id' | 'createdAt'>) => {
    // Verificar duplicação rigorosa na obra destino
    const dupCheck = checkDuplicateInvoice(
      {
        invoiceNumber: data.invoiceNumber,
        storeName: data.storeName,
        taxId: data.taxId,
        date: data.date,
        totalWithTax: data.totalWithTax,
      },
      invoices,
      data.obraId,
      obras
    );

    if (dupCheck.isDuplicate && dupCheck.duplicateInSameObra) {
      const targetObraObj = obras.find((o) => o.id === data.obraId);
      const obraName = targetObraObj?.name || 'Obra';
      const msg = `Não é permitido anexar a mesma fatura duas vezes na mesma obra. A fatura nº "${data.invoiceNumber || 's/n'}" do fornecedor "${data.storeName}" (${Number(data.totalWithTax || 0).toFixed(2)} €) já está anexada à obra "${obraName}".`;
      throw new Error(msg);
    }

    const newInvoiceId = `inv-${Date.now()}`;
    const imageUrls = Array.isArray(data.receiptImageUrls) && data.receiptImageUrls.length > 0
      ? data.receiptImageUrls
      : (data.receiptImageUrl ? [data.receiptImageUrl] : []);

    const newInvoice: Invoice = {
      ...data,
      id: newInvoiceId,
      obraId: data.obraId,
      topic: data.topic || 'Geral / Outros',
      storeName: (data.storeName || 'Loja / Fornecedor').trim(),
      invoiceNumber: (data.invoiceNumber || `FT-${Date.now().toString().slice(-6)}`).trim(),
      date: data.date || new Date().toISOString().split('T')[0],
      taxId: data.taxId ? data.taxId.trim() : '',
      subtotalWithoutTax: Number(data.subtotalWithoutTax) || 0,
      taxAmount: Number(data.taxAmount) || 0,
      totalWithTax: Number(data.totalWithTax) || 0,
      roundAdjustmentAmount: Number(data.roundAdjustmentAmount) || 0,
      globalDiscountAmount: Number(data.globalDiscountAmount) || 0,
      receiptImageUrl: data.receiptImageUrl || (imageUrls[0] || ''),
      receiptImageUrls: imageUrls,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      items: (data.items || []).map((item, idx) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${idx}`,
        invoiceId: newInvoiceId,
        obraId: data.obraId,
        name: item.name || 'Produto',
        category: item.category || 'Outros',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'Uni',
        unitPriceWithoutTax: Number(item.unitPriceWithoutTax) || 0,
        unitPriceWithTax: Number(item.unitPriceWithTax) || 0,
        totalWithoutTax: Number(item.totalWithoutTax) || 0,
        totalWithTax: Number(item.totalWithTax) || 0,
      })),
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...newInvoice,
          ownerId: currentUser.uid,
        });
        setDoc(doc(db, 'invoices', newInvoiceId), payload).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `invoices/${newInvoiceId}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `invoices/${newInvoiceId}`);
      }
    }

    if (sheetsConfig.autoSync && sheetsConfig.webhookUrl) {
      setTimeout(() => {
        triggerGoogleSheetsLiveSync();
      }, 500);
    }
  };

  const addMultipleInvoices = (invoicesData: Omit<Invoice, 'id' | 'createdAt'>[]) => {
    if (!invoicesData.length) return;

    // Filtrar faturas que já estejam registadas na mesma obra
    const nonDuplicateInvoices: Omit<Invoice, 'id' | 'createdAt'>[] = [];
    const duplicateErrors: string[] = [];

    invoicesData.forEach((data) => {
      const dupCheck = checkDuplicateInvoice(
        {
          invoiceNumber: data.invoiceNumber,
          storeName: data.storeName,
          taxId: data.taxId,
          date: data.date,
          totalWithTax: data.totalWithTax,
        },
        invoices,
        data.obraId,
        obras
      );

      if (dupCheck.isDuplicate && dupCheck.duplicateInSameObra) {
        duplicateErrors.push(`Fatura "${data.invoiceNumber || 's/n'}" (${data.storeName})`);
      } else {
        nonDuplicateInvoices.push(data);
      }
    });

    if (nonDuplicateInvoices.length === 0) {
      throw new Error(
        `Não é possível guardar faturas duplicadas: as faturas selecionadas já se encontram anexadas a esta obra (${duplicateErrors.join(', ')}).`
      );
    }

    const now = Date.now();
    const newInvoices: Invoice[] = nonDuplicateInvoices.map((data, invIdx) => {
      const newInvoiceId = `inv-${now}-${invIdx}`;
      const imageUrls = Array.isArray(data.receiptImageUrls) && data.receiptImageUrls.length > 0
        ? data.receiptImageUrls
        : (data.receiptImageUrl ? [data.receiptImageUrl] : []);
      return {
        ...data,
        id: newInvoiceId,
        obraId: data.obraId,
        topic: data.topic || 'Geral / Outros',
        storeName: (data.storeName || 'Loja / Fornecedor').trim(),
        invoiceNumber: (data.invoiceNumber || `FT-${now.toString().slice(-6)}-${invIdx + 1}`).trim(),
        date: data.date || new Date().toISOString().split('T')[0],
        taxId: data.taxId ? data.taxId.trim() : '',
        subtotalWithoutTax: Number(data.subtotalWithoutTax) || 0,
        taxAmount: Number(data.taxAmount) || 0,
        totalWithTax: Number(data.totalWithTax) || 0,
        roundAdjustmentAmount: Number(data.roundAdjustmentAmount) || 0,
        globalDiscountAmount: Number(data.globalDiscountAmount) || 0,
        receiptImageUrl: data.receiptImageUrl || (imageUrls[0] || ''),
        receiptImageUrls: imageUrls,
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
        items: (data.items || []).map((item, itemIdx) => ({
          ...item,
          id: item.id || `item-${now}-${invIdx}-${itemIdx}`,
          invoiceId: newInvoiceId,
          obraId: data.obraId,
          name: item.name || 'Produto',
          category: item.category || 'Outros',
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'Uni',
          unitPriceWithoutTax: Number(item.unitPriceWithoutTax) || 0,
          unitPriceWithTax: Number(item.unitPriceWithTax) || 0,
          totalWithoutTax: Number(item.totalWithoutTax) || 0,
          totalWithTax: Number(item.totalWithTax) || 0,
        })),
      };
    });

    setInvoices((prev) => [...newInvoices, ...prev]);

    if (currentUser) {
      try {
        const batch = writeBatch(db);
        newInvoices.forEach((inv) => {
          const payload = cleanFirestorePayload({
            ...inv,
            ownerId: currentUser.uid,
          });
          batch.set(doc(db, 'invoices', inv.id), payload);
        });
        batch.commit().catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, 'invoices');
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'invoices');
      }
    }

    if (sheetsConfig.autoSync && sheetsConfig.webhookUrl) {
      setTimeout(() => {
        triggerGoogleSheetsLiveSync();
      }, 500);
    }
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)));

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload(updates);
        updateDoc(doc(db, 'invoices', id), payload).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
      }
    }
  };

  const deleteInvoice = (id: string) => {
    // 1. Immediately update in-memory state and localStorage
    setInvoices((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      return updated;
    });

    // 2. If viewing product from this invoice in modal, refresh or close it
    setSelectedProductForModal((curr) => {
      if (!curr) return null;
      const remainingHistory = curr.priceHistory.filter((p) => p.invoiceId !== id);
      if (remainingHistory.length === 0) return null;
      return {
        ...curr,
        priceHistory: remainingHistory,
      };
    });

    // 3. Delete from Firestore if authenticated
    if (currentUser) {
      deleteDoc(doc(db, 'invoices', id))
        .then(() => {
          console.log('Fatura eliminada com sucesso no Firestore:', id);
        })
        .catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`);
        });
    }

    // 4. Trigger Google Sheets sync if enabled
    if (sheetsConfig.autoSync && sheetsConfig.webhookUrl) {
      setTimeout(() => {
        triggerGoogleSheetsLiveSync();
      }, 500);
    }
  };

  // Labor Mutations (Cloud + Local)
  const addLaborRecord = (data: Omit<LaborRecord, 'id' | 'createdAt'>) => {
    const newRecordId = `labor-${Date.now()}`;
    const newRecord: LaborRecord = {
      ...data,
      id: newRecordId,
      workerName: (data.workerName || 'Trabalhador').trim(),
      description: (data.description || 'Mão de Obra').trim(),
      hoursOrDays: Number(data.hoursOrDays) || 0,
      unitType: data.unitType || 'horas',
      costRate: Number(data.costRate) || 0,
      totalCost: Number(data.totalCost) || 0,
      createdAt: new Date().toISOString(),
    };

    setLabor((prev) => [newRecord, ...prev]);

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...newRecord,
          ownerId: currentUser.uid,
        });
        setDoc(doc(db, 'labor', newRecordId), payload).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `labor/${newRecordId}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `labor/${newRecordId}`);
      }
    }
  };

  const deleteLaborRecord = (id: string) => {
    setLabor((prev) => prev.filter((l) => l.id !== id));

    if (currentUser) {
      deleteDoc(doc(db, 'labor', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `labor/${id}`);
      });
    }
  };

  // Manual Expenses (Despesas sem fatura) Mutations (Cloud + Local)
  const addManualExpense = (data: Omit<ManualExpense, 'id' | 'createdAt'>): string => {
    const newId = `expense-${Date.now()}`;
    const newExpense: ManualExpense = {
      ...data,
      id: newId,
      topic: data.topic || 'Geral / Outros',
      description: (data.description || 'Despesa').trim(),
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      category: data.category || 'Outros',
      supplierOrPlace: (data.supplierOrPlace || '').trim(),
      paymentMethod: data.paymentMethod || 'dinheiro',
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    setManualExpenses((prev) => [newExpense, ...prev]);

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...newExpense,
          ownerId: currentUser.uid,
        });
        setDoc(doc(db, 'manual_expenses', newId), payload).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `manual_expenses/${newId}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `manual_expenses/${newId}`);
      }
    }

    return newId;
  };

  const updateManualExpense = (id: string, updates: Partial<ManualExpense>) => {
    setManualExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)));

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload(updates);
        updateDoc(doc(db, 'manual_expenses', id), payload).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `manual_expenses/${id}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `manual_expenses/${id}`);
      }
    }
  };

  const deleteManualExpense = (id: string) => {
    setManualExpenses((prev) => prev.filter((e) => e.id !== id));

    if (currentUser) {
      deleteDoc(doc(db, 'manual_expenses', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `manual_expenses/${id}`);
      });
    }
  };

  // Client Payments (Recebimentos do Cliente) Mutations (Cloud + Local)
  const addClientPayment = (data: Omit<ClientPayment, 'id' | 'createdAt'>): string => {
    const newId = `payment-${Date.now()}`;
    const newPayment: ClientPayment = {
      ...data,
      id: newId,
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      description: (data.description || 'Recebimento').trim(),
      paymentMethod: data.paymentMethod || 'transferencia',
      receiptNumber: (data.receiptNumber || '').trim(),
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    setClientPayments((prev) => [newPayment, ...prev]);

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...newPayment,
          ownerId: currentUser.uid,
        });
        setDoc(doc(db, 'client_payments', newId), payload).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `client_payments/${newId}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `client_payments/${newId}`);
      }
    }

    return newId;
  };

  const deleteClientPayment = (id: string) => {
    setClientPayments((prev) => prev.filter((p) => p.id !== id));

    if (currentUser) {
      deleteDoc(doc(db, 'client_payments', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `client_payments/${id}`);
      });
    }
  };

  // Orçamentos Mutations (Cloud + Local)
  const addOrcamento = (data: Omit<Orcamento, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const newId = `orc-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newOrcamento: Orcamento = {
      ...data,
      id: newId,
      number: data.number || `ORÇ-${new Date().getFullYear()}/${String(orcamentos.length + 1).padStart(3, '0')}`,
      date: data.date || nowIso.split('T')[0],
      location: (data.location || 'Ponte de Lima').trim(),
      commercialResponsible: (data.commercialResponsible || 'João Lima').trim(),
      client: {
        name: (data.client?.name || '').trim(),
        address: (data.client?.address || '').trim(),
        contact: (data.client?.contact || '').trim(),
        nif: (data.client?.nif || '').trim(),
      },
      selectedCategories: Array.isArray(data.selectedCategories) ? data.selectedCategories : [],
      customTitle: data.customTitle || '',
      title: data.title || 'Orçamento para: Fornecimento e Instalação de Equipamentos',
      items: Array.isArray(data.items) ? data.items : [],
      laborItems: Array.isArray(data.laborItems) ? data.laborItems : [],
      subtotalItems: Number(data.subtotalItems) || 0,
      subtotalLabor: Number(data.subtotalLabor) || 0,
      baseCostWithoutTax: Number(data.baseCostWithoutTax) || (Number(data.subtotalItems) || 0) + (Number(data.subtotalLabor) || 0),
      profitMarginPercent: data.profitMarginPercent !== undefined ? Number(data.profitMarginPercent) : 0,
      profitAmount: Number(data.profitAmount) || 0,
      subtotalWithoutTax: Number(data.subtotalWithoutTax) || 0,
      taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 23,
      taxAmount: Number(data.taxAmount) || 0,
      totalWithTax: Number(data.totalWithTax) || 0,
      validityDays: Number(data.validityDays) || 15,
      deliveryTerm: (data.deliveryTerm || 'A combinar').trim(),
      paymentConditions: (data.paymentConditions || '50% na adjudicação').trim(),
      workInChargeOf: (data.workInChargeOf || 'Enat Energias').trim(),
      installationWarranty: (data.installationWarranty || '2 anos').trim(),
      equipmentWarranty: (data.equipmentWarranty || 'Consultar ficha técnica do equipamento').trim(),
      notes: (data.notes || '').trim(),
      status: data.status || 'rascunho',
      obraId: data.obraId || undefined,
      sentAt: data.sentAt || undefined,
      sentCount: Number(data.sentCount) || 0,
      lastSentMethod: data.lastSentMethod || undefined,
      sentHistory: Array.isArray(data.sentHistory) ? data.sentHistory : [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setOrcamentos((prev) => [newOrcamento, ...prev]);

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...newOrcamento,
          ownerId: currentUser.uid,
        });
        setDoc(doc(db, 'orcamentos', newId), payload).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `orcamentos/${newId}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orcamentos/${newId}`);
      }
    }

    return newId;
  };

  const updateOrcamento = (id: string, updates: Partial<Orcamento>) => {
    const nowIso = new Date().toISOString();
    setOrcamentos((prev) =>
      prev.map((orc) => (orc.id === id ? { ...orc, ...updates, updatedAt: nowIso } : orc))
    );

    if (currentUser) {
      try {
        const payload = cleanFirestorePayload({
          ...updates,
          updatedAt: nowIso,
        });
        updateDoc(doc(db, 'orcamentos', id), payload).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `orcamentos/${id}`);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `orcamentos/${id}`);
      }
    }
  };

  const deleteOrcamento = async (id: string) => {
    setOrcamentos((prev) => prev.filter((orc) => orc.id !== id));

    if (currentUser) {
      deleteDoc(doc(db, 'orcamentos', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `orcamentos/${id}`);
      });
    }
  };

  const deleteAllOrcamentos = async () => {
    setOrcamentos([]);
    try {
      localStorage.setItem(STORAGE_KEYS.ORCAMENTOS, '[]');
    } catch (e) {
      console.warn(e);
    }

    if (currentUser) {
      const uid = currentUser.uid;
      try {
        const q = query(collection(db, 'orcamentos'), where('ownerId', '==', uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Error deleting all orcamentos in Firestore:', err);
      }
    }
  };

  const updateSheetsConfig = (updates: Partial<GoogleSheetsConfig>) => {
    setSheetsConfig((prev) => ({ ...prev, ...updates }));
  };

  const triggerGoogleSheetsLiveSync = async (): Promise<{ success: boolean; message: string }> => {
    if (!sheetsConfig.webhookUrl) {
      return { success: false, message: 'URL do Google Sheets Webhook não configurado.' };
    }

    setIsSyncingSheets(true);
    setLastSyncMessage('A sincronizar abas com o Google Sheets...');

    try {
      const payload = buildSyncDataPayload(obras, invoices, labor, manualExpenses, clientPayments);
      const res = await fetch('/api/sync/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: sheetsConfig.webhookUrl,
          payload: {
            timestamp: new Date().toISOString(),
            spreadsheetName: sheetsConfig.spreadsheetName,
            ...payload,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const timeNow = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        const successMsg = `Sincronizado às ${timeNow} com o Google Sheets!`;
        setSheetsConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
        setLastSyncMessage(successMsg);
        setIsSyncingSheets(false);
        return { success: true, message: successMsg };
      } else {
        throw new Error(data.error || 'Falha na resposta do servidor.');
      }
    } catch (err: any) {
      const errorMsg = `Erro na sincronização: ${err.message || 'Verifique o URL da Google App Script.'}`;
      setLastSyncMessage(errorMsg);
      setIsSyncingSheets(false);
      return { success: false, message: errorMsg };
    }
  };

  // Automated background sync with Google Sheets on any data mutation
  const hasInitializedDataRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedDataRef.current) {
      hasInitializedDataRef.current = true;
      return;
    }

    if (!sheetsConfig.autoSync || !sheetsConfig.webhookUrl) {
      return;
    }

    const timer = setTimeout(() => {
      triggerGoogleSheetsLiveSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [obras, invoices, labor, manualExpenses, clientPayments, sheetsConfig.autoSync, sheetsConfig.webhookUrl]);

  // Automated Backup: Periodically saves snapshot of all data to localStorage
  useEffect(() => {
    if (obras.length > 0 || invoices.length > 0) {
      const timer = setTimeout(() => {
        try {
          const payload = buildBackupPayload(obras, invoices, labor, manualExpenses, clientPayments, sheetsConfig);
          saveAutoBackupSnapshot(payload);
        } catch (e) {
          console.warn('Auto backup snapshot failed:', e);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [obras, invoices, labor, manualExpenses, clientPayments, sheetsConfig]);

  const downloadFullBackup = () => {
    const payload = buildBackupPayload(obras, invoices, labor, manualExpenses, clientPayments, sheetsConfig);
    downloadBackupJSON(payload);
  };

  const restoreBackupData = async (backupData: any, mode: 'merge' | 'replace'): Promise<{ success: boolean; message: string }> => {
    try {
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Formato de dados de cópia de segurança inválido.');
      }

      const importedObras: Obra[] = Array.isArray(backupData.obras) ? backupData.obras : [];
      const importedInvoices: Invoice[] = Array.isArray(backupData.invoices) ? backupData.invoices : [];
      const importedLabor: LaborRecord[] = Array.isArray(backupData.labor) ? backupData.labor : [];
      const importedExpenses: ManualExpense[] = Array.isArray(backupData.manualExpenses) ? backupData.manualExpenses : [];
      const importedPayments: ClientPayment[] = Array.isArray(backupData.clientPayments) ? backupData.clientPayments : [];

      if (mode === 'replace') {
        setObras(importedObras);
        setInvoices(importedInvoices);
        setLabor(importedLabor);
        setManualExpenses(importedExpenses);
        setClientPayments(importedPayments);
        if (backupData.sheetsConfig) {
          setSheetsConfig(backupData.sheetsConfig);
        }
      } else {
        setObras((prev) => {
          const map = new Map(prev.map((o) => [o.id, o]));
          importedObras.forEach((o) => map.set(o.id, o));
          return Array.from(map.values());
        });
        setInvoices((prev) => {
          const map = new Map(prev.map((i) => [i.id, i]));
          importedInvoices.forEach((i) => map.set(i.id, i));
          return Array.from(map.values());
        });
        setLabor((prev) => {
          const map = new Map(prev.map((l) => [l.id, l]));
          importedLabor.forEach((l) => map.set(l.id, l));
          return Array.from(map.values());
        });
        setManualExpenses((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          importedExpenses.forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        });
        setClientPayments((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          importedPayments.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }

      // If signed in, sync newly imported items to Firestore
      if (currentUser) {
        const uid = currentUser.uid;
        for (const o of importedObras) {
          await setDoc(doc(db, 'obras', o.id), cleanFirestorePayload({ ...o, ownerId: uid }));
        }
        for (const i of importedInvoices) {
          await setDoc(doc(db, 'invoices', i.id), cleanFirestorePayload({ ...i, ownerId: uid }));
        }
        for (const l of importedLabor) {
          await setDoc(doc(db, 'labor', l.id), cleanFirestorePayload({ ...l, ownerId: uid }));
        }
        for (const e of importedExpenses) {
          await setDoc(doc(db, 'manual_expenses', e.id), cleanFirestorePayload({ ...e, ownerId: uid }));
        }
        for (const p of importedPayments) {
          await setDoc(doc(db, 'client_payments', p.id), cleanFirestorePayload({ ...p, ownerId: uid }));
        }
      }

      return {
        success: true,
        message: `Backup restaurado com sucesso (${importedObras.length} obras, ${importedInvoices.length} faturas, ${importedLabor.length} registos de mão de obra).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao restaurar dados: ${err.message || 'Ficheiro corrompido'}`,
      };
    }
  };

  const deleteAllInvoices = async () => {
    setInvoices([]);
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, '[]');
    } catch (e) {
      console.warn(e);
    }

    if (currentUser) {
      const uid = currentUser.uid;
      try {
        const invQ = query(collection(db, 'invoices'), where('ownerId', '==', uid));
        const snap = await getDocs(invQ);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Error deleting all invoices in Firestore:', err);
      }
    }
  };

  const importExcelData = async (
    parsed: ParsedExcelResult,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const now = Date.now();
      const nowIso = new Date().toISOString();
      const obraMapByName = new Map<string, string>();

      let nextObras: Obra[] = mode === 'replace' ? [] : [...obras];
      nextObras.forEach((o) => obraMapByName.set(o.name.trim().toLowerCase(), o.id));

      // 1. Process Obras from Excel
      parsed.obras.forEach((rawObra, idx) => {
        const lower = rawObra.name.trim().toLowerCase();
        let existingId = obraMapByName.get(lower);
        if (!existingId) {
          existingId = `obra-excel-${now}-${idx}`;
          const newOb: Obra = {
            id: existingId,
            name: rawObra.name.trim(),
            client: rawObra.client.trim() || 'Cliente Geral',
            address: 'Portugal',
            status: rawObra.status || 'em_curso',
            budget: rawObra.budget || 0,
            startDate: nowIso.split('T')[0],
            createdAt: nowIso,
            notes: rawObra.notes || 'Importado de Excel',
          };
          nextObras.push(newOb);
          obraMapByName.set(lower, existingId);
        }
      });

      if (nextObras.length === 0) {
        const defaultOb: Obra = {
          id: `obra-excel-${now}-default`,
          name: 'Obra Geral (Excel)',
          client: 'Cliente Geral',
          address: 'Portugal',
          status: 'em_curso',
          budget: 0,
          startDate: nowIso.split('T')[0],
          createdAt: nowIso,
        };
        nextObras.push(defaultOb);
        obraMapByName.set('geral', defaultOb.id);
      }

      const defaultObraId = nextObras[0].id;

      // 2. Process Invoices from Excel
      const nextInvoices: Invoice[] = mode === 'replace' ? [] : [...invoices];
      parsed.invoices.forEach((rawInv, invIdx) => {
        const matchedObraId = obraMapByName.get((rawInv.obraId || '').trim().toLowerCase()) || defaultObraId;
        const newInvId = `inv-excel-${now}-${invIdx}`;
        const newInvoice: Invoice = {
          id: newInvId,
          obraId: matchedObraId,
          topic: rawInv.topic || 'Geral / Outros',
          storeName: rawInv.storeName || 'Loja / Fornecedor',
          invoiceNumber: rawInv.invoiceNumber || `FT-${now.toString().slice(-6)}-${invIdx + 1}`,
          date: rawInv.date || nowIso.split('T')[0],
          taxId: rawInv.taxId || '',
          subtotalWithoutTax: rawInv.subtotalWithoutTax || 0,
          taxAmount: rawInv.taxAmount || 0,
          totalWithTax: rawInv.totalWithTax || 0,
          roundAdjustmentAmount: 0,
          globalDiscountAmount: 0,
          notes: rawInv.notes || 'Importado de Excel',
          createdAt: nowIso,
          items: (rawInv.items || []).map((it, itIdx) => ({
            ...it,
            id: `item-excel-${now}-${invIdx}-${itIdx}`,
            invoiceId: newInvId,
            obraId: matchedObraId,
          })),
        };
        nextInvoices.push(newInvoice);
      });

      // 3. Process Labor from Excel
      const nextLabor: LaborRecord[] = mode === 'replace' ? [] : [...labor];
      parsed.labor.forEach((rawLab, labIdx) => {
        const matchedObraId = obraMapByName.get((rawLab.obraId || '').trim().toLowerCase()) || defaultObraId;
        nextLabor.push({
          id: `labor-excel-${now}-${labIdx}`,
          obraId: matchedObraId,
          workerName: rawLab.workerName || 'Técnico',
          date: rawLab.date || nowIso.split('T')[0],
          hoursOrDays: rawLab.hoursOrDays || 1,
          unitType: rawLab.unitType || 'horas',
          costRate: rawLab.costRate || 15,
          totalCost: rawLab.totalCost || 15,
          description: rawLab.description || 'Mão de obra',
          createdAt: nowIso,
        });
      });

      // 4. Process Expenses from Excel
      const nextExpenses: ManualExpense[] = mode === 'replace' ? [] : [...manualExpenses];
      parsed.manualExpenses.forEach((rawExp, expIdx) => {
        const matchedObraId = obraMapByName.get((rawExp.obraId || '').trim().toLowerCase()) || defaultObraId;
        nextExpenses.push({
          id: `exp-excel-${now}-${expIdx}`,
          obraId: matchedObraId,
          date: rawExp.date || nowIso.split('T')[0],
          description: rawExp.description || 'Despesa',
          category: rawExp.category || 'Outros',
          amount: rawExp.amount || 0,
          supplierOrPlace: rawExp.supplierOrPlace || '-',
          paymentMethod: rawExp.paymentMethod || 'dinheiro',
          notes: rawExp.notes || 'Importado de Excel',
          createdAt: nowIso,
        });
      });

      // 5. Process Payments from Excel
      const nextPayments: ClientPayment[] = mode === 'replace' ? [] : [...clientPayments];
      parsed.clientPayments.forEach((rawPay, payIdx) => {
        const matchedObraId = obraMapByName.get((rawPay.obraId || '').trim().toLowerCase()) || defaultObraId;
        nextPayments.push({
          id: `pay-excel-${now}-${payIdx}`,
          obraId: matchedObraId,
          date: rawPay.date || nowIso.split('T')[0],
          description: rawPay.description || 'Recebimento de Cliente',
          amount: rawPay.amount || 0,
          paymentMethod: rawPay.paymentMethod || 'transferencia',
          receiptNumber: rawPay.receiptNumber || '',
          notes: rawPay.notes || 'Importado de Excel',
          createdAt: nowIso,
        });
      });

      setObras(nextObras);
      setInvoices(nextInvoices);
      setLabor(nextLabor);
      setManualExpenses(nextExpenses);
      setClientPayments(nextPayments);

      try {
        localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(nextObras));
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(nextInvoices));
        localStorage.setItem(STORAGE_KEYS.LABOR, JSON.stringify(nextLabor));
        localStorage.setItem(STORAGE_KEYS.MANUAL_EXPENSES, JSON.stringify(nextExpenses));
        localStorage.setItem(STORAGE_KEYS.CLIENT_PAYMENTS, JSON.stringify(nextPayments));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }

      if (currentUser) {
        const uid = currentUser.uid;
        try {
          const batch = writeBatch(db);
          nextObras.forEach((o) => {
            batch.set(doc(db, 'obras', o.id), cleanFirestorePayload({ ...o, ownerId: uid }));
          });
          nextInvoices.forEach((i) => {
            batch.set(doc(db, 'invoices', i.id), cleanFirestorePayload({ ...i, ownerId: uid }));
          });
          nextLabor.forEach((l) => {
            batch.set(doc(db, 'labor', l.id), cleanFirestorePayload({ ...l, ownerId: uid }));
          });
          nextExpenses.forEach((e) => {
            batch.set(doc(db, 'manual_expenses', e.id), cleanFirestorePayload({ ...e, ownerId: uid }));
          });
          nextPayments.forEach((p) => {
            batch.set(doc(db, 'client_payments', p.id), cleanFirestorePayload({ ...p, ownerId: uid }));
          });
          await batch.commit();
        } catch (err) {
          console.warn('Firestore commit error:', err);
        }
      }

      const msg = `Ficheiro Excel importado com sucesso: ${parsed.summary.totalItems} artigos em ${parsed.summary.totalInvoices} faturas, ${parsed.summary.totalLabor} registos de mão de obra e ${parsed.summary.totalObras} obras!`;
      return { success: true, message: msg };
    } catch (err: any) {
      return { success: false, message: `Erro ao importar dados do Excel: ${err?.message || 'Ficheiro ilegível'}` };
    }
  };

  const clearAllData = async () => {
    // 1. Reset all local state
    setObras([]);
    setInvoices([]);
    setLabor([]);
    setManualExpenses([]);
    setClientPayments([]);
    setOrcamentos([]);
    setSelectedObraId(null);

    // 2. Clear all local storage and set flag so initial mock data is never re-loaded
    try {
      localStorage.setItem(STORAGE_KEYS.OBRAS, '[]');
      localStorage.setItem(STORAGE_KEYS.INVOICES, '[]');
      localStorage.setItem(STORAGE_KEYS.LABOR, '[]');
      localStorage.setItem(STORAGE_KEYS.MANUAL_EXPENSES, '[]');
      localStorage.setItem(STORAGE_KEYS.CLIENT_PAYMENTS, '[]');
      localStorage.setItem(STORAGE_KEYS.ORCAMENTOS, '[]');
      localStorage.setItem('enat_data_cleared_by_user', 'true');
    } catch (e) {
      console.warn(e);
    }

    // 3. Delete all user documents in Firestore
    if (currentUser) {
      const uid = currentUser.uid;
      const collectionsToWipe = ['obras', 'invoices', 'labor', 'manual_expenses', 'client_payments', 'orcamentos'];
      for (const colName of collectionsToWipe) {
        try {
          const colRef = collection(db, colName);
          const q = query(colRef, where('ownerId', '==', uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
        } catch (err) {
          console.warn(`Error wiping collection ${colName} from Firestore:`, err);
        }
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        obras,
        invoices,
        labor,
        manualExpenses,
        clientPayments,
        orcamentos,
        allProducts,
        selectedObraId,
        activeTab,
        isDarkMode,
        themeMode,
        sheetsConfig,
        selectedProductForModal,
        isScannerOpen,
        scannerTargetObraId,
        isSyncingSheets,
        lastSyncMessage,
        currentUser,
        isAuthLoading,
        isCloudSynced,
        signInWithGoogle,
        logout,
        setActiveTab,
        setSelectedObraId,
        toggleDarkMode,
        setThemeMode,
        openScanner,
        closeScanner,
        openProductModal,
        closeProductModal,
        isNotificationModalOpen,
        openNotificationModal,
        closeNotificationModal,
        addObra,
        updateObra,
        updateObraManutencao,
        updateObraEquipamentos,
        deleteObra,
        addInvoice,
        addMultipleInvoices,
        updateInvoice,
        deleteInvoice,
        deleteAllInvoices,
        checkDuplicateInvoice: checkDuplicateInvoiceForObra,
        addLaborRecord,
        deleteLaborRecord,
        addManualExpense,
        updateManualExpense,
        deleteManualExpense,
        addClientPayment,
        deleteClientPayment,
        addOrcamento,
        updateOrcamento,
        deleteOrcamento,
        deleteAllOrcamentos,
        updateSheetsConfig,
        triggerGoogleSheetsLiveSync,
        downloadFullBackup,
        restoreBackupData,
        importExcelData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
