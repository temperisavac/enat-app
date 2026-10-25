// Service Worker for Enat app with Native iOS & Android Push Notifications
const CACHE_NAME = 'enat-app-v18-manutencoes-live';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/enat-logo.png',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
];

// Install: Cache essential assets & activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('Pre-caching some assets failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up all old caches immediately and take control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('Cleaning old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ================= PUSH NOTIFICATIONS API (iOS 16.4+ & ANDROID / DESKTOP) =================

// Handle Push event sent by server (Web Push protocol)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Enat app',
    body: 'Nova atualização na gestão da sua obra.',
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    tag: 'enat-alert',
    url: '/',
    type: 'general',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationTitle = payload.title || 'Enat app';
  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/favicon-32x32.png',
    tag: payload.tag || `enat-${payload.type || 'alert'}-${Date.now()}`,
    renotify: true,
    requireInteraction: payload.type === 'budget_alert',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/',
      type: payload.type || 'general',
      timestamp: Date.now(),
      obraId: payload.obraId,
    },
    actions: [
      { action: 'open', title: 'Ver Detalhes' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle Notification Click / Tap
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If an open window of our app already exists, focus it and navigate
        for (const client of windowClients) {
          if ('focus' in client) {
            if ('navigate' in client && targetUrl !== '/') {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle Push Subscription Change (iOS or browser rotates encryption key)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((newSubscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSubscription }),
        });
      })
      .catch((err) => {
        console.warn('Failed to renew push subscription:', err);
      })
  );
});

// Handle Internal Client Messages (e.g. trigger local notifications for testing or background summaries)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    const notifOptions = {
      body: options?.body || '',
      icon: options?.icon || '/pwa-192x192.png',
      badge: options?.badge || '/favicon-32x32.png',
      tag: options?.tag || `enat-local-${Date.now()}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: options?.data || { url: '/' },
      actions: [
        { action: 'open', title: 'Ver Detalhes' },
        { action: 'dismiss', title: 'Fechar' },
      ],
      ...options,
    };

    event.waitUntil(
      self.registration.showNotification(title || 'Enat app', notifOptions)
    );
  }
});

// ================= FETCH & OFFLINE CACHING =================
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET and API / Firebase calls
  if (request.method !== 'GET') return;
  if (
    request.url.includes('/api/') ||
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // 1. Navigation (HTML pages) and dynamic scripts: NETWORK FIRST with Cache fallback
  // This ensures online updates are immediately visible upon refresh/visit
  const isHtmlOrNavigation =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.url.endsWith('/') ||
    request.url.endsWith('.html');

  const isCodeBundle =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.url.includes('/assets/') ||
    request.url.includes('/src/') ||
    request.url.includes('@vite');

  if (isHtmlOrNavigation || isCodeBundle) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network is offline, retrieve from cache
          const cached = await caches.match(request);
          if (cached) return cached;
          if (isHtmlOrNavigation) {
            const fallback = await caches.match('/');
            if (fallback) return fallback;
            return caches.match('/index.html');
          }
        })
    );
    return;
  }

  // 2. Static Assets (Images, Icons, Fonts): Cache first, background revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, revalidate in background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(async () => {
          if (request.mode === 'navigate') {
            const fallback = await caches.match('/');
            if (fallback) return fallback;
            return caches.match('/index.html');
          }
        });
    })
  );
});
