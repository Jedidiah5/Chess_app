const CACHE_VERSION = "chess-v__SW_BUILD_ID__";
const OFFLINE_FALLBACK = "/offline";

/** Injected at build time from `.next/static` (see build-sw.mjs). */
const BUILD_STATIC = [/* __BUILD_STATIC_ASSETS__ */];

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
