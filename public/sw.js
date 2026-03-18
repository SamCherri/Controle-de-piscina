const STATIC_CACHE_NAME = 'controle-de-piscina-static-v3';
const PUBLIC_PAGE_CACHE_NAME = 'controle-de-piscina-public-pages-v1';
const STATIC_ASSETS = ['/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => ![STATIC_CACHE_NAME, PUBLIC_PAGE_CACHE_NAME].includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isPublicPoolPage(url, request) {
  return request.mode === 'navigate' && url.pathname.startsWith('/public/piscinas/');
}

function shouldCacheStaticAsset(url, request) {
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (request.mode === 'navigate') return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (url.pathname.startsWith('/condominios')) return false;
  if (url.pathname === '/' || url.pathname.startsWith('/login')) return false;

  return ['style', 'script', 'worker', 'font', 'image', 'manifest'].includes(request.destination)
    || url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || url.pathname.startsWith('/uploads/');
}

async function handlePublicPoolPage(request) {
  const cache = await caches.open(PUBLIC_PAGE_CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Public pool page unavailable');
  }
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (isPublicPoolPage(url, event.request)) {
    event.respondWith(handlePublicPoolPage(event.request));
    return;
  }

  if (!shouldCacheStaticAsset(url, event.request)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const cloned = response.clone();
        caches.open(STATIC_CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
