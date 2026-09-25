import Link from "next/link";
import { SettingsGearIcon } from "@/components/settings/SettingsGear";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/supabase/profile";
import { isOnboarded } from "@/types/profile";

async function getAuthState() {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await getProfileById(supabase, user.id);
    if (!profile || !isOnboarded(profile)) return null;
    return { username: profile.username };
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const auth = await getAuthState();

  return (
    <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased">
      <div
        className="landing-archival-grain pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center border border-[#1F1915]/30 bg-[#F4EEDB]/80">
              <SettingsGearIcon />
            </span>
            <h1 className="font-serif-title text-4xl font-semibold tracking-tight sm:text-5xl">
              Settings
            </h1>
          </div>
          <Link
            href="/"
            className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/65 hover:text-[#1F1915]"
          >
            Close
          </Link>
        </div>

        <div className="landing-plate-card mt-8 space-y-3">
          <p className="font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/50">
            Board
          </p>
          <SettingsToggles />

          <p className="pt-3 font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/50">
            Account &amp; records
          </p>
          <div className="flex flex-col gap-2">
            {auth ? (
              <>
                <Link
                  href={`/profile/${auth.username}`}
                  className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
                >
                  Your profile
                </Link>
                <Link
                  href="/games"
                  className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
                >
                  Game archive
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
              >
                Log in / sign up
              </Link>
            )}
            <Link
              href="/leaderboard"
              className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
            >
              Leaderboard
            </Link>
          </div>

          <p className="pt-3 font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/50">
            App
          </p>
          <Link
            href="/clear-sw.html"
            className="block border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
          >
            Reset offline cache
          </Link>
          <p className="font-mono-plate text-[9px] leading-relaxed text-[#1F1915]/50">
            Use if the app looks stuck or scripts fail to load after an update.
          </p>
        </div>

        <div className="mt-6 text-center font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/65">
          <Link href="/play" className="hover:text-[#1F1915]">
            Back to play
          </Link>
        </div>
      </div>
    </main>
  );
}
