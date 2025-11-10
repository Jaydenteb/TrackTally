export const runtime = "nodejs";

const PRECACHE_ASSETS = ["/", "/manifest.json"];

const swSource = `
  const CACHE_NAME = "tracktally-shell-v1";
  const PRECACHE_ASSETS = ${JSON.stringify(PRECACHE_ASSETS)};

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    if (request.mode === "navigate") return;
    if (request.url.includes("/api/")) return;
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.origin !== self.location.origin) return;
    } catch {
      return;
    }

    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
        return cached ?? networkFetch;
      })
    );
  });
`;

export function GET() {
  return new Response(swSource, {
    headers: {
      "content-type": "application/javascript",
      "cache-control": "public, max-age=0, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
