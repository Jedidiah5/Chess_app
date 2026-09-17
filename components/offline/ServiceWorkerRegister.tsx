"use client";

import { useEffect } from "react";

/**
 * Registers the versioned service worker. No-op off secure contexts / unsupported.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Install may fail on some local hosts; ignore.
    });
  }, []);

  return null;
}
