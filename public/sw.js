const CACHE_VERSION = "chess-v10d9deb279af";
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
  "/_next/static/chunks/72c373f8.e1f236f5dc71adab.js",
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
  "/_next/static/chunks/b536a0f1.ddfe2ad38bd36eeb.js",
  "/_next/static/chunks/bd904a5c.589bde7b692e844b.js",
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

/**
 * The only HTML documents ever stored. They are client-rendered shells with no
 * per-user data. Every other page (profile, games, leaderboard, settings, live
 * games) may embed session data, so it is network-only.
 */
const SHELL_PAGES = ["/offline", "/play/local", "/play/computer"];

function isSupabaseRequest(url) {
  const host = url.hostname;
  return host.includes("supabase.co") || host.includes("supabase.in");
}

function stripTrailingSlash(pathname) {
  return pathname.replace(/(.)\/$/, "$1");
}

function isShellPage(pathname) {
  return SHELL_PAGES.includes(stripTrailingSlash(pathname));
}

/** Build output, Stockfish, and icons: immutable, never user-specific. */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/stockfish/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest"
  );
}

function isCacheablePath(pathname) {
  return isShellPage(pathname) || isStaticAsset(pathname);
}

function isCacheableResponse(response) {
  return response.ok && response.type === "basic" && !response.redirected;
}

const PRECACHE = [
  ...SHELL_PAGES,
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
        if (isCacheableResponse(response)) {
          await cache.put(url, response);
        }
      } catch {
        // Skip missing assets during early install.
      }
    }),
  );
}

/** Drops anything outside the allowlist, e.g. pages stored by an older worker. */
async function purgeDisallowedEntries(cache) {
  const requests = await cache.keys();
  await Promise.all(
    requests
      .filter((request) => !isCacheablePath(new URL(request.url).pathname))
      .map((request) => cache.delete(request)),
  );
}

async function matchCachedPage(cache, pathname) {
  const bare = stripTrailingSlash(pathname);
  return (
    (await cache.match(bare)) ||
    (await cache.match(bare + "/")) ||
    null
  );
}

function offlineResponse() {
  return new Response("Offline", { status: 503, statusText: "Offline" });
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
      await purgeDisallowedEntries(await caches.open(CACHE_VERSION));
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

  if (isSupabaseRequest(url) || url.origin !== self.location.origin) {
    return;
  }

  const pathname = url.pathname;

  if (pathname === "/clear-sw.html") {
    return;
  }

  // HTML documents: network-first. Only shell pages are stored; everything
  // else falls back to the offline page, never to a cached copy of itself.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        try {
          const response = await fetch(request);
          if (isShellPage(pathname) && isCacheableResponse(response)) {
            void cache.put(stripTrailingSlash(pathname), response.clone());
          }
          return response;
        } catch {
          return (
            (isShellPage(pathname) ? await matchCachedPage(cache, pathname) : null) ||
            (await matchCachedPage(cache, OFFLINE_FALLBACK)) ||
            offlineResponse()
          );
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached =
          (await cache.match(request)) || (await cache.match(pathname));
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (isCacheableResponse(response)) {
            void cache.put(pathname, response.clone());
          }
          return response;
        } catch {
          return offlineResponse();
        }
      })(),
    );
  }

  // Anything else (RSC payloads, /api, images) is left to the network.
});
