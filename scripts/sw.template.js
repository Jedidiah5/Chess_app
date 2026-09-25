const CACHE_VERSION = "chess-v__SW_BUILD_ID__";
const OFFLINE_FALLBACK = "/offline";

/** Injected at build time from `.next/static` (see build-sw.mjs). */
const BUILD_STATIC = [/* __BUILD_STATIC_ASSETS__ */];

/** Paths that must never be cached (auth, realtime, rest, functions). */
function isSupabaseRequest(url) {
  const host = url.hostname;
  if (host.includes("supabase.co") || host.includes("supabase.in")) {
    return true;
  }
  return false;
}

/** Routes that work fully offline (HTML shell + client logic). */
function isOfflineShellPath(pathname) {
  return (
    pathname === "/play/local" ||
    pathname === "/play/computer" ||
    pathname === "/offline"
  );
}

function isOnlineOnlyNavigation(pathname) {
  if (pathname === "/") return true;
  if (pathname === "/play") return true;
  if (pathname.startsWith("/play/online")) return true;
  if (
    pathname.startsWith("/play/") &&
    !pathname.startsWith("/play/local") &&
    !pathname.startsWith("/play/computer")
  ) {
    return true;
  }
  if (pathname.startsWith("/leaderboard")) return true;
  if (pathname.startsWith("/games")) return true;
  if (pathname.startsWith("/join/")) return true;
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/login") || pathname.startsWith("/username")) {
    return true;
  }
  if (pathname.startsWith("/api/")) return true;
  return false;
}

function isNextAsset(pathname) {
  return pathname.startsWith("/_next/");
}

function isImmutableStatic(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/stockfish/") ||
    pathname.startsWith("/icons/")
  );
}

const PRECACHE = [
  "/play/local",
  "/play/computer",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/stockfish/stockfish.js",
  "/stockfish/stockfish.wasm",
  ...BUILD_STATIC,
];

async function precacheAll(cache) {
  await Promise.all(
    PRECACHE.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // Skip missing assets during early install.
      }
    }),
  );
}

async function matchCachedPage(cache, pathname) {
  return (
    (await cache.match(pathname)) ||
    (await cache.match(pathname + "/")) ||
    null
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await precacheAll(cache);
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

  if (isSupabaseRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  const pathname = url.pathname;
  const cachePromise = caches.open(CACHE_VERSION);

  // Never cache or intercept the one-shot SW reset page.
  if (pathname === "/clear-sw.html") {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate" && isOnlineOnlyNavigation(pathname)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await cachePromise;
          return (
            (await matchCachedPage(cache, OFFLINE_FALLBACK)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  // Offline shell pages: network-first, keep a copy, fall back to cache.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await cachePromise;
        try {
          const response = await fetch(request);
          if (response.ok && isOfflineShellPath(pathname)) {
            void cache.put(pathname, response.clone());
          }
          return response;
        } catch {
          return (
            (await matchCachedPage(cache, pathname)) ||
            (await matchCachedPage(cache, "/play")) ||
            (await matchCachedPage(cache, OFFLINE_FALLBACK)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  // Hashed Next assets + Stockfish + icons: cache-first.
  if (isImmutableStatic(pathname)) {
    event.respondWith(
      (async () => {
        const cache = await cachePromise;
        const cached =
          (await cache.match(request)) || (await cache.match(pathname));
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok && response.type === "basic") {
            void cache.put(pathname, response.clone());
          }
          return response;
        } catch {
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Other /_next requests (RSC, etc.): network, then cache if we have it.
  if (isNextAsset(pathname)) {
    event.respondWith(
      (async () => {
        const cache = await cachePromise;
        try {
          return await fetch(request);
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match(pathname)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
    return;
  }

  // Catch-all: network-first for non-asset requests, no caching of HTML.
  // Only cache static resources (images, fonts, etc.) that aren't covered above.
  event.respondWith(
    (async () => {
      const cache = await cachePromise;
      try {
        const response = await fetch(request);
        // Only cache non-navigation static resources (e.g. images, fonts).
        // Never cache HTML navigations in the catch-all — they may contain session data.
        const isNavigation = request.mode === "navigate";
        const isStaticAsset =
          pathname.endsWith(".svg") ||
          pathname.endsWith(".png") ||
          pathname.endsWith(".jpg") ||
          pathname.endsWith(".woff2") ||
          pathname.endsWith(".woff");
        if (
          response.ok &&
          response.type === "basic" &&
          !isNavigation &&
          isStaticAsset
        ) {
          void cache.put(pathname, response.clone());
        }
        return response;
      } catch {
        return (
          (await cache.match(request)) ||
          (await cache.match(pathname)) ||
          new Response("Offline", { status: 503, statusText: "Offline" })
        );
      }
    })(),
  );
});
