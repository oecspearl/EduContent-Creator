const CACHE_NAME = "oecs-v1";
const STATIC_ASSETS = ["/", "/favicon.png"];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first, queue failed POST/PUT for retry
  if (url.pathname.startsWith("/api/")) {
    if (event.request.method === "GET") {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Cache successful GET responses for offline access
            if (response.ok && url.pathname.includes("/content/")) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
    } else if (event.request.method === "POST" && url.pathname.includes("/progress")) {
      // Queue progress updates for retry when offline
      event.respondWith(
        fetch(event.request.clone()).catch(() => {
          // Store failed request for later sync
          return saveForSync(event.request.clone()).then(
            () => new Response(JSON.stringify({ queued: true }), {
              headers: { "Content-Type": "application/json" },
            })
          );
        })
      );
    }
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Background sync for queued requests
async function saveForSync(request) {
  const body = await request.text();
  const stored = JSON.parse(localStorage.getItem("oecs-sync-queue") || "[]");
  stored.push({ url: request.url, method: request.method, body, timestamp: Date.now() });
  localStorage.setItem("oecs-sync-queue", JSON.stringify(stored));
}

// Retry queued requests when back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-progress") {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  const stored = JSON.parse(localStorage.getItem("oecs-sync-queue") || "[]");
  const remaining = [];

  for (const item of stored) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: item.body,
      });
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem("oecs-sync-queue", JSON.stringify(remaining));
}
