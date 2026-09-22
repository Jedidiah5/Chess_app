"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useAppSettings } from "@/components/settings/useAppSettings";
import { SettingsGearButton } from "@/components/settings/SettingsGear";

type GameSettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Leave the current game and return to the play menu. */
  onQuit: () => void;
  quitLabel?: string;
};

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border border-[#1F1915]/20 bg-[#F4EEDB]/70 px-3 py-3">
      <span className="font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915]">
        {label}
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#1F1915]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function GameSettingsSheet({
  open,
  onClose,
  onQuit,
  quitLabel = "Quit game",
}: GameSettingsSheetProps) {
  const titleId = useId();
  const {
    settings,
    setShowScoreSheet,
    setShowLegalMoves,
    setAutoFlipBoard,
  } = useAppSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F1915]/35 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="landing-plate-card w-full max-w-sm outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id={titleId}
            className="font-serif-title text-2xl font-semibold tracking-tight text-[#1F1915]"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono-plate text-[9px] font-bold uppercase tracking-[0.2em] text-[#1F1915]/60 hover:text-[#1F1915]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <ToggleRow
            label="Score sheet"
            checked={settings.showScoreSheet}
            onChange={setShowScoreSheet}
          />
          <ToggleRow
            label="Legal moves"
            checked={settings.showLegalMoves}
            onChange={setShowLegalMoves}
          />
          <ToggleRow
            label="Auto-flip board"
            checked={settings.autoFlipBoard}
            onChange={setAutoFlipBoard}
          />

          <Link
            href="/settings"
            onClick={onClose}
            className="block border border-[#1F1915]/25 bg-transparent px-3 py-3 text-center font-mono-plate text-[10px] font-bold uppercase tracking-[0.18em] text-[#1F1915]/75 transition hover:border-[#1F1915] hover:text-[#1F1915]"
          >
            All settings
          </Link>

          <button
            type="button"
            className="w-full border border-[#1F1915] bg-[#1F1915] px-5 py-3.5 font-mono-plate text-[11px] font-bold uppercase tracking-[0.2em] text-[#E7DFD2] transition hover:bg-[#2D241E] active:scale-[0.99]"
            onClick={() => {
              const ok = settings.confirmQuit
                ? window.confirm(
                    "Quit this game and return to the play menu?",
                  )
                : true;
              if (ok) {
                onQuit();
                onClose();
              }
            }}
          >
            {quitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { SettingsGearButton };
