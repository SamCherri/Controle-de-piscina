const CACHE_VERSION = 'v2';
const CACHE_NAME = `controle-de-piscina-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/login', '/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isNavigationRequest = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && !isNavigationRequest) {
          const clonedResponse = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        if (isNavigationRequest) {
          return caches.match('/login');
        }

        return Response.error();
      })
  );
});
