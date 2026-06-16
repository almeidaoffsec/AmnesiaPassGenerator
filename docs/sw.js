const CACHE_NAME = "apg-static-v5";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./crypto-js.min.js",
  "./manifest.json",
  "./assets/brand/almeidaoffsec_logo_light_H.svg",
  "./assets/brand/Logo.svg",
  "./assets/brand/almeidaoffsec-icon-192.png",
  "./assets/brand/almeidaoffsec-icon-512.png"
];
const HTML_REQUEST = "./index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(HTML_REQUEST, responseClone));
          return response;
        })
        .catch(() => caches.match(HTML_REQUEST))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        if (request.method === "GET" && url.origin === self.location.origin) {
          fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            })
            .catch(() => {});
        }
        return cached;
      }
      return fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
