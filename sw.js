/* =============================================================
   Quoridor Arena — Service Worker v3 (força atualização geral)
   ============================================================= */
const CACHE = "quoridor-arena-v3";   // ← mudar este número "invalida" o cache antigo

const CORE = [
  "/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg",
  "/css/theme.css", "/css/main.css", "/css/components.css", "/css/animations.css",
  "/js/main.js", "/js/config.js",
  "/js/core/constants.js", "/js/core/rules.js", "/js/core/ai.js",
  "/js/services/supabase.js", "/js/services/realtime.js", "/js/services/storage.js",
  "/js/ui/board.js", "/js/ui/screens.js", "/js/ui/effects.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))  // apaga v1/v2
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque" || res.type === "basic")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
