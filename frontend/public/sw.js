const CACHE_NAME = "yoga-walk-cache-v1";
const URLS_TO_CACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// NEW: Handle incoming Push Notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Time for a Yoga Walk!";
  const options = {
    body: data.body || "Keep your streak alive. 🌿",
    icon: "/icons/icon-192x192.png", // Make sure this icon exists in public/icons
    badge: "/icons/badge-72x72.png", // Optional: small monochrome icon
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// NEW: Handle Notification Clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) return client.focus();
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});