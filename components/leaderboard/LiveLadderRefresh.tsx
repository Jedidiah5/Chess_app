"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 30_000;
const DEBOUNCE_MS = 800;

/**
 * Re-renders the server leaderboard when any profile changes. Polling and
 * tab-focus refresh cover projects where profiles isn't in the realtime
 * publication yet (migration 0006).
 */
export function LiveLadderRefresh() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let timer: number | null = null;
    const refresh = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        router.refresh();
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("ladder")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        refresh,
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return null;
}
