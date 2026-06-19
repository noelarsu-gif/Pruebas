const SW_VERSION = 'sdv-v3-sw3';
const CACHE_CORE = SW_VERSION + '-core';
const CACHE_LIBS = SW_VERSION + '-libs';
const CACHE_SEED = SW_VERSION + '-seed';

/* Shell — HTML y manifest, debe cachearse siempre, bloquea el install */
const SHELL_CORE = [
  './',
  './index.html',
  './manifest.json'
];

/* Librerías y fuentes — autoalojadas, sin red externa.
   Se cachean en el install, junto al shell, porque son
   pequeñas comparadas con el seed y la app las necesita
   desde el primer arranque (mapa, PDF, Excel, tipografía). */
const SHELL_LIBS = [
  './fonts/barlow.css',
  './fonts/barlow-condensed.css',
  './fonts/roboto-mono.css',
  './fonts/files/barlow-latin-400-normal.woff2',
  './fonts/files/barlow-latin-ext-400-normal.woff2',
  './fonts/files/barlow-latin-500-normal.woff2',
  './fonts/files/barlow-latin-ext-500-normal.woff2',
  './fonts/files/barlow-latin-600-normal.woff2',
  './fonts/files/barlow-latin-ext-600-normal.woff2',
  './fonts/files/barlow-latin-700-normal.woff2',
  './fonts/files/barlow-latin-ext-700-normal.woff2',
  './fonts/files/barlow-latin-900-normal.woff2',
  './fonts/files/barlow-latin-ext-900-normal.woff2',
  './fonts/files/barlow-condensed-latin-500-normal.woff2',
  './fonts/files/barlow-condensed-latin-ext-500-normal.woff2',
  './fonts/files/barlow-condensed-latin-700-normal.woff2',
  './fonts/files/barlow-condensed-latin-ext-700-normal.woff2',
  './fonts/files/barlow-condensed-latin-900-normal.woff2',
  './fonts/files/barlow-condensed-latin-ext-900-normal.woff2',
  './fonts/files/roboto-mono-latin-400-normal.woff2',
  './fonts/files/roboto-mono-latin-ext-400-normal.woff2',
  './fonts/files/roboto-mono-latin-600-normal.woff2',
  './fonts/files/roboto-mono-latin-ext-600-normal.woff2',
  './lib/leaflet/leaflet.min.css',
  './lib/leaflet/leaflet.min.js',
  './lib/leaflet/images/marker-icon.png',
  './lib/leaflet/images/marker-icon-2x.png',
  './lib/leaflet/images/marker-shadow.png',
  './lib/leaflet/images/layers.png',
  './lib/leaflet/images/layers-2x.png',
  './lib/jspdf/jspdf.umd.min.js',
  './lib/jspdf/jspdf.plugin.autotable.min.js',
  './lib/xlsx/xlsx.full.min.js'
];

/* Seed de carreteras — pesado (~9MB), se cachea aparte SIN
   bloquear el install. Si falla la primera descarga, la app
   sigue siendo usable; el seed se reintenta en el siguiente
   arranque con red. */
const SHELL_SEED = [
  './PK_SEED_para_app.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_CORE)
      .then((c) => c.addAll(SHELL_CORE))
      .then(() => caches.open(CACHE_LIBS))
      .then((c) => c.addAll(SHELL_LIBS))
      .then(() => {
        caches.open(CACHE_SEED).then((c) => {
          c.addAll(SHELL_SEED).catch((err) => {
            console.warn('[SW] No se pudo cachear el seed en el install, se reintentará:', err);
          });
        });
      })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_CORE && k !== CACHE_LIBS && k !== CACHE_SEED)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const esSeed = url.includes('PK_SEED_para_app.js');
  const esLib = url.includes('/lib/') || url.includes('/fonts/');
  const cacheName = esSeed ? CACHE_SEED : (esLib ? CACHE_LIBS : CACHE_CORE);

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        if (!esSeed && !esLib) {
          fetch(e.request).then((res) => {
            if (res && res.ok) caches.open(cacheName).then((c) => c.put(e.request, res));
          }).catch(() => {});
        }
        return cached;
      }
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(cacheName).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
