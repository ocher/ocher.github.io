// Offline support: network first (so a new deploy shows up immediately),
// cached copy when the network is unavailable.
const CACHE = "tuner-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          // The build gives the script a new hashed name each time; drop the old ones.
          if (req.mode === "navigate") await pruneScripts(cache, await res.clone().text());
        }
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});

async function pruneScripts(cache, html) {
  for (const key of await cache.keys()) {
    const name = new URL(key.url).pathname.split("/").pop();
    if (name.endsWith(".js") && name !== "sw.js" && !html.includes(name)) await cache.delete(key);
  }
}
