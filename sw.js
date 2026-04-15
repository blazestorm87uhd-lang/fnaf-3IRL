// Service Worker — Three Nights at Chez Moi IRL
// v2 — cache complet pour mode hors ligne
const CACHE = 'fnaf-irl-v2';

// Pages et assets à pré-cacher à l'installation
const PRECACHE_PAGES = [
  '/index.html',
  '/game.html',
  '/game2.html',
  '/game3.html',
  '/game-nightmare.html',
  '/custom-night.html',
  '/bonus.html',
  '/minigame.html',
  '/manifest.json',
];

const PRECACHE_ASSETS = [
  // CSS
  '/css/global.css',
  '/css/loader.css',
  '/css/menu.css',
  '/css/game.css',
  '/css/game2.css',
  '/css/game3.css',
  '/css/game-nightmare.css',
  '/css/custom-night.css',
  '/css/bonus.css',
  // JS
  '/js/save.js',
  '/js/achievements.js',
  '/js/loader.js',
  '/js/menu.js',
  '/js/options.js',
  '/js/gamepad.js',
  '/js/gamepad-overlay.js',
  '/js/game.js',
  '/js/game2.js',
  '/js/game3.js',
  '/js/game-nightmare.js',
  '/js/custom-night.js',
  '/js/bonus.js',
  // Icônes
  '/assets/icons/icon-32.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/logo-menu.png',
  '/assets/icons/night-1.png',
  '/assets/icons/night-2.png',
  '/assets/icons/night-3.png',
  '/assets/icons/nightmare.png',
  '/assets/icons/custom-night.png',
  // Audio principal
  '/assets/audio/menu.mp3',
  '/assets/audio/bonus.mp3',
  '/assets/audio/merci.m4a',
  '/assets/audio/dead.mp3',
];

// Installation : pré-cacher pages + assets essentiels
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Pages HTML — ignorer les erreurs individuelles
      const pagePromises = PRECACHE_PAGES.map(url =>
        cache.add(url).catch(() => console.warn('SW: skip', url))
      );
      // Assets — ignorer les erreurs individuelles
      const assetPromises = PRECACHE_ASSETS.map(url =>
        cache.add(url).catch(() => console.warn('SW: skip', url))
      );
      return Promise.all([...pagePromises, ...assetPromises]);
    }).then(() => self.skipWaiting())
  );
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : stratégie mixte
// - HTML → network-first (toujours à jour si en ligne)
// - Images & Audio → cache-first (économie de bande passante)
// - JS & CSS → cache-first avec mise à jour en arrière-plan
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Ignorer les requêtes non-GET et les externes (fonts Google, etc.)
  if (e.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) && 
      !url.hostname.includes('netlify') &&
      !url.hostname.includes('fonts.gstatic') &&
      !url.hostname.includes('fonts.googleapis')) return;

  const isHTML  = e.request.destination === 'document';
  const isMedia = ['image','audio','video'].includes(e.request.destination);
  const isFont  = e.request.destination === 'font' || url.hostname.includes('fonts');

  if (isMedia || isFont) {
    // Cache-first : idéal pour images et audio (fichiers lourds)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => caches.match(e.request));
      })
    );
  } else if (isHTML) {
    // Network-first pour HTML
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Stale-while-revalidate pour JS/CSS
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
  }
});
