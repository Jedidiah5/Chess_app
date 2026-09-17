const CACHE_VERSION = "chess-vdev";
const OFFLINE_FALLBACK = "/offline";

/** Paths that must never be cached (auth, realtime, rest, functions). */
function isSupabaseRequest(url) {
  const host = url.hostname;
  if (host.includes("supabase.co") || host.includes("supabase.in")) {
    return true;
  }
  // Local supabase or custom API host via env is covered by path heuristics below
  // when the app proxies â€” prefer host match.
  return false;
}

function isOnlineOnlyNavigation(pathname) {
  if (pathname.startsWith("/play/online")) return true;
  if (pathname.startsWith("/play/") && !pathname.startsWith("/play/local") && !pathname.startsWith("/play/computer")) {
    // /play/[gameId] live games
    if (pathname !== "/play") return true;
  }
  if (pathname.startsWith("/leaderboard")) return true;
  if (pathname.startsWith("/games")) return true;
  if (pathname.startsWith("/join/")) return true;
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/login") || pathname.startsWith("/username")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

const PRECACHE = [
  "/",
  "/play",
  "/play/local",
  "/play/computer",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/stockfish/stockfish.js",
  "/stockfish/stockfish.wasm",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // Skip missing assets during early install; runtime cache fills gaps.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("chess-v") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Rule 1: never cache Supabase â€” network only, no fallback into Cache API.
  if (isSupabaseRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Same-origin only for caching strategy.
  if (url.origin !== self.location.origin) {
    return;
  }

  const pathname = url.pathname;

  // Online-only routes: network only; offline â†’ fallback page.
  if (request.mode === "navigate" && isOnlineOnlyNavigation(pathname)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match(OFFLINE_FALLBACK)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  // Navigations + static: cache-first from versioned cache, network fallback.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(request);
        // Runtime cache same-origin successful GETs (app shell + hashed assets).
        if (response.ok && response.type === "basic") {
          // Do not cache API responses even if same-origin.
          if (!pathname.startsWith("/api/")) {
            void cache.put(request, response.clone());
          }
        }
        return response;
      } catch {
        if (request.mode === "navigate") {
          return (
            (await cache.match(OFFLINE_FALLBACK)) ||
            (await cache.match("/play")) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })(),
  );
});

