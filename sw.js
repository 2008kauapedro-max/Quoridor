/* =============================================================
   Quoridor Arena — Service Worker (PWA / modo offline)
   -------------------------------------------------------------
   Estratégia:
   • Navegação (abrir o app): rede primeiro, cache como reserva.
   • Arquivos do próprio site: cache primeiro (velocidade máxima).
   • CDN (esm.sh / Supabase): "stale-while-revalidate"
     (usa o cache na hora e atualiza em segundo plano).
   ============================================================= */

const CACHE = "quoridor-arena-v1";

/* Casca do app: o mínimo pra funcionar sem internet */
const CORE = [
  "/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg",
  "/css/theme.css", "/css/main.css", "/css/components.css", "/css/animations.css",
  "/js/main.js", "/js/config.js",
  "/js/core/constants.js", "/js/core/rules.js", "/js/core/ai.js",
  "/js/services/supabase.js", "/js/services/realtime.js", "/js/services/storage.js",
  "/js/ui/board.js", "/js/ui/screens.js", "/js/ui/effects.js"
];

/* ---------- INSTALAÇÃO: pré-cache da casca ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // allSettled: se um arquivo ainda não existir, não quebra a instalação
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

/* ---------- ATIVAÇÃO: limpa caches antigos ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- REQUISIÇÕES ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só interferimos em GET http(s)
  if (req.method !== "GET" || !req.url.startsWith("http")) return;

  /* 1) Abrir o app → rede primeiro; sem internet, serve o index cacheado */
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

  const sameOrigin = new URL(req.url).origin === self.location.origin;

  /* 2) CDN externa (Supabase via esm.sh) → cache imediato + atualização em fundo */
  if (!sameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const refresh = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  /* 3) Arquivos do site → cache primeiro, rede como reserva */
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
    )
  );
});