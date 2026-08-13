const CACHE = "theRage-arena-v4";
const CORE = [
  "/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg",
  "/css/theme.css", "/css/main.css", "/css/components.css", "/css/animations.css",
  "/js/main.js", "/js/config.js",
  "/js/core/constants.js", "/js/core/rules.js", "/js/core/ai.js",
  "/js/services/supabase.js", "/js/services/realtime.js", "/js/services/storage.js",
  "/js/ui/board.js", "/js/ui/screens.js", "/js/ui/effects.js"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;
  const url = new URL(req.url);
  const isCode = url.pathname.startsWith("/js/") || url.pathname.startsWith("/css/");

  /* Abrir o app: rede primeiro */
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => {
      const c = r.clone(); caches.open(CACHE).then((k) => k.put("/index.html", c)); return r;
    }).catch(() => caches.match("/index.html")));
    return;
  }
  /* JS/CSS: rede primeiro (sempre versão nova), cache só se offline */
  if (isCode) {
    e.respondWith(fetch(req).then((r) => {
      const c = r.clone(); caches.open(CACHE).then((k) => k.put(req, c)); return r;
    }).catch(() => caches.match(req)));
    return;
  }
  /* resto: cache rápido + atualiza em fundo */
  e.respondWith(caches.match(req).then((cached) => {
    const refresh = fetch(req).then((r) => {
      if (r && (r.ok || r.type === "basic")) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(req, c)); }
      return r;
    }).catch(() => cached);
    return cached || refresh;
  }));
});