/**
 * CyclerRoute Service Worker v5
 * Estratégia: Network-first para JS/HTML (sempre nova versão)
 * Cache-first para CSS/ícones (para performance)
 */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `cyclerroute-${CACHE_VERSION}`;

// Assets que SEMPRE devem vir da rede (código executável)
const NETWORK_FIRST = [
  '/index.html',
  '/src/app.js',
  '/src/ui.js',
  '/src/router.js',
  '/src/config.js',
  '/src/validate.js',
  '/src/tests.js',
  '/src/utils/distance.js',
  '/src/map/map-init.js',
  '/src/map/route-creator.js',
  '/src/map/route-loader.js',
  '/src/storage/db.js',
  '/src/storage/route-store.js'
];

// Assets estáticos (CSS, ícones) - cache-first
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/assets/css/styles.css',
  '/manifest.json',
  '/assets/icons/icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

// Install event - cache static assets apenas
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v5...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cachea apenas assets estáticos (não código JS)
        return cache.addAll(STATIC_ASSETS).catch(() => {
          console.warn('[SW] Erro ao cachear alguns assets');
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating, cleaning old caches...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activate complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - estratégia dinâmica
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') {
    return;
  }

  // ========================================
  // NETWORK-FIRST: Código JS/HTML sempre novo
  // ========================================
  if (NETWORK_FIRST.some((path) => url.pathname.includes(path))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Se falhar rede, tenta cache
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                console.log('[SW] Servindo do cache:', url.pathname);
                return cached;
              }

              // Fallback offline
              if (request.destination === 'document') {
                return caches.match('/offline.html');
              }

              return null;
            });
        })
    );
    return;
  }

  // ========================================
  // CACHE-FIRST: Assets estáticos
  // ========================================
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }

            // Só cacheia URLs HTTP/HTTPS válidas
            const responseToCache = response.clone();
            if (request.url.startsWith('http')) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              }).catch(() => {
                console.warn('[SW] Erro ao cachear:', request.url);
              });
            }

            return response;
          })
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

