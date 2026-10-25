/**
 * Backup and Export Service for All Obras, Invoices, Labor and Financial Records
 * Supports full JSON export, automated backups, and Google Drive integration.
 */

import { Obra, Invoice, LaborRecord, ManualExpense, ClientPayment, GoogleSheetsConfig } from '../types';

export interface AppBackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  metadata: {
    totalObras: number;
    totalInvoices: number;
    totalLaborRecords: number;
    totalManualExpenses: number;
    totalClientPayments: number;
    totalEstimatedBudget: number;
  };
  data: {
    obras: Obra[];
    invoices: Invoice[];
    labor: LaborRecord[];
    manualExpenses: ManualExpense[];
    clientPayments: ClientPayment[];
    sheetsConfig?: GoogleSheetsConfig;
  };
}

/**
 * Compiles all application state into a clean, portable backup JSON object
 */
export function buildBackupPayload(
  obras: Obra[],
  invoices: Invoice[],
  labor: LaborRecord[],
  manualExpenses: ManualExpense[],
  clientPayments: ClientPayment[],
  sheetsConfig?: GoogleSheetsConfig
): AppBackupPayload {
  const totalBudget = obras.reduce((acc, o) => acc + (Number(o.budget) || 0), 0);

  return {
    app: 'Enat - Gestor de Custos de Obras & Materiais',
    version: 2,
    exportedAt: new Date().toISOString(),
    metadata: {
      totalObras: obras.length,
      totalInvoices: invoices.length,
      totalLaborRecords: labor.length,
      totalManualExpenses: manualExpenses.length,
      totalClientPayments: clientPayments.length,
      totalEstimatedBudget: Number(totalBudget.toFixed(2)),
    },
    data: {
      obras,
      invoices,
      labor,
      manualExpenses,
      clientPayments,
      sheetsConfig,
    },
  };
}

/**
 * Downloads the JSON backup file directly in the browser
 */
export function downloadBackupJSON(payload: AppBackupPayload, filename?: string) {
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `enat_backup_obras_${dateStr}.json`;
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Record timestamp of manual backup
  try {
    localStorage.setItem('enat_last_backup_download', new Date().toISOString());
  } catch (e) {
    console.warn('Could not save last backup timestamp:', e);
  }
}

/**
 * Saves automatic backup snapshot in persistent localStorage
 */
export function saveAutoBackupSnapshot(payload: AppBackupPayload): void {
  try {
    localStorage.setItem('enat_auto_backup_snapshot', JSON.stringify(payload));
    localStorage.setItem('enat_auto_backup_timestamp', new Date().toISOString());
  } catch (err) {
    console.warn('Local storage quota limit reached for auto-backup:', err);
  }
}

/**
 * Retrieves the latest auto-backup snapshot from localStorage
 */
export function getAutoBackupSnapshot(): { payload: AppBackupPayload | null; timestamp: string | null } {
  try {
    const raw = localStorage.getItem('enat_auto_backup_snapshot');
    const ts = localStorage.getItem('enat_auto_backup_timestamp');
    if (!raw) return { payload: null, timestamp: null };
    const payload = JSON.parse(raw) as AppBackupPayload;
    return { payload, timestamp: ts };
  } catch {
    return { payload: null, timestamp: null };
  }
}

/**
 * Validates and parses imported JSON string
 */
export function parseAndValidateBackupJSON(jsonStr: string): {
  isValid: boolean;
  error?: string;
  payload?: AppBackupPayload;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'O ficheiro não contém um objeto JSON válido.' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { isValid: false, error: 'Formato inválido: campo "data" não encontrado.' };
    }

    const { obras, invoices, labor } = parsed.data;
    if (!Array.isArray(obras) && !Array.isArray(invoices) && !Array.isArray(labor)) {
      return { isValid: false, error: 'O backup não contém tabelas reconhecidas de obras ou faturas.' };
    }

    return { isValid: true, payload: parsed as AppBackupPayload };
  } catch (e: any) {
    return { isValid: false, error: `Erro de leitura JSON: ${e.message}` };
  }
}
