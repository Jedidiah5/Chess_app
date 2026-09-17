"use client";

import { useEffect } from "react";

/**
 * Registers the versioned service worker in production only.
 * In development, actively unregisters any existing SW and clears app caches —
 * otherwise a prior build serves stale HTML and 404s /_next chunks.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      void (async () => {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith("chess-v"))
              .map((key) => caches.delete(key)),
          );
        }
      })();
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Install may fail on some local hosts; ignore.
    });
  }, []);

  return null;
}
