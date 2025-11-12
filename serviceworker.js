// ---- Konfig
const BASE = '/ui/';
const VERSION = 'v1';
const CACHE = `printer-ui-${VERSION}`;
const ASSETS = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  // füge deine gebauten Assets hinzu (falls vorhanden):
  // `${BASE}app.js`,
  // `${BASE}app.css`,
  `${BASE}android-chrome-192x192.png`,
  `${BASE}android-chrome-512x512.png`
];

// Install: App-Shell precachen
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: alte Caches löschen
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k.startsWith('printer-ui-') && k !== CACHE ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

// Fetch-Strategien
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // SPA-Navigation -> immer index.html aus Cache
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(`${BASE}index.html`, { ignoreSearch: true })
        .then(r => r || fetch(req))
    );
    return;
  }

  // Gleich-Origin-Assets: Cache-first, dann Netz
  const sameOrigin = new URL(req.url).origin === location.origin;
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(net => {
          const copy = net.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return net;
        })
      )
    );
    return;
  }

  // Externe Ressourcen: Network-first, Fallback Cache
  e.respondWith(
    fetch(req).then(net => {
      const copy = net.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return net;
    }).catch(() => caches.match(req))
  );
});
