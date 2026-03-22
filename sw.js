// CISSP MasterGuide — Service Worker
// Caches all pages for offline study

const CACHE_NAME = 'cissp-masterguide-v1';
const OFFLINE_URLS = [
  '/cissp-study/',
  '/cissp-study/index.html',
  '/cissp-study/cissp-flashcards.html',
  '/cissp-study/cissp-exam-prep.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// ── INSTALL: cache all core files ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(OFFLINE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: serve from cache, fall back to network ──
self.addEventListener('fetch', event => {
  // Skip non-GET and browser extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // News feed — always try network first (live data)
  if (event.request.url.includes('rss2json') ||
      event.request.url.includes('allorigins') ||
      event.request.url.includes('corsproxy') ||
      event.request.url.includes('feedburner')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({status:'error',items:[]}),
          {headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }

  // App shell — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new pages as they're visited
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('/cissp-study/index.html');
      });
    })
  );
});
