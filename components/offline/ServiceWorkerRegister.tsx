"use client";

import { useEffect } from "react";

/**
 * Production (`next start` / deployed): register versioned SW (works on
 * localhost too, so airplane-mode can be tested before deploy).
 * `next dev`: never register; unregister any existing SW and wipe caches.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      void (async () => {
        const hadController = Boolean(navigator.serviceWorker.controller);
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        // Controller was serving a poisoned page; one hard reload clears it.
        if (hadController && !sessionStorage.getItem("chess-sw-reloaded")) {
          sessionStorage.setItem("chess-sw-reloaded", "1");
          window.location.reload();
        }
      })();
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // A new deploy stamps a new cache version; reload once so offline
        // shell picks up the fresh precache without a manual reinstall.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "activated" &&
              navigator.serviceWorker.controller &&
              !sessionStorage.getItem("chess-sw-updated")
            ) {
              sessionStorage.setItem("chess-sw-updated", "1");
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  return null;
}
