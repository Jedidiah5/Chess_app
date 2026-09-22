"use client";

import { useEffect } from "react";

function isLocalHost() {
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  );
}

/**
 * Register the PWA service worker only on a real deployed host.
 * Never on localhost — a leftover SW here caches Next HTML against the
 * wrong `/_next` chunks and surfaces as CSP `script-src 'none'`.
 *
 * `next dev`: always unregister + wipe caches.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const wipeLocal = async () => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if (hadController && !sessionStorage.getItem("chess-sw-reloaded")) {
        sessionStorage.setItem("chess-sw-reloaded", "1");
        window.location.reload();
      }
    };

    if (process.env.NODE_ENV === "development" || isLocalHost()) {
      void wipeLocal();
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
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
