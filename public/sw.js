// Speaking Pro service worker: web push notifications for finished analyses
// + PWA asset caching with an elegant offline fallback.

const STATIC_CACHE = "sp-static-v2";

const OFFLINE_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline — Speaking Pro</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#F8FAFC;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0A192F}
  .card{max-width:340px;margin:20px;padding:40px 32px;background:#fff;border-radius:24px;
    box-shadow:0 4px 20px rgba(0,163,255,.08);text-align:center}
  .dot{width:64px;height:64px;border-radius:50%;background:rgba(0,163,255,.1);
    display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px}
  h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#64748B;line-height:1.6;margin:0}
  button{margin-top:20px;padding:12px 28px;border:0;border-radius:999px;background:#00A3FF;
    color:#fff;font-weight:700;font-size:14px;cursor:pointer}
</style></head><body><div class="card"><div class="dot">📡</div>
<h1>Anda Sedang Offline</h1>
<p>Koneksi terputus, tapi tenang — progres latihan Anda hari ini tetap tersimpan.
Sambungkan kembali internet untuk melanjutkan.</p>
<button onclick="location.reload()">Coba Lagi</button></div></body></html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets + icons: cache-first (immutable).
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations: network-first with an offline fallback screen.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // ignore malformed payloads
  }
  const title = data.title || "Speaking Pro";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Analisis rekaman Anda sudah selesai.",
      icon: data.icon || "/stickers/faisal-v2/cheering.png",
      badge: "/icons/icon-192.png",
      vibrate: [80, 40, 80],
      data: { url: data.url || "/history" },
      tag: "speaking-pro-analysis",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/history";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
