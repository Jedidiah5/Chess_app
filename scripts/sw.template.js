const CACHE_VERSION = "chess-v__SW_BUILD_ID__";
const OFFLINE_FALLBACK = "/offline";

const IS_LOCAL =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.endsWith(".local");

/**
 * Dev / local: never intercept. Unregister and wipe caches so a prior
 * production SW cannot keep serving stale HTML (script-src 'none' / 404 chunks).
 */
if (IS_LOCAL) {
  self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("chess-v") || key.startsWith("workbox-"))
            .map((key) => caches.delete(key)),
        );
        await self.registration.unregister();
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clients) {
          client.postMessage({ type: "chess-sw-cleared" });
        }
        await self.clients.claim();
      })(),
    );
  });
} else {
  /** Paths that must never be cached (auth, realtime, rest, functions). */
  function isSupabaseRequest(url) {
    const host = url.hostname;
    if (host.includes("supabase.co") || host.includes("supabase.in")) {
      return true;
    }
    return false;
  }

  function isOnlineOnlyNavigation(pathname) {
    if (pathname.startsWith("/play/online")) return true;
    if (
      pathname.startsWith("/play/") &&
      !pathname.startsWith("/play/local") &&
      !pathname.startsWith("/play/computer")
    ) {
      if (pathname !== "/play") return true;
    }
    if (pathname.startsWith("/leaderboard")) return true;
    if (pathname.startsWith("/games")) return true;
    if (pathname.startsWith("/join/")) return true;
    if (pathname.startsWith("/profile")) return true;
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
              // Skip missing assets during early install.
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

    if (isSupabaseRequest(url)) {
      event.respondWith(fetch(request));
      return;
    }

    if (url.origin !== self.location.origin) {
      return;
    }

    const pathname = url.pathname;
    const cachePromise = caches.open(CACHE_VERSION);

    if (request.mode === "navigate" && isOnlineOnlyNavigation(pathname)) {
      event.respondWith(
        (async () => {
          try {
            return await fetch(request);
          } catch {
            const cache = await cachePromise;
            return (
              (await cache.match(OFFLINE_FALLBACK)) ||
              new Response("Offline", { status: 503, statusText: "Offline" })
            );
          }
        })(),
      );
      return;
    }

    // Never cache or intercept the one-shot SW reset page.
    if (pathname === "/clear-sw.html") {
      event.respondWith(fetch(request));
      return;
    }

    // Network-first for app HTML. Do NOT cache Next navigations — hashed
    // /_next chunks change every build; stale HTML + missing chunks surfaces
    // as CSP script-src 'none' and blank pages.
    if (request.mode === "navigate") {
      event.respondWith(
        (async () => {
          const cache = await cachePromise;
          try {
            return await fetch(request);
          } catch {
            return (
              (await cache.match(OFFLINE_FALLBACK)) ||
              (await cache.match("/play")) ||
              new Response("Offline", { status: 503, statusText: "Offline" })
            );
          }
        })(),
      );
      return;
    }

    if (isNextAsset(pathname) && !isImmutableStatic(pathname)) {
      event.respondWith(fetch(request));
      return;
    }

    if (isImmutableStatic(pathname)) {
      event.respondWith(
        (async () => {
          const cache = await cachePromise;
          const cached = await cache.match(request);
          if (cached) return cached;
          try {
            const response = await fetch(request);
            if (response.ok && response.type === "basic") {
              void cache.put(request, response.clone());
            }
            return response;
          } catch {
            return new Response("Offline", { status: 503, statusText: "Offline" });
          }
        })(),
      );
      return;
    }

    event.respondWith(
      (async () => {
        const cache = await cachePromise;
        try {
          const response = await fetch(request);
          if (
            response.ok &&
            response.type === "basic" &&
            !pathname.startsWith("/api/")
          ) {
            void cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (
            (await cache.match(request)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })(),
    );
  });
}
