self.addEventListener("push", (event) => {
  const fallbackData = {
    title: "Project LIFE",
    body: "予定の時間です",
    url: "/",
  };
  const data = event.data ? event.data.json() : fallbackData;
  const title = data.title || fallbackData.title;
  const options = {
    body: data.body || fallbackData.body,
    icon: "/icons/lifeos-192.png",
    badge: "/icons/lifeos-192.png",
    data: {
      url: data.url || fallbackData.url,
      eventId: data.eventId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        const sameOriginClient = clientList.find((client) =>
          client.url.startsWith(self.location.origin),
        );
        if (sameOriginClient) {
          sameOriginClient.focus();
          return sameOriginClient.navigate(url);
        }
        return self.clients.openWindow(url);
      },
    ),
  );
});
