import React, { useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  CalendarClock,
  Radio,
  ExternalLink,
  Info,
} from 'lucide-react';
import { APP_VERSION_INFO } from '../config/version';
import { useApp } from '../context/AppContext';

export const SystemStatusCard: React.FC = () => {
  const { setActiveTab, setSelectedObraId } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleForceUpdate = async () => {
    setIsRefreshing(true);
    setRefreshMessage('A limpar cache local e a carregar versão mais recente...');

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
    } catch (err) {
      console.warn('Erro ao limpar cache:', err);
    }

    setTimeout(() => {
      // Force navigation with cache-busting timestamp
      const url = new URL(window.location.origin);
      url.searchParams.set('t', Date.now().toString());
      window.location.href = url.toString();
    }, 600);
  };

  const handleOpenManutencoes = () => {
    setSelectedObraId(null);
    setActiveTab('manutencoes');
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 revolut-card revolut-shadow border border-black/5 dark:border-white/10 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
            <Radio className="w-5 h-5 stroke-[2.2]" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-black dark:text-white tracking-tight">
                Status do Sistema & Publicação
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                {APP_VERSION_INFO.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Confirmação em tempo real das versões e módulos propagados para este dispositivo
            </p>
          </div>
        </div>

        {/* Action Button: Force Refresh Cache */}
        <button
          onClick={handleForceUpdate}
          disabled={isRefreshing}
          className="shrink-0 flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white text-xs font-bold transition ios-press-active disabled:opacity-50"
          title="Forçar recarregamento sem cache"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          <span>{isRefreshing ? 'A atualizar...' : 'Forçar Atualização'}</span>
        </button>
      </div>

      {refreshMessage && (
        <div className="mt-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{refreshMessage}</span>
        </div>
      )}

      {/* Grid of Key Version Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
        {/* Version Badge */}
        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Versão da Aplicação
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-black text-black dark:text-white tracking-tight">
              {APP_VERSION_INFO.version}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              ({APP_VERSION_INFO.buildNumber})
            </span>
          </div>
        </div>

        {/* Build Date */}
        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            Última Compilação (Build)
          </span>
          <div className="mt-1">
            <span className="text-xs font-bold text-black dark:text-white">
              {APP_VERSION_INFO.buildDate}
            </span>
          </div>
        </div>

        {/* Manutenções Module Indicator */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-emerald-500" />
            Módulo Manutenções
          </span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Ativo na Navegação
            </span>
            <button
              onClick={handleOpenManutencoes}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Abrir
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick helper tip for users visiting the public URL */}
      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-start gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
        <p>
          Se estiver a aceder pelo telemóvel ou pelo link partilhado e não visualizar de imediato novos botões, clique em{' '}
          <strong className="text-black dark:text-white font-semibold">Forçar Atualização</strong>{' '}
          para forçar o navegador a descarregar o novo pacote de ficheiros.
        </p>
      </div>
    </div>
  );
};
