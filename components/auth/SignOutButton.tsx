"use client";

import { useState } from "react";
import { clearOfflineData } from "@/lib/offline/db";
import { tryUploadPendingOfflineGames } from "@/lib/offline/upload";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    // Upload needs the session, so it runs before sign-out; anything that
    // still fails is dropped rather than left to upload into the next account.
    await tryUploadPendingOfflineGames();
    try {
      await clearOfflineData();
    } catch {
      // IndexedDB unavailable: nothing stored to clear.
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={
        className ??
        "border border-[#1F1915]/50 px-4 py-2 font-mono-plate text-[10px] font-bold uppercase tracking-[0.2em] text-[#1F1915] hover:border-[#1F1915] hover:bg-[#1F1915]/5"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
