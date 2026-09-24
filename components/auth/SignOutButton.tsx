"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={
        className ??
        "border border-[#1F1915]/50 px-4 py-2 font-mono-plate text-[10px] font-bold uppercase tracking-[0.2em] text-[#1F1915] hover:border-[#1F1915] hover:bg-[#1F1915]/5"
      }
    >
      Sign out
    </button>
  );
}
