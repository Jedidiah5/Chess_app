"use client";

import { useAppSettings } from "@/components/settings/useAppSettings";

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

export function SettingsToggles() {
  const {
    settings,
    setShowScoreSheet,
    setConfirmQuit,
    setAutoFlipBoard,
    setShowLegalMoves,
  } = useAppSettings();

  return (
    <>
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
    </>
  );
}
