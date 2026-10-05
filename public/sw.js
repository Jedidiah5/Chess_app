const CACHE_VERSION = "chess-vD-TxfYeUpO3X";
const OFFLINE_FALLBACK = "/offline";

/** Injected at build time from `.next/static` (see build-sw.mjs). */
const BUILD_STATIC = [
  "/_next/static/D-TxfYeUpO3XKMQl3PCd7/_buildManifest.js",
  "/_next/static/D-TxfYeUpO3XKMQl3PCd7/_ssgManifest.js",
  "/_next/static/chunks/139.7a5a8e93a21948c1.js",
  "/_next/static/chunks/237-19bd4f2a713e8243.js",
  "/_next/static/chunks/255-c5a697ddbf82d774.js",
  "/_next/static/chunks/370-8d1ce1fd38fce47f.js",
  "/_next/static/chunks/39.cccb653288693521.js",
  "/_next/static/chunks/418-2366afab73e18ae2.js",
  "/_next/static/chunks/44530001-70b0ed9ee979e3ff.js",
  "/_next/static/chunks/4bd1b696-c023c6e3521b1417.js",
  "/_next/static/chunks/619-ba102abea3e3d0e4.js",
  "/_next/static/chunks/646.f342b7cffc01feb0.js",
  "/_next/static/chunks/72c373f8.426e3ff925d41525.js",
  "/_next/static/chunks/77-77feb9b64a8b61c5.js",
  "/_next/static/chunks/847.fad46e53024567cb.js",
  "/_next/static/chunks/918.50fdc41209bfd3ab.js",
  "/_next/static/chunks/945-1fc1657d0b2e590b.js",
  "/_next/static/chunks/960-45fe13fc831a2e9c.js",
  "/_next/static/chunks/app/(app)/games/[id]/page-16ec698b694b4a6a.js",
  "/_next/static/chunks/app/(app)/games/page-54a84906b35002d2.js",
  "/_next/static/chunks/app/(app)/leaderboard/page-75e338a81c362325.js",
  "/_next/static/chunks/app/(app)/profile/[username]/not-found-464058b0d1357755.js",
  "/_next/static/chunks/app/(app)/profile/[username]/page-3d46f655c86f990c.js",
  "/_next/static/chunks/app/(auth)/layout-a5762e81fb5301e9.js",
  "/_next/static/chunks/app/(auth)/login/page-4122746b5ee0c5b8.js",
  "/_next/static/chunks/app/(auth)/username/page-4250c0913c4a2758.js",
  "/_next/static/chunks/app/(marketing)/scene-preview/page-e1b4c32fa9dcf8ae.js",
  "/_next/static/chunks/app/_not-found/page-a5762e81fb5301e9.js",
  "/_next/static/chunks/app/api/offline-games/upload/route-a5762e81fb5301e9.js",
  "/_next/static/chunks/app/auth/callback/route-a5762e81fb5301e9.js",
  "/_next/static/chunks/app/join/[code]/page-df8174554aac4659.js",
  "/_next/static/chunks/app/layout-12619b2d399da041.js",
  "/_next/static/chunks/app/not-found-54a84906b35002d2.js",
  "/_next/static/chunks/app/offline/page-bd26339a1c83f3a9.js",
  "/_next/static/chunks/app/page-f68c5a9310a1b75b.js",
  "/_next/static/chunks/app/paint-check/page-6eabbef4a005932e.js",
  "/_next/static/chunks/app/paper-preview/page-61bde24db8902c51.js",
  "/_next/static/chunks/app/play/[gameId]/page-9f128f229a30af52.js",
  "/_next/static/chunks/app/play/computer/page-a0bce16cdbe2bceb.js",
  "/_next/static/chunks/app/play/local/page-9dd3ae1178ab72d4.js",
  "/_next/static/chunks/app/play/online/page-57c7d983ea331d3a.js",
  "/_next/static/chunks/app/play/page-6b74922afe79f901.js",
  "/_next/static/chunks/app/settings/page-4a9e1753fba115d3.js",
  "/_next/static/chunks/b536a0f1.ddfe2ad38bd36eeb.js",
  "/_next/static/chunks/bd904a5c.589bde7b692e844b.js",
  "/_next/static/chunks/framework-085cf39580498177.js",
  "/_next/static/chunks/main-6da0cd059aa3577d.js",
  "/_next/static/chunks/main-app-772c78dc257f08df.js",
  "/_next/static/chunks/pages/_app-82835f42865034fa.js",
  "/_next/static/chunks/pages/_error-013f4188946cdd04.js",
  "/_next/static/chunks/polyfills-42372ed130431b0a.js",
  "/_next/static/chunks/webpack-6a7af7085453cf91.js",
  "/_next/static/css/d2e9bbdf66922fa1.css",
  "/_next/static/media/272c17ecaad3395d-s.p.woff2",
  "/_next/static/media/4b9bb515ce6d026f-s.p.woff2",
  "/_next/static/media/5611c55482296524-s.p.woff2",
  "/_next/static/media/736f18f52e8d5d72-s.p.woff2",
  "/_next/static/media/7b89a4fd5e90ede0-s.p.woff2",
  "/_next/static/media/806de4d605d3ad01-s.p.woff2",
  "/_next/static/media/a273567b21a7c318-s.p.woff2",
  "/_next/static/media/e18f83c737786aa7-s.p.woff2",
  "/_next/static/media/fc727f226c737876-s.p.woff2"
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
