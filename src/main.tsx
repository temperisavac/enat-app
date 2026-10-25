import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker with auto-update trigger for fresh code
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('PWA ServiceWorker registered successfully:', registration.scope);
        // If a waiting worker already exists, ask it to skip waiting immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Check for updates on every page load
        registration.update().catch(() => {});

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nova versão da aplicação instalada! A recarregar...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('PWA ServiceWorker registration error:', error);
      });

    // Auto-reload current tab when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    (window as any).__clearCacheAndReload = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
      } catch (e) {
        console.warn(e);
      }
      window.location.href = window.location.origin + '/?v=' + Date.now();
    };
  });
}

createRoot(document.getElementById('root')!).render(<App />);
