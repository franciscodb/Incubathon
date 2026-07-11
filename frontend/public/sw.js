// Service Worker de CumplIA (PWA).
// Estrategia:
//  - Navegaciones (SPA): network-first con fallback a la app shell cacheada.
//  - Estáticos same-origin: cache-first con relleno en segundo plano.
//  - API/backend y orígenes externos (fuentes): siempre red (no se cachean).
const CACHE = 'cumplia-cache-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Sólo manejamos el mismo origen; API y fuentes van directo a la red.
  if (url.origin !== self.location.origin) return

  // Navegaciones: intenta red, cae a la app shell si no hay conexión.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return resp
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Estáticos: cache-first, rellenando el caché con la respuesta de red.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return resp
        }),
    ),
  )
})
