"use client";

import Link from "next/link";
import { useOnlineStatus } from "@/components/offline/OfflineUI";
import { SettingsGearLink } from "@/components/settings/SettingsGear";

export default function PlayPage() {
  const online = useOnlineStatus();

  return (
    <main className="landing-paper relative min-h-dvh overflow-hidden text-[#1F1915] antialiased">
      <div
        className="landing-archival-grain pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 py-10">
        <SettingsGearLink className="absolute right-5 top-5 sm:right-8 sm:top-8" />

        <h1 className="font-serif-title text-5xl font-semibold tracking-tight sm:text-6xl">
          Play
        </h1>

        <div className="landing-plate-card mt-8 w-full max-w-sm">
          <div className="flex flex-col gap-3">
            {online ? (
              <Link
                href="/play/online"
                className="flex w-full items-center justify-center border border-[#1F1915] bg-[#1F1915] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E] active:scale-[0.99]"
              >
                Play online
              </Link>
            ) : (
              <span className="flex w-full cursor-not-allowed items-center justify-center border border-[#1F1915]/25 bg-[#1F1915]/10 px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/40">
                Online unavailable
              </span>
            )}

            <Link
              href="/play/computer"
              className="flex w-full items-center justify-center border border-[#1F1915] bg-[#E7DFD2] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#1F1915] transition hover:bg-[#1F1915] hover:text-[#E7DFD2] active:scale-[0.99]"
            >
              Play with computer
            </Link>

            <Link
              href="/play/local"
              className="flex w-full items-center justify-center border border-[#1F1915]/50 bg-transparent px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#1F1915] transition hover:border-[#1F1915] hover:bg-[#1F1915]/5 active:scale-[0.99]"
            >
              Pass and play
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[#1F1915]/20 pt-4 font-mono-plate text-[9px] uppercase tracking-[0.18em] text-[#1F1915]/65">
            <Link href="/" className="hover:text-[#1F1915]">
              Home
            </Link>
            {online ? (
              <Link href="/leaderboard" className="hover:text-[#1F1915]">
                Ladder
              </Link>
            ) : (
              <span>Offline</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
