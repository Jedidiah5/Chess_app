const CACHE_VERSION = "chess-vG-K_cGA3iL_5";
const OFFLINE_FALLBACK = "/offline";

/** Injected at build time from `.next/static` (see build-sw.mjs). */
const BUILD_STATIC = [
  "/_next/static/G-K_cGA3iL_5T3e_S-hH_/_buildManifest.js",
  "/_next/static/G-K_cGA3iL_5T3e_S-hH_/_ssgManifest.js",
  "/_next/static/chunks/139.7a5a8e93a21948c1.js",
  "/_next/static/chunks/255-c5a697ddbf82d774.js",
  "/_next/static/chunks/370-8d1ce1fd38fce47f.js",
  "/_next/static/chunks/44530001-70b0ed9ee979e3ff.js",
  "/_next/static/chunks/495-e90a862b55fb281f.js",
  "/_next/static/chunks/4bd1b696-c023c6e3521b1417.js",
  "/_next/static/chunks/619-ba102abea3e3d0e4.js",
  "/_next/static/chunks/646.f342b7cffc01feb0.js",
  "/_next/static/chunks/77-77feb9b64a8b61c5.js",
  "/_next/static/chunks/810.dd1e566eb65b4445.js",
  "/_next/static/chunks/945-1fc1657d0b2e590b.js",
  "/_next/static/chunks/app/(app)/games/[id]/page-df3301830bab4035.js",
  "/_next/static/chunks/app/(app)/games/page-726d48fd66d66d42.js",
  "/_next/static/chunks/app/(app)/leaderboard/page-92143b0fcaf1aa31.js",
  "/_next/static/chunks/app/(app)/profile/[username]/not-found-726d48fd66d66d42.js",
  "/_next/static/chunks/app/(app)/profile/[username]/page-df57721226b9b623.js",
  "/_next/static/chunks/app/(auth)/layout-c01b3ab249c405ad.js",
  "/_next/static/chunks/app/(auth)/login/page-d3adb45716f4a236.js",
  "/_next/static/chunks/app/(auth)/username/page-7ea590dcc0c7e232.js",
  "/_next/static/chunks/app/(marketing)/scene-preview/page-6c60210f8429c93f.js",
  "/_next/static/chunks/app/_not-found/page-efed066a7a8aff3e.js",
  "/_next/static/chunks/app/api/offline-games/upload/route-c01b3ab249c405ad.js",
  "/_next/static/chunks/app/auth/callback/route-c01b3ab249c405ad.js",
  "/_next/static/chunks/app/join/[code]/page-27e7d2dc71375b0c.js",
  "/_next/static/chunks/app/layout-8358a5d97498b2ab.js",
  "/_next/static/chunks/app/offline/page-c01b3ab249c405ad.js",
  "/_next/static/chunks/app/page-a75d64c706d9df42.js",
  "/_next/static/chunks/app/paint-check/page-6eabbef4a005932e.js",
  "/_next/static/chunks/app/paper-preview/page-61bde24db8902c51.js",
  "/_next/static/chunks/app/play/[gameId]/page-8a5275e5a0a7ad6b.js",
  "/_next/static/chunks/app/play/computer/page-18a1d6f923cb593e.js",
  "/_next/static/chunks/app/play/local/page-d246fdad36b2ebf0.js",
  "/_next/static/chunks/app/play/online/page-a9faf4f047095410.js",
  "/_next/static/chunks/app/play/page-0ba792e1a706ea67.js",
  "/_next/static/chunks/framework-085cf39580498177.js",
  "/_next/static/chunks/main-6da0cd059aa3577d.js",
  "/_next/static/chunks/main-app-772c78dc257f08df.js",
  "/_next/static/chunks/pages/_app-82835f42865034fa.js",
  "/_next/static/chunks/pages/_error-013f4188946cdd04.js",
  "/_next/static/chunks/polyfills-42372ed130431b0a.js",
  "/_next/static/chunks/webpack-ff82ec706b165d78.js",
  "/_next/static/css/309827d0a813431d.css",
  "/_next/static/media/5611c55482296524-s.p.woff2",
  "/_next/static/media/665e920483964785-s.woff2",
  "/_next/static/media/7088c2b12ccac062-s.woff2"
];

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
