import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Send,
  Share2,
  Smartphone,
  Calendar,
  Check,
  RefreshCw,
  Flame,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  isIOS,
  isStandalonePWA,
  isPushSupported,
  getNotificationPermission,
  getSavedPreferences,
  savePreferences,
  subscribeToPushNotifications,
  sendTestPushNotification,
  triggerBudgetAlertNotification,
  triggerMonthlySummaryNotification,
  NotificationPreferences,
} from '../utils/pushNotificationService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { obras, invoices, currentUser } = useApp();

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(getSavedPreferences);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const onIOS = isIOS();
  const isStandalone = isStandalonePWA();
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setPreferences(getSavedPreferences());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    savePreferences(updated);
  };

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setFeedbackMessage(null);
    try {
      const res = await subscribeToPushNotifications(currentUser?.email || undefined, preferences);
      setPermission(getNotificationPermission());
      if (res.success) {
        setFeedbackMessage('Notificações Push ativadas com sucesso neste dispositivo!');
      } else {
        setFeedbackMessage(res.error || 'Não foi possível ativar as notificações.');
      }
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Erro ao ativar notificações.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    setFeedbackMessage(null);
    try {
      const res = await sendTestPushNotification();
      setFeedbackMessage(res.message);
    } catch (err: any) {
      setFeedbackMessage('Erro ao disparar notificação: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTriggerSimulatedBudgetAlert = async () => {
    // Pick the obra with highest expense or the first obra
    const targetObra = obras[0];
    if (targetObra) {
      const obraInvoices = invoices.filter((i) => i.obraId === targetObra.id);
      const totalGasto = obraInvoices.reduce((acc, i) => acc + i.totalWithTax, 0) || 12450;
      const budget = targetObra.budget || 14000;
      const percent = (totalGasto / budget) * 100;
      await triggerBudgetAlertNotification(
        targetObra.name,
        percent,
        budget,
        totalGasto,
        targetObra.id
      );
      setFeedbackMessage(`Alerta de orçamento disparado para "${targetObra.name}"!`);
    } else {
      await triggerBudgetAlertNotification(
        'Vivenda Cascais - Climatização',
        92.4,
        15000,
        13860
      );
      setFeedbackMessage('Alerta de teste de desvio de orçamento disparado!');
    }
  };

  const handleTriggerSimulatedMonthlySummary = async () => {
    const currentMonthName = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
    const totalGasto = invoices.reduce((acc, i) => acc + i.totalWithTax, 0);

    await triggerMonthlySummaryNotification(
      capitalizedMonth,
      totalGasto > 0 ? totalGasto : 8420.5,
      obras.length > 0 ? obras.length : 3,
      invoices.length > 0 ? invoices.length : 12,
      obras[0]?.name
    );
    setFeedbackMessage(`Resumo mensal de ${capitalizedMonth} enviado para o ecrã!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl revolut-card revolut-shadow border border-black/10 dark:border-white/10 p-6 sm:p-7 space-y-5 bg-white dark:bg-[#121216] animate-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-black dark:text-white">
                Notificações Push
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Alertas críticos de obras e resumos mensais de custos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* iOS Native Callout: If on iOS Safari outside PWA */}
        {onIOS && !isStandalone && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Smartphone className="w-4 h-4" />
              <span>Experiência Nativa no iOS (iPhone / iPad)</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-neutral-300 leading-relaxed">
              No iOS, a Apple exige que a aplicação esteja instalada no <strong>Ecrã Principal</strong> para receber notificações Push em segundo plano com o telemóvel bloqueado:
            </p>
            <ol className="text-[11px] text-slate-500 dark:text-neutral-400 space-y-1 list-decimal list-inside">
              <li>Toque no botão <strong>Partilhar</strong> do Safari (<Share2 className="w-3 h-3 inline text-blue-500 mx-0.5" />).</li>
              <li>Deslize e selecione <strong>Adicionar ao Ecrã Principal</strong>.</li>
              <li>Abra a app pelo ícone no ecrã para receber notificações nativas.</li>
            </ol>
          </div>
        )}

        {/* Status Card & Enable Button */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                permission === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-neutral-600'
              }`}
            />
            <div>
              <span className="text-xs font-bold text-black dark:text-white block">
                {permission === 'granted'
                  ? 'Notificações Ativas no Dispositivo'
                  : permission === 'denied'
                  ? 'Notificações Bloqueadas nas Definições'
                  : 'Notificações Pendentes de Permissão'}
              </span>
              <span className="text-[10px] text-slate-400">
                {permission === 'granted'
                  ? 'O dispositivo está pronto para receber alertas em segundo plano.'
                  : 'Ative para receber avisos de desvios orçamentais e resumos.'}
              </span>
            </div>
          </div>

          {permission !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm shadow-blue-500/25 active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
            >
              {isSubscribing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>A ativar...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Ativar Notificações</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full shrink-0 self-start sm:self-auto">
              ✓ Ativo
            </span>
          )}
        </div>

        {/* Notification Types (iOS Switches) */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Tipos de Alertas
          </span>

          {/* 1. Alertas Críticos de Orçamento */}
          <div
            onClick={() => handleTogglePreference('budgetAlerts')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-black dark:text-white block">
                  Alertas Críticos de Orçamento
                </span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Avisar quando uma obra atinge 80% ou 100% do valor orçado
                </span>
              </div>
            </div>

            {/* iOS Switch */}
            <div
              className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                preferences.budgetAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.budgetAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* 2. Resumos Mensais de Custos */}
          <div
            onClick={() => handleTogglePreference('monthlySummary')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-black dark:text-white block">
                  Resumos Mensais de Custos
                </span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Notificação no final do mês com o total de compras e mão de obra
                </span>
              </div>
            </div>

            {/* iOS Switch */}
            <div
              className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                preferences.monthlySummary ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.monthlySummary ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* 3. Confirmação de Faturas Registadas */}
          <div
            onClick={() => handleTogglePreference('invoiceAlerts')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-black dark:text-white block">
                  Processamento de Faturas
                </span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Confirmar leitura de faturas fotográficas de múltiplas páginas
                </span>
              </div>
            </div>

            {/* iOS Switch */}
            <div
              className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                preferences.invoiceAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.invoiceAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Testar Alertas no Ecrã
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handleTestNotification}
              disabled={isSendingTest}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-blue-500" />
              <span>Teste Push</span>
            </button>

            <button
              onClick={handleTriggerSimulatedBudgetAlert}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Alerta Crítico</span>
            </button>

            <button
              onClick={handleTriggerSimulatedMonthlySummary}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Resumo Mensal</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition shadow-sm hover:opacity-90"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
