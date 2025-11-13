const CACHE_NAME = "printer-app-v1";

// Minimal precache (App Shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH — Toddle-kompatible Strategie
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nur GET
  if (req.method !== "GET") return;

  // 1) Navigation: network first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          return (await caches.match(req)) || (await caches.match('/index.html'));
        })
    );
    return;
  }

  // 2) Assets (CSS, JS, images, fonts): cache first + dynamic cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          // Wenn offline und nichts im Cache → Fehler
          return new Response("", { status: 504, statusText: "Offline" });
        });
    })
  );
});
