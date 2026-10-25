import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Code,
  Check,
  Table,
  Upload,
  HardDrive,
  ShieldCheck,
  FolderArchive,
  ArrowUpRight,
  FileUp,
  Layers,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportToMultiTabExcel, buildSyncDataPayload } from '../utils/excelExport';
import {
  buildBackupPayload,
  downloadBackupJSON,
  parseAndValidateBackupJSON,
  getAutoBackupSnapshot,
} from '../utils/backupService';
import { parseExcelWorkbook, ParsedExcelResult } from '../utils/excelImport';

export const GoogleSheetsSyncView: React.FC = () => {
  const {
    obras,
    invoices,
    labor,
    manualExpenses,
    clientPayments,
    sheetsConfig,
    updateSheetsConfig,
    triggerGoogleSheetsLiveSync,
    isSyncingSheets,
    lastSyncMessage,
    downloadFullBackup,
    restoreBackupData,
    importExcelData,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'resumo' | 'recebimentos' | 'despesas' | 'refrig' | 'eletric' | 'acessorios' | 'maodeobra' | 'materiais'>('resumo');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [showDriveInstructions, setShowDriveInstructions] = useState(false);

  // Excel File Import State
  const [excelFileResult, setExcelFileResult] = useState<ParsedExcelResult | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelImportMode, setExcelImportMode] = useState<'merge' | 'replace'>('merge');

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const autoBackup = getAutoBackupSnapshot();

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const validation = parseAndValidateBackupJSON(text);
        if (!validation.isValid || !validation.payload) {
          setFeedback({ type: 'error', message: validation.error || 'Ficheiro de backup JSON inválido.' });
          return;
        }

        const res = await restoreBackupData(validation.payload.data, restoreMode);
        setFeedback({
          type: res.success ? 'success' : 'error',
          message: res.message,
        });
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Erro ao processar ficheiro: ${err.message}` });
      } finally {
        if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExcelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setFeedback(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcelWorkbook(buffer, file.name);

      if (parsed.summary.totalItems === 0 && parsed.summary.totalLabor === 0 && parsed.summary.totalObras === 0) {
        setFeedback({
          type: 'error',
          message: 'Não foram detetadas tabelas de obras, faturas ou mão de obra legíveis neste ficheiro Excel.',
        });
      } else {
        setExcelFileResult(parsed);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao ler ficheiro Excel: ${err?.message || 'Formato não suportado'}`,
      });
    } finally {
      setIsParsingExcel(false);
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelFileResult) return;
    try {
      const res = await importExcelData(excelFileResult, excelImportMode);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setExcelFileResult(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha ao importar: ${err?.message || 'Erro inesperado'}`,
      });
    }
  };

  const handleExportToGoogleDrive = () => {
    downloadFullBackup();
    setShowDriveInstructions(true);
  };

  const syncData = buildSyncDataPayload(obras, invoices, labor, manualExpenses, clientPayments);

  const googleAppsScriptSnippet = `/**
 * Google Apps Script - Sincronização Automática Gestor de Obras & Custos
 * 1. Abra a sua folha Google Sheets no navegador.
 * 2. No menu de topo, clique em: Extensões > Apps Script.
 * 3. Apague o código existente, cole este código completo e clique em Guardar (ícone da disquete).
 * 4. Clique em: Implementar > Nova Implementação.
 * 5. Escolha o tipo "Aplicação Web".
 * 6. Defina:
 *    - Descrição: Sincronização Enat
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa (Anyone)
 * 7. Clique em Implementar, autorize os acessos da sua conta Google, copie o "URL da Aplicação Web" (terminado em /exec) e cole-o no campo de Webhook da aplicação!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Nenhum dado recebido no POST"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Atualiza automaticamente as 8 abas organizadas
    updateSheet(ss, "Resumo Geral", data.summaryRows);
    updateSheet(ss, "Recebimentos Cliente", data.paymentRows);
    updateSheet(ss, "Despesas s Fatura", data.expenseRows);
    updateSheet(ss, "Refrigeração", data.refrigRows);
    updateSheet(ss, "Material Elétrico", data.eletricRows);
    updateSheet(ss, "Acessórios", data.acessoriosRows);
    updateSheet(ss, "Mão de Obra", data.laborRows);
    updateSheet(ss, "Todos os Materiais", data.allMaterialRows);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Folha atualizada com sucesso!",
      syncedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSheet(ss, sheetName, rows) {
  if (!rows || rows.length === 0) return;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  var headers = Object.keys(rows[0]);
  sheet.appendRow(headers);
  var values = rows.map(function(r) {
    return headers.map(function(h) { 
      var val = r[h];
      return (val === undefined || val === null) ? "" : val; 
    });
  });
  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
  // Formatação com cabeçalho escuro profissional e colunas ajustadas
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  try {
    sheet.autoResizeColumns(1, headers.length);
  } catch (e) {}
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(googleAppsScriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadExcel = () => {
    exportToMultiTabExcel(
      obras,
      invoices,
      labor,
      manualExpenses,
      clientPayments,
      `Enat_App_Custos_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const isSpreadsheetLinkPasted =
    sheetsConfig.webhookUrl &&
    sheetsConfig.webhookUrl.includes('docs.google.com/spreadsheets') &&
    !sheetsConfig.webhookUrl.includes('script.google.com');

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
            Excel & Google Sheets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Sincronização em tempo real na nuvem e importação direta do seu ficheiro Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => excelFileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 ios-press-active"
            title="Importar dados do seu ficheiro Excel existente (.xlsx, .xls, .csv)"
          >
            <FileUp className="w-4 h-4" />
            <span>Importar Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20 ios-press-active"
          >
            <Download className="w-4 h-4" />
            <span>Descarregar .XLSX</span>
          </button>
          <button
            onClick={() => downloadFullBackup()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition shadow-md hover:opacity-90 ios-press-active"
            title="Descarregar cópia de segurança em formato JSON"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={jsonFileInputRef}
        accept=".json,application/json"
        onChange={handleJsonFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={excelFileInputRef}
        accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={handleExcelFileSelected}
        className="hidden"
      />

      {/* MODAL: PREVIEW & CONFIRM EXCEL IMPORT */}
      {excelFileResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#141418] border border-black/10 dark:border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black dark:text-white">
                    Importar Ficheiro Excel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono truncate max-w-[260px]">
                    {excelFileResult.fileName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExcelFileResult(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 flex items-center justify-center font-bold hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Summary statistics found in excel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                <div className="text-[11px] text-slate-400 font-bold">Obras</div>
                <div className="text-lg font-black text-black dark:text-white">
                  {excelFileResult.summary.totalObras}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                <div className="text-[11px] text-slate-400 font-bold">Faturas</div>
                <div className="text-lg font-black text-black dark:text-white">
                  {excelFileResult.summary.totalInvoices}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                <div className="text-[11px] text-slate-400 font-bold">Artigos</div>
                <div className="text-lg font-black text-black dark:text-white">
                  {excelFileResult.summary.totalItems}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                <div className="text-[11px] text-slate-400 font-bold">Mão de Obra</div>
                <div className="text-lg font-black text-black dark:text-white">
                  {excelFileResult.summary.totalLabor}
                </div>
              </div>
            </div>

            {/* Total value info */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Valor Total em Materiais detetado:
              </span>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                {excelFileResult.summary.totalValueMaterials.toFixed(2)} €
              </span>
            </div>

            {/* Abas encontradas */}
            <div className="text-xs space-y-1">
              <span className="text-slate-500 font-bold">Abas detetadas no seu ficheiro:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {excelFileResult.sheetsFound.map((name) => (
                  <span
                    key={name}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-neutral-800 text-[11px] font-mono text-black dark:text-white"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Import Mode Option */}
            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs">
              <span className="text-slate-500 font-bold">Modo de Importação:</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-black/5 dark:border-white/5 cursor-pointer bg-slate-50 dark:bg-neutral-900">
                  <input
                    type="radio"
                    name="excelMode"
                    value="merge"
                    checked={excelImportMode === 'merge'}
                    onChange={() => setExcelImportMode('merge')}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-black dark:text-white">Mesclar com dados existentes</span>
                    <p className="text-[11px] text-slate-400">
                      Mantém as suas faturas atuais e adiciona as novas do ficheiro Excel.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-500/20 cursor-pointer bg-rose-500/5">
                  <input
                    type="radio"
                    name="excelMode"
                    value="replace"
                    checked={excelImportMode === 'replace'}
                    onChange={() => setExcelImportMode('replace')}
                    className="text-rose-600"
                  />
                  <div>
                    <span className="font-bold text-rose-500">Substituir dados atuais</span>
                    <p className="text-[11px] text-slate-400">
                      Substitui todas as obras e faturas pelos dados deste ficheiro Excel.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExcelFileResult(null)}
                className="px-4 py-2.5 rounded-full border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcelImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 ios-press-active"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Carregar Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              : feedback.type === 'info'
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium leading-relaxed">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="font-bold underline hover:opacity-80 text-[11px] shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* CARD 1: LIVE CLOUD SYNC & WEBHOOK (GOOGLE SHEETS / EXCEL ON-THE-FLY) */}
      <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-black dark:text-white">
                  Sincronização em Tempo Real (Google Sheets / Excel)
                </h2>
                {sheetsConfig.autoSync && sheetsConfig.webhookUrl && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-Sync Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {sheetsConfig.lastSyncedAt
                  ? `Última sincronização com sucesso: ${new Date(sheetsConfig.lastSyncedAt).toLocaleString('pt-PT')}`
                  : 'Nenhuma sincronização efetuada ainda. Configure o Webhook abaixo.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => triggerGoogleSheetsLiveSync()}
              disabled={isSyncingSheets || !sheetsConfig.webhookUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 ios-press-active"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheets ? 'A Sincronizar...' : 'Sincronizar Agora'}</span>
            </button>
          </div>
        </div>

        {/* Sync message output */}
        {lastSyncMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
              lastSyncMessage.includes('Erro')
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}
          >
            {lastSyncMessage.includes('Erro') ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{lastSyncMessage}</span>
          </div>
        )}

        {/* Webhook Configuration Input */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-black dark:text-white">
                URL do Webhook do Google Apps Script (terminado em /exec):
              </label>
              <span className="text-[11px] text-slate-400">
                Permite sincronização sem pedir login manual
              </span>
            </div>

            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={sheetsConfig.webhookUrl}
              onChange={(e) => updateSheetsConfig({ webhookUrl: e.target.value.trim() })}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />

            {/* Smart detection warning if user pasted direct spreadsheet link */}
            {isSpreadsheetLinkPasted && (
              <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Atenção: Introduziu o link de visualização da folha (docs.google.com)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Para que a sua folha receba os dados automaticamente sempre que tira uma foto ou adiciona uma despesa, é necessário o URL do Webhook do Apps Script (terminado em <strong>/exec</strong>).
                  Basta copiar o código pronto abaixo no separador &quot;Código do Google Apps Script&quot; e seguir os 4 passos rápidos!
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSyncCheck"
                checked={sheetsConfig.autoSync}
                onChange={(e) => updateSheetsConfig({ autoSync: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="autoSyncCheck" className="text-xs text-slate-600 dark:text-neutral-300 font-medium cursor-pointer">
                Sincronização Automática contínua a cada alteração em obras, faturas e pagamentos
              </label>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              {obras.length} obras • {invoices.length} faturas • {labor.length} mão de obra
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: IMPORTAR DO MEU FICHEIRO EXCEL (.XLSX) */}
      <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-5 sm:p-6 space-y-4 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-black dark:text-white">
                  Importar do Meu Ficheiro Excel (.xlsx / .xls / .csv)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                  Deteção Automática
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Já tem um ficheiro Excel com faturas, materiais ou mão de obra? Carregue-o para carregar todos os dados na aplicação.
              </p>
            </div>
          </div>

          <button
            onClick={() => excelFileInputRef.current?.click()}
            disabled={isParsingExcel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20 ios-press-active self-start sm:self-auto"
          >
            <FileUp className="w-4 h-4" />
            <span>{isParsingExcel ? 'A Ler Ficheiro...' : 'Carregar Meu Ficheiro Excel'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 text-xs text-slate-500 dark:text-neutral-400 space-y-1">
          <div className="font-bold text-black dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Como funciona a importação inteligente:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            O leitor reconhece automaticamente colunas de <strong>Obra</strong>, <strong>Data</strong>, <strong>Nº Fatura</strong>, <strong>Fornecedor/Loja</strong>, <strong>Artigo/Produto</strong>, <strong>Quantidade</strong>, <strong>Preço</strong> e <strong>Total</strong>, classificando de imediato cada artigo na respetiva categoria (Canalização, Eletricidade, Acessórios, Máquinas).
          </p>
        </div>
      </div>

      {/* CARD 3: SCRIPT GUIDE & TUTORIAL */}
      <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-black dark:text-white">
              Código do Google Apps Script (Sincronização Automática)
            </h3>
          </div>
          <button
            onClick={copyScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:opacity-80 transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Crie ou abra a sua folha Google Sheets, clique em <strong>Extensões &gt; Apps Script</strong>, cole o código abaixo e clique em <strong>Implementar &gt; Nova Implementação &gt; Aplicação Web</strong> (com acesso: <em>Qualquer pessoa</em>). Copie o URL gerado para a caixa de Webhook acima.
        </p>

        <div className="rounded-2xl bg-black dark:bg-[#0A0A0C] text-slate-300 p-3.5 font-mono text-[11px] overflow-x-auto max-h-48 border border-white/10">
          <pre>{googleAppsScriptSnippet}</pre>
        </div>
      </div>

      {/* CARD 4: BACKUP COMPLETO & GOOGLE DRIVE */}
      <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-black dark:text-white">
                  Cópia de Segurança & Google Drive (JSON)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Auto-Backup Ativo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                {autoBackup.timestamp
                  ? `Instantâneo local mais recente: ${new Date(autoBackup.timestamp).toLocaleString('pt-PT')}`
                  : 'Instantâneo automático gerado a cada alteração em obras, faturas e pagamentos.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportToGoogleDrive}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 ios-press-active"
            >
              <span>Guardar no Google Drive</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => downloadFullBackup()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-neutral-800 text-black dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-neutral-700 transition ios-press-active"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descarregar JSON</span>
            </button>

            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 text-black dark:text-white text-xs font-bold hover:bg-slate-50 dark:hover:bg-neutral-800 transition ios-press-active"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar Backup JSON</span>
            </button>
          </div>
        </div>

        {showDriveInstructions && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" />
                Como guardar no seu Google Drive
              </span>
              <button
                onClick={() => setShowDriveInstructions(false)}
                className="text-blue-500 hover:text-blue-700 font-bold"
              >
                ✕
              </button>
            </div>
            <ol className="list-decimal list-inside text-slate-600 dark:text-slate-300 space-y-1 text-[11px]">
              <li>O seu ficheiro <strong>.json</strong> foi descarregado para a pasta de transferências do seu dispositivo.</li>
              <li>Clique no botão abaixo para abrir o seu Google Drive numa nova aba.</li>
              <li>Arraste o ficheiro JSON descarregado para a sua pasta ou clique em <strong>&quot;+ Novo&quot; &gt; &quot;Carregar ficheiro&quot;</strong>.</li>
            </ol>
            <div className="pt-1">
              <a
                href="https://drive.google.com/drive/my-drive"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm transition"
              >
                <span>Abrir Google Drive</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* CARD 5: PREVIEW DAS ABAS */}
      <div className="rounded-3xl revolut-card revolut-shadow border border-black/5 dark:border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-black dark:text-white">
              Pré-Visualização das Abas Exportadas
            </h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActivePreviewTab('resumo')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'resumo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Resumo Geral ({syncData.summaryRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('recebimentos')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'recebimentos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Recebimentos ({syncData.paymentRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('despesas')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'despesas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Despesas s/ Fatura ({syncData.expenseRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('refrig')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'refrig'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Refrigeração ({syncData.refrigRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('eletric')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'eletric'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Material Elétrico ({syncData.eletricRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('acessorios')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'acessorios'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Acessórios ({syncData.acessoriosRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('maodeobra')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'maodeobra'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Mão de Obra ({syncData.laborRows.length})
            </button>
            <button
              onClick={() => setActivePreviewTab('materiais')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activePreviewTab === 'materiais'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Todos os Materiais ({syncData.allMaterialRows.length})
            </button>
          </div>
        </div>

        {/* Tab Content Table */}
        <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/5 max-h-80 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 sticky top-0 border-b border-black/5 dark:border-white/5">
              <tr>
                {activePreviewTab === 'resumo' && (
                  <>
                    <th className="p-3">Obra</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Orçamento Previsto</th>
                    <th className="p-3 text-right">Recebido Cliente</th>
                    <th className="p-3 text-right">Total Gasto</th>
                    <th className="p-3 text-right">Balanço</th>
                  </>
                )}
                {activePreviewTab === 'recebimentos' && (
                  <>
                    <th className="p-3">Obra</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Método</th>
                    <th className="p-3 text-right">Valor</th>
                  </>
                )}
                {activePreviewTab === 'despesas' && (
                  <>
                    <th className="p-3">Obra</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3 text-right">Valor</th>
                  </>
                )}
                {['refrig', 'eletric', 'acessorios', 'materiais'].includes(activePreviewTab) && (
                  <>
                    <th className="p-3">Obra</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Nº Fatura</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Preço Pago (c/IVA)</th>
                    <th className="p-3 text-right">Total (c/IVA)</th>
                  </>
                )}
                {activePreviewTab === 'maodeobra' && (
                  <>
                    <th className="p-3">Obra</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Trabalhador</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Tempo</th>
                    <th className="p-3 text-right">Taxa Unitária</th>
                    <th className="p-3 text-right">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {activePreviewTab === 'resumo' &&
                syncData.summaryRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-900/50">
                    <td className="p-3 font-bold text-black dark:text-white">{r['Nome da Obra']}</td>
                    <td className="p-3 text-slate-500">{r.Cliente}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                        {r.Estado}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{r['Orçamento Previsto (€)'].toFixed(2)} €</td>
                    <td className="p-3 text-right font-mono text-emerald-500">{r['Total Recebido Cliente (€)'].toFixed(2)} €</td>
                    <td className="p-3 text-right font-mono text-rose-500">{r['Total Real Gasto (€)'].toFixed(2)} €</td>
                    <td className="p-3 text-right font-mono font-bold text-black dark:text-white">
                      {r['Balanço Cashflow (€)'].toFixed(2)} €
                    </td>
                  </tr>
                ))}

              {activePreviewTab === 'recebimentos' &&
                syncData.paymentRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-900/50">
                    <td className="p-3 font-bold text-black dark:text-white">{r.Obra}</td>
                    <td className="p-3 font-mono text-slate-500">{r.Data}</td>
                    <td className="p-3 text-slate-700 dark:text-neutral-300">{r.Descrição}</td>
                    <td className="p-3 text-slate-500">{r['Método Pagamento']}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-500">{r['Valor Recebido (€)'].toFixed(2)} €</td>
                  </tr>
                ))}

              {activePreviewTab === 'despesas' &&
                syncData.expenseRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-900/50">
                    <td className="p-3 font-bold text-black dark:text-white">{r.Obra}</td>
                    <td className="p-3 font-mono text-slate-500">{r.Data}</td>
                    <td className="p-3 text-slate-700 dark:text-neutral-300">{r.Descrição}</td>
                    <td className="p-3 text-slate-500">{r.Categoria}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-500">{r['Valor (€)'].toFixed(2)} €</td>
                  </tr>
                ))}

              {['refrig', 'eletric', 'acessorios', 'materiais'].includes(activePreviewTab) &&
                (activePreviewTab === 'refrig'
                  ? syncData.refrigRows
                  : activePreviewTab === 'eletric'
                  ? syncData.eletricRows
                  : activePreviewTab === 'acessorios'
                  ? syncData.acessoriosRows
                  : syncData.allMaterialRows
                ).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-900/50">
                    <td className="p-3 font-medium text-black dark:text-white">{r.Obra}</td>
                    <td className="p-3 font-mono text-slate-500">{r.Data}</td>
                    <td className="p-3 font-mono text-slate-500">{r['Nº Fatura']}</td>
                    <td className="p-3 text-slate-500">{r['Loja / Fornecedor']}</td>
                    <td className="p-3 font-bold text-black dark:text-white">{r['Produto / Item']}</td>
                    <td className="p-3 text-right font-mono">{r.Qtd} {r.Unidade}</td>
                    <td className="p-3 text-right font-mono">{r['Preço Pago (c/IVA) €'].toFixed(2)} €</td>
                    <td className="p-3 text-right font-mono font-bold text-black dark:text-white">
                      {r['Total (c/IVA) €'].toFixed(2)} €
                    </td>
                  </tr>
                ))}

              {activePreviewTab === 'maodeobra' &&
                syncData.laborRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-neutral-900/50">
                    <td className="p-3 font-bold text-black dark:text-white">{r.Obra}</td>
                    <td className="p-3 font-mono text-slate-500">{r.Data}</td>
                    <td className="p-3 font-medium text-black dark:text-white">{r['Trabalhador / Função']}</td>
                    <td className="p-3 text-slate-500">{r.Descrição}</td>
                    <td className="p-3 text-right font-mono">{r['Qtd Tempo']} {r['Unidade Tempo']}</td>
                    <td className="p-3 text-right font-mono">{r['Valor Unitário (€)'].toFixed(2)} €</td>
                    <td className="p-3 text-right font-mono font-bold text-black dark:text-white">
                      {r['Total Mão de Obra (€)'].toFixed(2)} €
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
