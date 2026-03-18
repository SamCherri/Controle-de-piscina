const CACHE_VERSION = 'v3';
const CACHE_NAME = `controle-de-piscina-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/login', '/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];
const IMMUTABLE_PATH_PREFIXES = ['/icons/', '/_next/static/'];

function shouldCacheRequest(requestUrl, request) {
  if (request.method !== 'GET') return false;
  if (requestUrl.origin !== self.location.origin) return false;
  if (requestUrl.pathname.startsWith('/api/')) return false;
  return true;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
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
  const requestUrl = new URL(event.request.url);
  if (!shouldCacheRequest(requestUrl, event.request)) return;

  const isNavigationRequest = event.request.mode === 'navigate';
  const isImmutableAsset = IMMUTABLE_PATH_PREFIXES.some(prefix => requestUrl.pathname.startsWith(prefix));

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clonedResponse = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse)));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
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
          return (await caches.match('/login')) || (await caches.match('/')) || Response.error();
        }

        return Response.error();
      })
  );
});
