// ════════════════════════════════════════════════════
// NutriMás — Service Worker
// Permite usar la app sin conexión
// ════════════════════════════════════════════════════

const CACHE_NAME = 'nutrimas-v1';

// Archivos que se cachean para uso offline
const STATIC_ASSETS = [
  './dietetica-app.html',
  './manifest.json',
];

// ─── Instalación: cachear archivos estáticos ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activación: limpiar caches viejos ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: primero red, si falla usa cache ───
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Las llamadas al backend siempre van a la red (no se cachean)
  if (url.includes('/api/') || url.includes('railway') || url.includes('render.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CDN fonts y librerías — red primero, luego cache
  if (url.includes('fonts.googleapis') || url.includes('cdnjs.cloudflare')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App principal — cache primero (funciona offline)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
      .catch(() => caches.match('./dietetica-app.html'))
  );
});
