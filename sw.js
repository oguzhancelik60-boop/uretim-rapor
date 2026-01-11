const CACHE_NAME = 'uretim-rapor-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
  // Hemen aktif ol
  self.skipWaiting();
});

// Aktivasyon - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache silindi:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tüm sayfalarda hemen aktif ol
  self.clients.claim();
});

// Fetch isteklerini yakala
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache'de varsa onu döndür
        if (response) {
          return response;
        }
        
        // Yoksa ağdan al ve cache'e ekle
        return fetch(event.request).then((response) => {
          // Geçersiz yanıtları cache'leme
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Yanıtı klonla (stream sadece bir kez okunabilir)
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline ve cache'de yoksa
        return new Response('Offline - Lütfen internet bağlantınızı kontrol edin', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
