const CACHE_VERSION = 'v4';
const CACHE_NAME = `controle-de-piscina-${CACHE_VERSION}`;
const STATIC_ASSET_PREFIXES = ['/icons/', '/_next/static/'];
const STATIC_ASSET_PATHS = new Set(['/manifest.webmanifest', '/sw.js']);
const PUBLIC_PAGE_PREFIXES = ['/public/'];
const PUBLIC_PAGE_PATHS = new Set(['/login']);

function isCacheableStaticAsset(pathname) {
  return STATIC_ASSET_PATHS.has(pathname) || STATIC_ASSET_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function isCacheablePublicPage(pathname) {
  return PUBLIC_PAGE_PATHS.has(pathname) || PUBLIC_PAGE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(['/login', '/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg']))
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
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith('/api/')) return;

  const isNavigationRequest = event.request.mode === 'navigate';
  const cacheStaticAsset = isCacheableStaticAsset(requestUrl.pathname);
  const cachePublicPage = isNavigationRequest && isCacheablePublicPage(requestUrl.pathname);

  if (!cacheStaticAsset && !cachePublicPage) {
    return;
  }

  if (cacheStaticAsset) {
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

        return (await caches.match('/login')) || Response.error();
      })
  );
});
