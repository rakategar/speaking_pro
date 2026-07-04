// Speaking Pro service worker: web push notifications for finished analyses.

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
      data: { url: data.url || "/history" },
      badge: undefined,
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
