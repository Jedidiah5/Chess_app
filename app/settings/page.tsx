"use client";

import Link from "next/link";
import { useAppSettings } from "@/components/settings/useAppSettings";
import { SettingsGearIcon } from "@/components/settings/SettingsGear";

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border border-[#1F1915]/20 bg-[#F4EEDB]/70 px-3 py-3">
      <div className="min-w-0">
        <p className="font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915]">
          {label}
        </p>
        <p className="mt-1 font-mono-plate text-[9px] leading-relaxed text-[#1F1915]/55">
          {description}
        </p>
      </div>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F1915]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function SettingsPage() {
  const {
    settings,
    setShowScoreSheet,
    setConfirmQuit,
    setAutoFlipBoard,
    setShowLegalMoves,
  } = useAppSettings();

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
          <ToggleRow
            label="Score sheet"
            description="Show the move list beside the board during games."
            checked={settings.showScoreSheet}
            onChange={setShowScoreSheet}
          />
          <ToggleRow
            label="Legal moves"
            description="Highlight squares a selected piece can move to."
            checked={settings.showLegalMoves}
            onChange={setShowLegalMoves}
          />
          <ToggleRow
            label="Auto-flip board"
            description="In pass & play, turn the board toward the side to move."
            checked={settings.autoFlipBoard}
            onChange={setAutoFlipBoard}
          />

          <p className="pt-3 font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/50">
            Gameplay
          </p>
          <ToggleRow
            label="Confirm quit"
            description="Ask before leaving a game from the settings menu."
            checked={settings.confirmQuit}
            onChange={setConfirmQuit}
          />

          <p className="pt-3 font-mono-plate text-[8px] font-bold uppercase tracking-[0.22em] text-[#1F1915]/50">
            Account &amp; records
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
            >
              Log in / account
            </Link>
            <Link
              href="/leaderboard"
              className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
            >
              Leaderboard
            </Link>
            <Link
              href="/games"
              className="border border-[#1F1915]/25 bg-[#F4EEDB]/60 px-3 py-3 font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915] transition hover:border-[#1F1915]"
            >
              Game archive
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
