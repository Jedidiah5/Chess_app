"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { tryUploadPendingOfflineGames } from "@/lib/offline/upload";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
}

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] bg-[#2c2a26] px-3 py-1.5 text-center text-xs text-[#f4efe4]"
      role="status"
    >
      You&apos;re offline — pass &amp; play and vs computer still work
    </div>
  );
}

/** Online-only gate: clear message, never a spinner forever. */
export function OfflineGate({
  children,
  feature = "This feature",
}: {
  children: React.ReactNode;
  feature?: string;
}) {
  const online = useOnlineStatus();
  if (!online) {
    return (
      <main className="min-h-screen bg-[#ebe4d6] px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-semibold text-stone-900">You&apos;re offline</h1>
          <p className="mt-3 text-sm text-stone-600">
            {feature} needs a connection. Pass &amp; play and vs computer work without
            one.
          </p>
          <a
            href="/play"
            className="mt-6 inline-block text-sm text-stone-800 underline-offset-2 hover:underline"
          >
            Back to play menu
          </a>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

export function OfflineUploadOnReconnect() {
  const online = useOnlineStatus();
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (!online) {
      setRan(false);
      return;
    }
    if (ran) return;
    setRan(true);
    void tryUploadPendingOfflineGames();
  }, [online, ran]);

  return null;
}
