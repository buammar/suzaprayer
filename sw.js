// Service worker: lets the app open offline and load fast. Bump CACHE when you publish a new version.
const CACHE = "suza-v5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-512-any.png"];
const ASTRONOMY = "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    try { await cache.add(new Request(ASTRONOMY, { mode: "no-cors" })); } catch (e) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // pages: network first, fall back to the cached copy when offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // own files + the astronomy library: cache first
  if (url.origin === self.location.origin || req.url === ASTRONOMY) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && (fresh.ok || fresh.type === "opaque")) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        return cached || Response.error();
      }
    })());
  }
  // everything else (prayer-time API, radio streams, Quran page images) goes straight to the network
});
