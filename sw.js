// Service Worker — Three Nights at Chez Moi IRL
const CACHE = 'fnaf-irl-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/global.css',
  '/css/loader.css',
  '/css/menu.css',
  '/js/save.js',
  '/js/achievements.js',
  '/js/loader.js',
  '/js/menu.js',
  '/js/options.js',
  '/js/gamepad.js',
  '/js/gamepad-overlay.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/audio/menu.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Stratégie : network-first, fallback cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
