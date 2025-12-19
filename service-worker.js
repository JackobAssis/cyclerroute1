/**
 * CyclerRoute Service Worker
 * Estratégia: Network-first com fallback para cache
 * Suporte offline para rotas salvas e GPS
 */

const CACHE_VERSION = 'v6';
const CACHE_NAME = `cyclerroute-${CACHE_VERSION}`;

// Assets para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/assets/icons/icon.svg',
  '/src/app.js',
  '/src/splash-screen.js',
  '/src/storage/db.js',
  '/src/map/route-creator-osrm.js',
  '/src/map/gps-navigator.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css'
];

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Cache error:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - Network first com fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET e chrome-extension
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) {
    return;
  }
  
  // Para tiles do mapa (OpenStreetMap), tenta cache primeiro para performance
  if (request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          });
        })
    );
    return;
  }
  
  // Para OSRM (rotas), sempre da rede (não cachear rotas dinâmicas)
  if (request.url.includes('router.project-osrm.org')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Para outros recursos: Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
          .catch(() => {
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            return null;
          });
      })
  );
});

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v5 loaded - Network-first strategy');

