// Service worker — Constructora PWA
// Estrategia: cache-first para la app (shell + estáticos), red directa para /api.
const CACHE = 'constructora-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/views/dashboard.js',
  '/js/views/proyectos.js',
  '/js/views/materiales.js',
  '/js/views/cotizador.js',
  '/js/views/configuracion.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Datos: siempre desde la red (no cachear respuestas dinámicas).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(() => new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })));
    return;
  }

  // App: cache-first, con respaldo a red y actualización en segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fromNet = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => cached);

      if (cached) return cached;
      return fromNet.then((res) => res || caches.match('/index.html'));
    })
  );
});
