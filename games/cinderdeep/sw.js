'use strict';
// Offline support for the installed app. Everything the game needs is cached on first launch, so it opens
// with no connection. Files are served from the cache and refreshed in the background, so an update shows
// up the next time the app is opened. Bump VERSION to force a full re-download.
const VERSION = 'cinderdeep-v2';
const FONTS = 'cinderdeep-fonts';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './js/util.js', './js/rooms.js', './js/audio.js', './js/input.js', './js/art.js',
  './js/world.js', './js/player.js', './js/enemies.js', './js/boss.js', './js/game.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function staleWhileRevalidate(cacheName, request, cacheKey) {
  return caches.open(cacheName).then((cache) =>
    cache.match(cacheKey || request, { ignoreSearch: true }).then((hit) => {
      const fresh = fetch(request).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(cacheKey || request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || fresh;
    }),
  );
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(FONTS, req));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // The app's own address, with or without index.html or a ?query, opens the cached game page.
  // Any other page under this folder (such as dist/) is cached under its own address.
  const scope = new URL(self.registration.scope).pathname;
  const isApp = req.mode === 'navigate' && (url.pathname === scope || url.pathname === scope + 'index.html');
  const key = isApp ? new URL('./index.html', self.registration.scope).href : undefined;
  e.respondWith(staleWhileRevalidate(VERSION, req, key));
});
