// Majlis Talimi Umoor - Service Worker (main app + teacher portal)
const CACHE_NAME = 'mtu-app-v2';
const STATIC_ASSETS = [
  './index.html',
  './teacher-portal.html',
  './manifest.json',
  './manifest-teacher.json',
  './app%20icon/majlis_talimi_umoor_app_icon.png',
  './app%20icon/icon-192.png',
  './app%20icon/icon-512.png',
  './app%20icon/icon-maskable-512.png',
  './app%20icon/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Allow Firebase, Google APIs, and external CDNs to be handled dynamically
  if (
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('firebaseio.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('firebasestorage.googleapis.com') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  // Network first with cache fallback for HTML pages so updates are immediate
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then((res) => res || caches.match(url.pathname.includes('teacher-portal') ? './teacher-portal.html' : './index.html')))
    );
    return;
  }

  // Cache first for local static assets (icons, images)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (
        cached ||
        fetch(e.request).then((res) => {
          if (res && res.status === 200 && (url.origin === location.origin || url.hostname.includes('cdnjs') || url.hostname.includes('fonts'))) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 504, statusText: 'Offline' }))
      );
    })
  );
});

