// Offline cache for this app. Version changes whenever any file changes.
const CACHE = 'tch-meal-planner-full-5b7222e9ac';
const FILES = ["./", "app.js", "base.css", "config.js", "icon-180.png", "icon-192.png", "icon-512.png", "ics.js", "index.html", "install.js", "manifest.webmanifest", "recipes.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tch-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match('./index.html'))));
});
