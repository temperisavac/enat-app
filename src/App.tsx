/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ObrasListView } from './components/ObrasListView';
import { ObraDetailView } from './components/ObraDetailView';
import { InvoicesListView } from './components/InvoicesListView';
import { OrcamentosView } from './components/OrcamentosView';
import { MaterialsCatalogueView } from './components/MaterialsCatalogueView';
import { GoogleSheetsSyncView } from './components/GoogleSheetsSyncView';
import { MaintenancesView } from './components/MaintenancesView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { InvoiceScannerModal } from './components/InvoiceScannerModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';

const MainContent: React.FC = () => {
  const { activeTab, selectedObraId, isScannerOpen, isNotificationModalOpen, closeNotificationModal } = useApp();

  return (
    <div className="min-h-screen bg-[var(--revolut-bg)] text-[var(--revolut-text)] transition-colors duration-200">
      {/* Top Header & Navigation Bars */}
      <Navigation />

      {/* Main Page Area */}
      <main className="md:pl-64 pt-4 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full transition-all">

        {/* View Routing */}
        {selectedObraId ? (
          <ObraDetailView />
        ) : activeTab === 'dashboard' ? (
          <DashboardView />
        ) : activeTab === 'obras' ? (
          <ObrasListView />
        ) : activeTab === 'faturas' ? (
          <InvoicesListView />
        ) : activeTab === 'orcamentos' ? (
          <OrcamentosView />
        ) : activeTab === 'manutencoes' ? (
          <MaintenancesView />
        ) : activeTab === 'materiais' ? (
          <MaterialsCatalogueView />
        ) : activeTab === 'sheets' ? (
          <GoogleSheetsSyncView />
        ) : (
          <DashboardView />
        )}
      </main>

      {/* Global iOS Modals */}
      <ProductDetailModal />
      {isScannerOpen && <InvoiceScannerModal />}
      <NotificationSettingsModal isOpen={isNotificationModalOpen} onClose={closeNotificationModal} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
