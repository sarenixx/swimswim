self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "WOWSA observation due";
  const options = {
    body:
      payload.body || "Open the observation log and capture the swimmer photo.",
    icon: payload.icon || "/manifest-icon-192.svg",
    badge: payload.badge || "/manifest-icon-192.svg",
    tag: payload.tag || "wowsa-observation-reminder",
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url || "/",
      dueAt: payload.dueAt,
      missionId: payload.missionId,
      sessionId: payload.sessionId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const targetUrl = new URL(
        event.notification.data?.url || "/",
        self.location.origin,
      ).href;
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })(),
  );
});
