const CACHE_NAME = 'uretim-rapor-v4';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.map((name) => { if (name !== CACHE_NAME) return caches.delete(name); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini cache'le, POST/PUT/DELETE cache'lenmez
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
