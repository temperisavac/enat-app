export interface AppVersionInfo {
  version: string;
  buildNumber: string;
  buildDate: string;
  buildIso: string;
  channel: string;
  status: string;
  features: string[];
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'v1.5.0',
  buildNumber: '2026.10.25-02',
  buildDate: '25 Outubro 2026, 15:55',
  buildIso: '2026-10-25T15:55:00Z',
  channel: 'Produção / Snapshot Online',
  status: 'Sistema Atualizado & Operacional',
  features: [
    'Módulo de Manutenções Periódicas (Aba Ativa)',
    'Digitalização Inteligente de Faturas (IA Gemini Vision)',
    'Gestão e Pastas de Obras & Custos Reais',
    'Catálogo e Consulta de Preços de Materiais',
    'Sincronização em Nuvem (Firebase Firestore)',
    'Suporte PWA Offline & Mobile iOS/Android',
  ],
};
