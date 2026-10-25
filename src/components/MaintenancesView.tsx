import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Phone,
  Copy,
  Check,
  Search,
  Filter,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wind,
  Flame,
  Sun,
  Layers,
  Fan,
  RefreshCw,
  Waves,
  ThermometerSnowflake,
  ExternalLink,
  Plus,
  Play,
  Pause,
  ArrowRight,
  FolderKanban,
  Edit3,
  X,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Obra, EquipamentoInstalado, ObraManutencao } from '../types';
import {
  CATALOGO_EQUIPAMENTOS,
  LISTA_EQUIPAMENTOS_OPCOES,
  calcularDataLembrete,
  gerarTextoLembrete,
} from '../utils/manutencoes';

export const MaintenancesView: React.FC = () => {
  const { obras, updateObra, updateObraManutencao, updateObraEquipamentos, setSelectedObraId } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'vencidos_urgentes' | 'agendados' | 'sazonais' | 'concluidos' | 'pausados'>('todos');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('todos');

  // Modals state
  const [selectedObraForMessage, setSelectedObraForMessage] = useState<Obra | null>(null);
  const [customMessageDraft, setCustomMessageDraft] = useState<string>('');
  const [clientPhoneDraft, setClientPhoneDraft] = useState<string>('');
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);

  // Edit equipment / maintenance modal
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [editSelectedEquipments, setEditSelectedEquipments] = useState<EquipamentoInstalado[]>([]);
  const [editScheduledDate, setEditScheduledDate] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editState, setEditState] = useState<'agendado' | 'concluido' | 'pausado'>('agendado');
  const [editClientPhone, setEditClientPhone] = useState<string>('');

  // Quick setup modal for obra with no equipments
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [selectedQuickObraId, setSelectedQuickObraId] = useState<string>('');

  // Current Season Detection in Portugal
  const currentSeason = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    // Primavera: 21 Março - 20 Junho (foco em AC e Piscinas)
    if ((month === 3 && day >= 21) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
      return {
        tipo: 'primavera' as const,
        label: 'Primavera',
        foco: 'Ar Condicionado & Bombas de Calor de Piscina',
        descricao: 'Época ideal para higienização de filtros de AC e arranque técnico de piscinas antes dos picos de calor.',
        cor: 'emerald',
      };
    }
    // Verão: 21 Junho - 22 Setembro (foco em manutenção de emergência e AQS)
    if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day <= 22)) {
      return {
        tipo: 'verao' as const,
        label: 'Verão',
        foco: 'Revisões de AQS e Sistemas Fotovoltaicos (UPAC)',
        descricao: 'Lavagem técnica de painéis solares para máxima produção e inspeção das bombas de calor AQS.',
        cor: 'amber',
      };
    }
    // Outono: 23 Setembro - 21 Dezembro (foco em Piso Radiante e BC Climatização)
    if ((month === 9 && day >= 23) || month === 10 || month === 11 || (month === 12 && day <= 21)) {
      return {
        tipo: 'outono' as const,
        label: 'Outono',
        foco: 'Piso Radiante Hidráulico & Bomba de Calor Climatização',
        descricao: 'Purga de ar nos coletores, controlo de lamas e teste de eficiência antes dos primeiros frios.',
        cor: 'orange',
      };
    }
    // Inverno: 22 Dezembro - 20 Março (foco geral anual e VMC)
    return {
      tipo: 'inverno' as const,
      label: 'Inverno',
      foco: 'Ventilação VMC & Bombas de Calor de Climatização',
      descricao: 'Troca de filtros VMC para garantir qualidade do ar interior sem perdas térmicas.',
      cor: 'blue',
    };
  }, []);

  // Format Helper
  const getDaysDiff = (targetDateStr?: string) => {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Icon selector per equipment
  const renderEquipmentIcon = (key: EquipamentoInstalado, className: string = 'w-3.5 h-3.5') => {
    switch (key) {
      case 'ar_condicionado':
        return <Wind className={className} />;
      case 'bc_aqs':
        return <Flame className={className} />;
      case 'bc_clima':
        return <ThermometerSnowflake className={className} />;
      case 'piso_radiante':
        return <Layers className={className} />;
      case 'ventiloconvectores':
        return <Fan className={className} />;
      case 'vmc':
        return <RefreshCw className={className} />;
      case 'solar_termico':
        return <Sun className={className} />;
      case 'bc_piscina':
        return <Waves className={className} />;
      case 'upac':
        return <Sun className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  // KPIs
  const stats = useMemo(() => {
    let ativas = 0;
    let urgentesOuVencidas = 0;
    let sazonaisEpoca = 0;
    let concluidas = 0;

    obras.forEach((obra) => {
      const equipamentos = obra.equipamentos_instalados || [];
      const manut = obra.manutencao;

      if (equipamentos.length > 0 && manut?.ativo !== false) {
        ativas++;
      }

      if (manut?.estado === 'concluido') {
        concluidas++;
      }

      if (manut?.ativo !== false && manut?.estado !== 'concluido') {
        const diff = getDaysDiff(manut?.data_agendada);
        if (diff !== null && diff <= 30) {
          urgentesOuVencidas++;
        }

        // Verifica sazonal da época
        const matchSeasonal = equipamentos.some((eq) => {
          const item = (CATALOGO_EQUIPAMENTOS as any)[eq];
          if (!item) return false;
          if (currentSeason.tipo === 'primavera' && item.grupo_sazonal === 'primavera') return true;
          if (currentSeason.tipo === 'outono' && item.grupo_sazonal === 'outono') return true;
          return false;
        });

        if (matchSeasonal) {
          sazonaisEpoca++;
        }
      }
    });

    return {
      totalObras: obras.length,
      ativas,
      urgentesOuVencidas,
      sazonaisEpoca,
      concluidas,
    };
  }, [obras, currentSeason]);

  // Filtered List
  const filteredObras = useMemo(() => {
    return obras.filter((obra) => {
      const equipamentos = obra.equipamentos_instalados || [];
      const manut = obra.manutencao;
      const term = searchTerm.toLowerCase().trim();

      // Search term
      if (term) {
        const matchName = obra.name.toLowerCase().includes(term);
        const matchClient = obra.client.toLowerCase().includes(term);
        const matchEquip = equipamentos.some((eq) => {
          const cat = (CATALOGO_EQUIPAMENTOS as any)[eq];
          return cat?.nome.toLowerCase().includes(term) || eq.toLowerCase().includes(term);
        });
        if (!matchName && !matchClient && !matchEquip) return false;
      }

      // Equipment filter
      if (equipmentFilter !== 'todos') {
        if (!equipamentos.includes(equipmentFilter as EquipamentoInstalado)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'todos') return true;

      if (statusFilter === 'vencidos_urgentes') {
        if (!manut || manut.ativo === false || manut.estado === 'concluido') return false;
        const diff = getDaysDiff(manut.data_agendada);
        return diff !== null && diff <= 30;
      }

      if (statusFilter === 'agendados') {
        return manut?.estado === 'agendado' && manut?.ativo !== false;
      }

      if (statusFilter === 'sazonais') {
        if (!manut || manut.ativo === false) return false;
        return equipamentos.some((eq) => {
          const item = (CATALOGO_EQUIPAMENTOS as any)[eq];
          if (currentSeason.tipo === 'primavera') return item?.grupo_sazonal === 'primavera';
          if (currentSeason.tipo === 'outono') return item?.grupo_sazonal === 'outono';
          return false;
        });
      }

      if (statusFilter === 'concluidos') {
        return manut?.estado === 'concluido';
      }

      if (statusFilter === 'pausados') {
        return manut?.ativo === false || manut?.estado === 'pausado';
      }

      return true;
    });
  }, [obras, searchTerm, equipmentFilter, statusFilter, currentSeason]);

  // Open Message Modal
  const handleOpenMessageModal = (obra: Obra) => {
    setSelectedObraForMessage(obra);
    const prepared = obra.manutencao?.mensagem_preparada || gerarTextoLembrete(obra.client, obra.equipamentos_instalados || []);
    setCustomMessageDraft(prepared);
    setClientPhoneDraft(obra.clientPhone || '');
    setCopiedMessage(false);
  };

  // Handle WhatsApp Link
  const handleSendWhatsApp = () => {
    if (!selectedObraForMessage) return;

    // Normaliza número de telemóvel para WhatsApp (ex: 912345678 -> 351912345678)
    let cleanPhone = clientPhoneDraft.replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = `351${cleanPhone}`;
    }

    const encoded = encodeURIComponent(customMessageDraft);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    // Atualiza contacto na obra se tiver mudado
    if (clientPhoneDraft !== selectedObraForMessage.clientPhone) {
      updateObra(selectedObraForMessage.id, { clientPhone: clientPhoneDraft.trim() });
    }

    // Regista último envio com a data de hoje
    const todayStr = new Date().toISOString().split('T')[0];
    updateObraManutencao(selectedObraForMessage.id, {
      ultimo_envio: todayStr,
      mensagem_preparada: customMessageDraft,
    });

    window.open(url, '_blank');
  };

  // Copy to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessageDraft);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Concluir Manutenção -> Avança agendamento em 1 ano mantendo o ciclo anual ativo
  const handleConcluirManutencao = (obra: Obra) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextDateStr = nextYear.toISOString().split('T')[0];

    updateObraManutencao(obra.id, {
      estado: 'concluido',
      ultimo_envio: todayStr,
      data_agendada: nextDateStr,
      mensagem_preparada: gerarTextoLembrete(obra.client, obra.equipamentos_instalados || []),
    });
  };

  // Reabrir / Reagendar Manutenção
  const handleReagendarManutencao = (obra: Obra) => {
    const baseDate = obra.completionDate || obra.startDate || new Date().toISOString().split('T')[0];
    const dataAgendada = calcularDataLembrete(baseDate, obra.equipamentos_instalados || []);
    const msg = gerarTextoLembrete(obra.client, obra.equipamentos_instalados || []);

    updateObraManutencao(obra.id, {
      estado: 'agendado',
      ativo: true,
      data_agendada: dataAgendada,
      mensagem_preparada: msg,
    });
  };

  // Open Edit Modal
  const handleOpenEditModal = (obra: Obra) => {
    setEditingObra(obra);
    setEditSelectedEquipments(obra.equipamentos_instalados || []);
    const manut = obra.manutencao;
    const defaultData = manut?.data_agendada || calcularDataLembrete(obra.completionDate || obra.startDate, obra.equipamentos_instalados || []);
    setEditScheduledDate(defaultData);
    setEditIsActive(manut?.ativo ?? true);
    setEditState(manut?.estado || 'agendado');
    setEditClientPhone(obra.clientPhone || '');
  };

  // Save Edit Modal
  const handleSaveEditModal = () => {
    if (!editingObra) return;

    const baseDate = editingObra.completionDate || editingObra.startDate || new Date().toISOString().split('T')[0];
    const calculatedDate = calcularDataLembrete(baseDate, editSelectedEquipments);
    const preparedMsg = gerarTextoLembrete(editingObra.client, editSelectedEquipments);

    const updatedManut: ObraManutencao = {
      ativo: editIsActive,
      data_agendada: editScheduledDate || calculatedDate,
      estado: editState,
      mensagem_preparada: preparedMsg,
      ultimo_envio: editingObra.manutencao?.ultimo_envio || null,
    };

    updateObra(editingObra.id, {
      equipamentos_instalados: editSelectedEquipments,
      clientPhone: editClientPhone.trim(),
      manutencao: updatedManut,
    });

    setEditingObra(null);
  };

  // Toggle equipment in edit modal
  const handleToggleEquipment = (key: EquipamentoInstalado) => {
    setEditSelectedEquipments((prev) => {
      const exists = prev.includes(key);
      const updated = exists ? prev.filter((k) => k !== key) : [...prev, key];
      // Recalcula data sugerida se o utilizador não tiver editado manualmente
      if (editingObra) {
        const baseDate = editingObra.completionDate || editingObra.startDate;
        setEditScheduledDate(calcularDataLembrete(baseDate, updated));
      }
      return updated;
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Pós-Venda & Garantias
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
              ENAT Energias
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>Centro de Manutenções & Lembretes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Gestão proativa de revisões preventivas sazonais e anuais. Mantenha os equipamentos com máxima eficiência e fidelize os clientes com contactos oportunos via WhatsApp e SMS.
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsQuickSetupOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition ios-press-active"
          >
            <Plus className="w-4 h-4" />
            <span>Configurar Equipamentos numa Obra</span>
          </button>
        </div>
      </div>

      {/* Sazonalidade em Portugal Banner */}
      <div className={`p-4 rounded-3xl border transition-all ${
        currentSeason.tipo === 'primavera'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
          : currentSeason.tipo === 'outono'
          ? 'bg-orange-500/10 border-orange-500/20 text-orange-950 dark:text-orange-100'
          : currentSeason.tipo === 'verao'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100'
          : 'bg-blue-500/10 border-blue-500/20 text-blue-950 dark:text-blue-100'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              currentSeason.tipo === 'primavera'
                ? 'bg-emerald-500 text-white'
                : currentSeason.tipo === 'outono'
                ? 'bg-orange-500 text-white'
                : currentSeason.tipo === 'verao'
                ? 'bg-amber-500 text-white'
                : 'bg-blue-500 text-white'
            }`}>
              {currentSeason.tipo === 'primavera' ? (
                <Wind className="w-5 h-5" />
              ) : currentSeason.tipo === 'outono' ? (
                <Layers className="w-5 h-5" />
              ) : currentSeason.tipo === 'verao' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  Época Atual em Portugal: {currentSeason.label}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                  Foco: {currentSeason.foco}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {currentSeason.descricao}
              </p>
            </div>
          </div>

          <button
            onClick={() => setStatusFilter('sazonais')}
            className="text-xs font-bold underline shrink-0 hover:opacity-80 transition"
          >
            Ver obras desta época ({stats.sazonaisEpoca})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Ativas */}
        <div
          onClick={() => setStatusFilter('todos')}
          className="p-4 sm:p-5 rounded-3xl revolut-card border border-black/5 dark:border-white/10 cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ativas / Monitorizadas</span>
            <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
            {stats.ativas}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            de {stats.totalObras} obras registadas
          </span>
        </div>

        {/* Vencidas ou a Vencer */}
        <div
          onClick={() => setStatusFilter('vencidos_urgentes')}
          className="p-4 sm:p-5 rounded-3xl revolut-card border border-rose-500/20 bg-rose-500/5 cursor-pointer hover:border-rose-500/40 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">A Vencer / Urgentes</span>
            <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats.urgentesOuVencidas}
          </div>
          <span className="text-[11px] text-rose-500/80 block mt-1">
            Próximos 30 dias ou data ultrapassada
          </span>
        </div>

        {/* Sazonais Época */}
        <div
          onClick={() => setStatusFilter('sazonais')}
          className="p-4 sm:p-5 rounded-3xl revolut-card border border-amber-500/20 bg-amber-500/5 cursor-pointer hover:border-amber-500/40 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sazonal Desta Época</span>
            <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sun className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.sazonaisEpoca}
          </div>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 block mt-1">
            AC, Piso Radiante ou Piscina
          </span>
        </div>

        {/* Concluídas */}
        <div
          onClick={() => setStatusFilter('concluidos')}
          className="p-4 sm:p-5 rounded-3xl revolut-card border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Revisões Realizadas</span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.concluidas}
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 block mt-1">
            Concluídas este ciclo
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl revolut-card border border-black/5 dark:border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por obra, cliente ou equipamento..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-semibold text-black dark:text-white outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Equipment Dropdown */}
          <div className="sm:w-64">
            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-bold text-black dark:text-white outline-none transition"
            >
              <option value="todos">Todos os Equipamentos</option>
              {LISTA_EQUIPAMENTOS_OPCOES.map((eq) => (
                <option key={eq.key} value={eq.key}>
                  {eq.label} ({eq.grupo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'todos'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            Todas ({obras.length})
          </button>

          <button
            onClick={() => setStatusFilter('vencidos_urgentes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'vencidos_urgentes'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>A Vencer / Urgentes ({stats.urgentesOuVencidas})</span>
          </button>

          <button
            onClick={() => setStatusFilter('sazonais')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'sazonais'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span>Sazonais {currentSeason.label} ({stats.sazonaisEpoca})</span>
          </button>

          <button
            onClick={() => setStatusFilter('agendados')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'agendados'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            Agendadas
          </button>

          <button
            onClick={() => setStatusFilter('concluidos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'concluidos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Concluídas ({stats.concluidas})</span>
          </button>

          <button
            onClick={() => setStatusFilter('pausados')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'pausados'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200'
            }`}
          >
            Pausadas
          </button>
        </div>
      </div>

      {/* Maintenances List */}
      {filteredObras.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl revolut-card border border-black/5 dark:border-white/10">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-black dark:text-white">
            Nenhuma obra encontrada para este filtro
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Adicione equipamentos instalados às suas obras para que as datas de manutenção sazonal e as mensagens de WhatsApp sejam calculadas automaticamente.
          </p>
          <button
            onClick={() => setIsQuickSetupOpen(true)}
            className="mt-4 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
          >
            Configurar Equipamentos numa Obra
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredObras.map((obra) => {
            const equipamentos = obra.equipamentos_instalados || [];
            const manut = obra.manutencao;
            const diffDays = getDaysDiff(manut?.data_agendada);
            const isUrgent = diffDays !== null && diffDays <= 30 && manut?.estado !== 'concluido' && manut?.ativo !== false;
            const isOverdue = diffDays !== null && diffDays < 0 && manut?.estado !== 'concluido' && manut?.ativo !== false;

            return (
              <div
                key={obra.id}
                className="p-5 rounded-3xl revolut-card border border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Obra & Client Info */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        onClick={() => setSelectedObraId(obra.id)}
                        className="text-base font-black text-black dark:text-white hover:text-blue-500 transition cursor-pointer truncate"
                      >
                        {obra.name}
                      </h3>

                      {/* Status Badge */}
                      {manut?.estado === 'concluido' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Revisão Feita</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Vencida há {Math.abs(diffDays || 0)} dias</span>
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>A Vencer em {diffDays} dias</span>
                        </span>
                      ) : manut?.ativo === false || manut?.estado === 'pausado' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                          <Pause className="w-3 h-3" />
                          <span>Pausada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Calendar className="w-3 h-3" />
                          <span>Agendada</span>
                        </span>
                      )}

                      {/* Obra Status */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-bold text-slate-500">
                        {obra.status === 'concluida' ? 'Obra Concluída' : 'Obra em Curso'}
                      </span>
                    </div>

                    {/* Client & Phone */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
                      <span className="font-semibold text-black dark:text-white">
                        {obra.client}
                      </span>
                      <span>•</span>
                      {obra.clientPhone ? (
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                          <Phone className="w-3 h-3" />
                          {obra.clientPhone}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem telemóvel registado</span>
                      )}
                      <span>•</span>
                      <span>
                        Data Alvo:{' '}
                        <strong className="text-black dark:text-white">
                          {manut?.data_agendada ? new Date(manut.data_agendada).toLocaleDateString('pt-PT') : 'A calcular'}
                        </strong>
                      </span>
                      {manut?.ultimo_envio && (
                        <>
                          <span>•</span>
                          <span className="text-blue-500">
                            Último envio: {new Date(manut.ultimo_envio).toLocaleDateString('pt-PT')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Equipment Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {equipamentos.length === 0 ? (
                        <button
                          onClick={() => handleOpenEditModal(obra)}
                          className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar equipamentos instalados</span>
                        </button>
                      ) : (
                        equipamentos.map((eq) => {
                          const cat = (CATALOGO_EQUIPAMENTOS as any)[eq];
                          const isSeasonalCurrent =
                            (currentSeason.tipo === 'primavera' && cat?.grupo_sazonal === 'primavera') ||
                            (currentSeason.tipo === 'outono' && cat?.grupo_sazonal === 'outono');

                          return (
                            <span
                              key={eq}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                                isSeasonalCurrent
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                  : 'bg-black/5 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                              }`}
                              title={`${cat?.nome || eq} - Revisão ${cat?.grupo_sazonal || 'anual'}: ${cat?.beneficio || ''}`}
                            >
                              {renderEquipmentIcon(eq, 'w-3 h-3 text-blue-500')}
                              <span>{cat?.nome || eq}</span>
                              {cat?.grupo_sazonal && (
                                <span className="text-[9px] uppercase tracking-wider opacity-60">
                                  ({cat.grupo_sazonal})
                                </span>
                              )}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                    {/* Botão WhatsApp */}
                    <button
                      onClick={() => handleOpenMessageModal(obra)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition ios-press-active"
                      title="Enviar lembrete cordial via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp / SMS</span>
                    </button>

                    {/* Botão Concluir ou Reagendar */}
                    {manut?.estado === 'concluido' ? (
                      <button
                        onClick={() => handleReagendarManutencao(obra)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs font-bold text-black dark:text-white transition"
                        title="Reagendar revisão para o ciclo seguinte"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reagendar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConcluirManutencao(obra)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-emerald-500 hover:text-white text-xs font-bold text-black dark:text-white transition"
                        title="Marcar revisão como realizada (+1 ano automático)"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                    )}

                    {/* Botão Configurar Equipamentos */}
                    <button
                      onClick={() => handleOpenEditModal(obra)}
                      className="p-2 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-black dark:hover:text-white transition"
                      title="Editar equipamentos instalados e agendamento"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    {/* Botão Ver Pasta da Obra */}
                    <button
                      onClick={() => setSelectedObraId(obra.id)}
                      className="p-2 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-black dark:hover:text-white transition"
                      title="Abrir pasta completa da obra"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Enviar Mensagem WhatsApp / SMS */}
      {selectedObraForMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121216] border border-black/10 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-black dark:text-white">
                    Lembrete de Manutenção Preventiva
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {selectedObraForMessage.name} • {selectedObraForMessage.client}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedObraForMessage(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contacto do Cliente */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Contacto Telefónico / WhatsApp do Cliente
              </label>
              <input
                type="tel"
                value={clientPhoneDraft}
                onChange={(e) => setClientPhoneDraft(e.target.value)}
                placeholder="Ex: 912345678 ou 351912345678"
                className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-semibold text-black dark:text-white outline-none transition"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                O número fica guardado na ficha da obra para os próximos lembretes.
              </span>
            </div>

            {/* Mensagem Preparada */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Texto da Mensagem (Personalizável)
                </label>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:underline"
                >
                  {copiedMessage ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMessage ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>
              <textarea
                rows={7}
                value={customMessageDraft}
                onChange={(e) => setCustomMessageDraft(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-medium text-black dark:text-white outline-none transition leading-relaxed resize-none"
              />
            </div>

            {/* Botões do Modal */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSelectedObraForMessage(null)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition ios-press-active"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Abrir e Enviar no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Equipamentos & Agendamento */}
      {editingObra && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121216] border border-black/10 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-black dark:text-white">
                  Configurar Equipamentos & Manutenção
                </h3>
                <span className="text-[11px] text-slate-400">
                  {editingObra.name}
                </span>
              </div>
              <button
                onClick={() => setEditingObra(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contacto do Cliente */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Telemóvel do Cliente (WhatsApp)
              </label>
              <input
                type="tel"
                value={editClientPhone}
                onChange={(e) => setEditClientPhone(e.target.value)}
                placeholder="Ex: 912 345 678"
                className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-semibold text-black dark:text-white outline-none transition"
              />
            </div>

            {/* Seleção dos 9 Equipamentos */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Equipamentos Instalados nesta Obra ({editSelectedEquipments.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LISTA_EQUIPAMENTOS_OPCOES.map((option) => {
                  const isChecked = editSelectedEquipments.includes(option.key);
                  const item = (CATALOGO_EQUIPAMENTOS as any)[option.key];

                  return (
                    <div
                      key={option.key}
                      onClick={() => handleToggleEquipment(option.key)}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400'
                          : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-600 dark:text-neutral-400 hover:bg-black/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderEquipmentIcon(option.key, `w-4 h-4 shrink-0 ${isChecked ? 'text-blue-500' : 'text-slate-400'}`)}
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate leading-tight">
                            {option.label}
                          </span>
                          <span className="text-[10px] opacity-70 block">
                            Revisão {item?.grupo_sazonal || 'anual'}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 ${
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

            {/* Data Agendada */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Data Alvo da Revisão
                </label>
                <input
                  type="date"
                  value={editScheduledDate}
                  onChange={(e) => setEditScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-semibold text-black dark:text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Estado
                </label>
                <select
                  value={editState}
                  onChange={(e) => setEditState(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-bold text-black dark:text-white outline-none transition"
                >
                  <option value="agendado">Agendado</option>
                  <option value="concluido">Concluído</option>
                  <option value="pausado">Pausado</option>
                </select>
              </div>
            </div>

            {/* Toggle Ativo */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5">
              <div>
                <span className="text-xs font-bold text-black dark:text-white block">
                  Monitorização Ativa
                </span>
                <span className="text-[10px] text-slate-400">
                  Gerar lembretes e alertas automáticos nesta obra
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditIsActive(!editIsActive)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  editIsActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    editIsActive ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setEditingObra(null)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition ios-press-active"
              >
                Guardar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Setup para Obra Sem Equipamentos */}
      {isQuickSetupOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121216] border border-black/10 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
              <h3 className="text-sm font-black text-black dark:text-white">
                Escolha a Obra para Configurar
              </h3>
              <button
                onClick={() => setIsQuickSetupOpen(false)}
                className="text-slate-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Selecionar Obra Existente
              </label>
              <select
                value={selectedQuickObraId}
                onChange={(e) => setSelectedQuickObraId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent focus:border-blue-500 text-xs font-bold text-black dark:text-white outline-none transition"
              >
                <option value="">Selecione uma obra...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.client})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsQuickSetupOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedQuickObraId}
                onClick={() => {
                  const target = obras.find((o) => o.id === selectedQuickObraId);
                  if (target) {
                    setIsQuickSetupOpen(false);
                    handleOpenEditModal(target);
                  }
                }}
                className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition ios-press-active"
              >
                Avançar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
