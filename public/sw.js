const V = "ledmap-v10";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rede primeiro, cache como reserva: o app sempre abre a versão publicada mais recente e funciona sem internet.
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const nav = r.mode === "navigate";
  e.respondWith(
    fetch(r, { cache: "no-cache" }).then(res => {
      if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(nav ? "index.html" : r, c)); return res; }
      return caches.match(nav ? "index.html" : r).then(hit => hit || res);
    }).catch(() => caches.match(nav ? "index.html" : r).then(hit => hit || Response.error()))
  );
});
