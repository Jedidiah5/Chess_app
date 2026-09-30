"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PlateNotice } from "@/components/ui/PlatePage";
import { eyebrow, primaryBtn, secondaryBtn } from "@/components/ui/plateStyles";
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
      className="fixed left-0 right-0 top-0 z-[60] bg-[#1F1915] px-3 py-1.5 text-center font-mono-plate text-[9px] font-bold uppercase tracking-[0.18em] text-[#E7DFD2]"
      role="status"
    >
      Offline · pass &amp; play and vs computer still work
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
      <PlateNotice>
        <p className={eyebrow}>No connection</p>
        <h1 className="mt-2 font-serif-title text-4xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="mt-3 font-mono-plate text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[#1F1915]/65">
          {feature} needs a connection. Pass &amp; play and vs computer work
          without one.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a href="/play/computer" className={primaryBtn}>
            Play with computer
          </a>
          <a href="/play/local" className={secondaryBtn}>
            Pass and play
          </a>
        </div>
      </PlateNotice>
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
