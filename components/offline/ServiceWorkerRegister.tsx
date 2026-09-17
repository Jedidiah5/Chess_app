"use client";

import { useEffect } from "react";

function isLocalHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

/**
 * Production: register versioned SW.
 * Local/dev: never register; unregister any existing SW and wipe caches.
 * (Must not wait on React alone — a broken controlling SW blocks hydration.)
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const local = isLocalHost() || process.env.NODE_ENV === "development";

    if (local) {
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

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // ignore
    });
  }, []);

  return null;
}
