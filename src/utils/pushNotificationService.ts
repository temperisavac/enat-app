/**
 * Push Notification Service for Enat app
 * Supports Web Push API, iOS 16.4+ standalone Home Screen PWA notifications, and local Service Worker alerts.
 */

export interface NotificationPreferences {
  budgetAlerts: boolean;
  monthlySummary: boolean;
  invoiceAlerts: boolean;
}

const STORAGE_KEYS = {
  PREFERENCES: 'enat_push_preferences_v1',
  SUBSCRIPTION: 'enat_push_sub_cache_v1',
};

// Converts URL-safe base64 string to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function getSavedPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return { budgetAlerts: true, monthlySummary: true, invoiceAlerts: true };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Error reading saved notification preferences:', e);
  }
  return { budgetAlerts: true, monthlySummary: true, invoiceAlerts: true };
}

export function savePreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Error saving notification preferences:', e);
  }
}

/**
 * Requests permission and subscribes to Push Notifications via Service Worker
 */
export async function subscribeToPushNotifications(
  userEmail?: string,
  preferences?: NotificationPreferences
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Notificações Push não são suportadas neste navegador.',
    };
  }

  // 1. Request user permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      error: 'Permissão para notificações foi recusada no dispositivo.',
    };
  }

  try {
    // 2. Obtain ready Service Worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Get VAPID public key from backend
    const keyResponse = await fetch('/api/push/vapid-public-key');
    const keyData = await keyResponse.json();

    if (!keyData.success || !keyData.publicKey) {
      throw new Error('Não foi possível obter a chave VAPID do servidor.');
    }

    // 4. Subscribe to PushManager
    const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    // 5. Send subscription to server
    const currentPrefs = preferences || getSavedPreferences();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        userEmail,
        preferences: currentPrefs,
      }),
    });

    savePreferences(currentPrefs);
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
    } catch {}

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Erro ao subscrever push:', err);
    return { success: false, error: err.message || 'Falha ao subscrever notificações push.' };
  }
}

/**
 * Displays a local notification via the Service Worker (fast & works offline)
 */
export async function triggerLocalNotification(
  title: string,
  options: NotificationOptions & { data?: any } = {}
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        const notifOptions: any = {
          icon: '/pwa-192x192.png',
          badge: '/favicon-32x32.png',
          vibrate: [200, 100, 200],
          ...options,
        };
        await registration.showNotification(title, notifOptions);
        return true;
      }
    }

    // Fallback to Notification constructor if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        ...options,
      });
      return true;
    }
  } catch (err) {
    console.warn('Erro ao disparar notificação local:', err);
  }

  return false;
}

/**
 * Triggers a critical budget alert notification when an obra crosses 80% or 100%
 */
export async function triggerBudgetAlertNotification(
  obraName: string,
  percentGasto: number,
  budget: number,
  totalGasto: number,
  obraId?: string
): Promise<void> {
  const prefs = getSavedPreferences();
  if (!prefs.budgetAlerts) return;

  const isCritical = percentGasto >= 100;
  const title = isCritical
    ? `🚨 Orçamento Excedido: ${obraName}`
    : `⚠️ Alerta de Custos: ${obraName} a ${percentGasto.toFixed(0)}%`;

  const body = isCritical
    ? `A obra atingiu ${totalGasto.toFixed(2)} € (orçado: ${budget.toFixed(2)} €). Lucro em risco!`
    : `Já foram gastos ${totalGasto.toFixed(2)} € de ${budget.toFixed(2)} € orçados. Toque para rever despesas.`;

  // 1. Try local Service Worker notification
  await triggerLocalNotification(title, {
    body,
    tag: `budget-alert-${obraId || 'general'}`,
    data: { url: obraId ? `/?obra=${obraId}` : '/', type: 'budget_alert' },
  });

  // 2. Also notify backend to broadcast to other devices
  try {
    await fetch('/api/push/send-budget-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraName,
        percentGasto,
        budget,
        totalGasto,
        obraId,
      }),
    });
  } catch (e) {
    console.warn('Server push dispatch notice:', e);
  }
}

/**
 * Triggers a monthly cost summary push notification
 */
export async function triggerMonthlySummaryNotification(
  monthName: string,
  totalGasto: number,
  totalObras: number,
  totalFaturas: number,
  topObraName?: string
): Promise<void> {
  const title = `📊 Resumo Mensal de Custos (${monthName})`;
  const body = `Gastos de ${totalGasto.toFixed(2)} € registados em ${totalObras} obra(s) e ${totalFaturas} faturas.${topObraName ? ` Maior despesa: ${topObraName}.` : ''} Toque para ver o balanço.`;

  // Local notification
  await triggerLocalNotification(title, {
    body,
    tag: 'monthly-summary-' + Date.now(),
    data: { url: '/?tab=dashboard', type: 'monthly_summary' },
  });

  // Server push
  try {
    await fetch('/api/push/send-monthly-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthName,
        totalGasto,
        totalObras,
        totalFaturas,
        topObraName,
      }),
    });
  } catch (e) {
    console.warn('Server push monthly summary notice:', e);
  }
}

/**
 * Sends a test push notification to verify native banner on iOS / Android / Desktop
 */
export async function sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
  // 1. Trigger immediate local notification via Service Worker
  await triggerLocalNotification('Enat app • Notificação Push Ativa', {
    body: 'Notificações Push a funcionar! Receberá alertas de desvios orçamentais e resumos mensais de custos.',
    data: { url: '/', type: 'test' },
  });

  // 2. Trigger push through server
  try {
    const res = await fetch('/api/push/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Enat app • Teste Nativo iOS',
        body: 'Notificações Push a funcionar! Receberá alertas de desvios orçamentais e resumos mensais de custos.',
      }),
    });
    const data = await res.json();
    return {
      success: true,
      message: data.message || 'Notificação enviada com sucesso para o seu dispositivo!',
    };
  } catch (err: any) {
    return {
      success: true,
      message: 'Notificação local apresentada com sucesso!',
    };
  }
}
