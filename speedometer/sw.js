const CACHE_NAME = "speedometer-shell-v1";
const CORE_ASSETS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(CORE_ASSETS.map((url) => new Request(url, { cache: "reload" })))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function fromCacheOrNetwork(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkFetch;
    return cached;
  }

  const network = await networkFetch;
  if (network) return network;

  if (request.mode === "navigate") {
    return (
      (await cache.match("./index.html", { ignoreSearch: true })) ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    );
  }

  return new Response("Offline", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(fromCacheOrNetwork(req));
});
