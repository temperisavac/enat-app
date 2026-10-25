import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Calculator,
  Package,
  FileSpreadsheet,
  Camera,
  Sun,
  Moon,
  Laptop,
  Building2,
  Cloud,
  LogOut,
  LogIn,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MaterialSearchBar } from './MaterialSearchBar';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setSelectedObraId,
    selectedObraId,
    isDarkMode,
    themeMode,
    toggleDarkMode,
    openScanner,
    currentUser,
    isCloudSynced,
    signInWithGoogle,
    logout,
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleNavClick = (tabId: 'dashboard' | 'obras' | 'faturas' | 'orcamentos' | 'materiais' | 'sheets' | 'manutencoes') => {
    setSelectedObraId(null);
    setActiveTab(tabId);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Visão Geral', shortLabel: 'Geral', icon: LayoutDashboard },
    { id: 'obras' as const, label: 'Pastas de Obras', shortLabel: 'Obras', icon: FolderKanban },
    { id: 'faturas' as const, label: 'Faturas', shortLabel: 'Faturas', icon: Receipt },
    { id: 'orcamentos' as const, label: 'Orçamentos', shortLabel: 'Orçamentos', icon: Calculator },
    { id: 'manutencoes' as const, label: 'Manutenções', shortLabel: 'Manutenções', icon: CalendarClock },
    { id: 'materiais' as const, label: 'Consulta Preços', shortLabel: 'Preços', icon: Package },
    { id: 'sheets' as const, label: 'Sheets & Excel', shortLabel: 'Sheets', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Desktop Revolut-Style Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 revolut-card border-r border-black/5 dark:border-white/10 p-5 z-50 select-none bg-white/95 dark:bg-[#0A0A0C]/95 backdrop-blur-xl">
        {/* Brand Header */}
        <div
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-3 px-2 py-1 mb-6 cursor-pointer group"
        >
          <div className="h-11 px-3 rounded-2xl shadow-sm shrink-0 border border-black/10 dark:border-white/10 bg-white flex items-center justify-center">
            <img
              src="/enat-logo.png?v=4"
              alt="Logótipo Enat"
              style={{ height: '28px', width: 'auto', display: 'block' }}
              className="h-7 w-auto object-contain shrink-0"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight text-black dark:text-white leading-tight truncate group-hover:text-emerald-500 transition-colors">
              Enat app
            </h1>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase block">
              Custos & Obras
            </span>
          </div>
        </div>

        {/* Quick Action: Digitalizar Fatura */}
        <button
          onClick={() => openScanner()}
          className="w-full mb-6 py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition ios-press-active"
        >
          <Camera className="w-4 h-4 stroke-[2.2]" />
          <span>Digitalizar Faturas (IA)</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedObraId;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                    : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-black' : 'text-slate-400 dark:text-neutral-500'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Cloud Sync & User Profile Card (Desktop) */}
        <div className="pt-3 border-t border-black/5 dark:border-white/10 mb-3">
          {currentUser ? (
            <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Utilizador'}
                    className="w-7 h-7 rounded-full shrink-0 border border-black/10 dark:border-white/10 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider truncate">
                      Nuvem Ativa
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-black dark:text-white truncate">
                    {currentUser.displayName || currentUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                title="Terminar Sessão"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="w-full py-2 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20"
            >
              <Cloud className="w-4 h-4" />
              <span>Sincronizar (Google)</span>
            </button>
          )}
        </div>

        {/* Bottom Theme Switcher with System Sync */}
        <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium block">Tema</span>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
              {themeMode === 'system' ? 'Automático (SO)' : isDarkMode ? 'Escuro (OLED)' : 'Claro'}
            </span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition"
            title="Alternar Tema (Auto / Escuro / Claro)"
          >
            {themeMode === 'system' ? (
              <Laptop className="w-4 h-4 text-blue-500" />
            ) : isDarkMode ? (
              <Moon className="w-4 h-4 text-blue-500" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>
      </aside>

      {/* Top Bar for Desktop & Mobile - Never overlaps sidebar */}
      <header className="sticky top-0 z-50 w-full md:ml-64 md:w-[calc(100%-16rem)] border-b border-black/5 dark:border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 transition-colors bg-white/95 dark:bg-[#000000]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Logo on Mobile (and desktop compact) */}
            <div
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <div className="h-9 px-2.5 rounded-xl shadow-sm border border-black/10 dark:border-white/10 bg-white flex items-center justify-center">
                <img
                  src="/enat-logo.png?v=4"
                  alt="Logótipo Enat"
                  style={{ height: '22px', width: 'auto', display: 'block' }}
                  className="h-[22px] w-auto object-contain shrink-0"
                />
              </div>
              <div className="hidden sm:block md:hidden">
                <h1 className="text-xs font-black tracking-tight text-black dark:text-white leading-tight">
                  Enat app
                </h1>
              </div>
            </div>

            {/* Autocomplete Search Bar Component */}
            <div className="flex-1 min-w-0 max-w-xl">
              <MaterialSearchBar />
            </div>

            {/* User & Theme controls on mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Google Sync Button on Mobile */}
              {currentUser ? (
                <button
                  onClick={logout}
                  className="md:hidden flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-bold"
                  title={`Sessão iniciada como ${currentUser.email}. Toque para sair.`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate max-w-[70px] text-[11px]">
                    {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Conta'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="md:hidden py-1.5 px-2.5 rounded-xl bg-blue-600 text-white flex items-center gap-1 text-xs font-bold shadow-md shadow-blue-500/25"
                  title="Sincronizar com Google"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Entrar</span>
                </button>
              )}

              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 transition"
                title="Alternar Tema"
              >
                {themeMode === 'system' ? (
                  <Laptop className="w-4 h-4 text-blue-500" />
                ) : isDarkMode ? (
                  <Moon className="w-4 h-4 text-blue-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Nav Pills Row - Accessible on Mobile & Desktop */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 -mx-1 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !selectedObraId;
              return (
                <button
                  key={`top-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                      : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white dark:text-black' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile iOS Floating Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 revolut-glass-nav pb-safe pt-2 px-2 shadow-2xl border-t border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between gap-0.5 max-w-md mx-auto relative overflow-x-auto no-scrollbar py-0.5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedObraId;
            const isCenterGap = index === 3;

            return (
              <React.Fragment key={item.id}>
                {isCenterGap && (
                  <button
                    onClick={() => openScanner()}
                    className="shrink-0 -mt-5 w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-white dark:border-black ios-press-active transition-transform"
                    title="Digitalizar Fatura"
                  >
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                  </button>
                )}

                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`shrink-0 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all min-w-[46px] ${
                    isActive
                      ? 'text-blue-500 font-bold'
                      : 'text-slate-500 dark:text-neutral-400'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span className="text-[9px] mt-0.5 tracking-tight truncate max-w-[50px]">
                    {item.shortLabel}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </>
  );
};
