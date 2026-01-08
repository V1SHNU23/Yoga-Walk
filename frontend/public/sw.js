const CACHE_NAME = "yoga-walk-cache-v2"; // Bumped version
const URLS_TO_CACHE = ["/", "/manifest.webmanifest"];

// 1. INSTALL: Cache core assets and activate immediately
self.addEventListener("install", (event) => {
  // force this service worker to become the active service worker
  self.skipWaiting(); 

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  // force the service worker to control the clients/pages immediately
  event.waitUntil(clients.claim());

  // Remove old caches that don't match the current CACHE_NAME
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. FETCH: Network First, Fallback to Cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests (like POST)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the network fetch is successful, clone it and update the cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), try to return from cache
        return caches.match(event.request);
      })
  );
});

// --- PUSH NOTIFICATIONS (Keep existing logic) ---
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Time for a Yoga Walk!";
  const options = {
    body: data.body || "Keep your streak alive. 🌿",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- NOTIFICATION CLICKS (Keep existing logic) ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});