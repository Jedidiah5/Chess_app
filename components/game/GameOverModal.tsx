"use client";

import type { ReactNode } from "react";
import type { DbEndReason, DbGameResult } from "@/types/game";
import type { EndReason, GameResult } from "@/lib/chess/types";

type GameOverModalProps = {
  open: boolean;
  headline: string;
  reason: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  actions?: ReactNode;
};

export function GameOverModal({
  open,
  headline,
  reason,
  onDismiss,
  dismissLabel = "Continue",
  actions,
}: GameOverModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="game-over-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      aria-describedby="game-over-reason"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#2c2a26]/35"
        aria-label="Dismiss"
        onClick={onDismiss}
      />

      <div className="game-over-card relative w-full max-w-sm px-8 py-10 text-center">
        <p className="game-over-eyebrow text-[11px] font-medium uppercase tracking-[0.22em] text-[#5a554c]">
          Game over
        </p>
        <h2
          id="game-over-title"
          className="game-over-headline mt-3 text-3xl font-semibold text-[#2c2a26]"
        >
          {headline}
        </h2>
        <p
          id="game-over-reason"
          className="mt-3 text-base leading-relaxed text-[#5a554c]"
        >
          {reason}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {actions}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="game-over-btn rounded-sm border border-[#2c2a26]/35 bg-[#f4efe4] px-5 py-2.5 text-sm text-[#2c2a26] hover:bg-[#ebe4d6]"
            >
              {dismissLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Player-facing end reason for online games. */
export function onlineEndReasonLabel(
  result: DbGameResult | null,
  reason: DbEndReason | null,
  userId: string,
  whiteId: string,
): { headline: string; reason: string } {
  const won =
    result === "white"
      ? userId === whiteId
      : result === "black"
        ? userId !== whiteId
        : null;

  if (result === "draw" || won === null) {
    return {
      headline: "Draw",
      reason: friendlyDrawReason(reason),
    };
  }

  return {
    headline: won ? "You win" : "You lose",
    reason: friendlyDecisiveReason(reason, won),
  };
}

/** Pass-and-play end copy (no “you”). */
export function localEndReasonLabel(
  result: GameResult,
  reason: EndReason,
): { headline: string; reason: string } {
  if (result === "draw") {
    return {
      headline: "Draw",
      reason: friendlyDrawReason(reason),
    };
  }
  const side = result === "white" ? "White" : "Black";
  return {
    headline: `${side} wins`,
    reason: friendlyDecisiveReason(reason, true),
  };
}

function friendlyDecisiveReason(
  reason: DbEndReason | EndReason | null,
  viewerWon: boolean,
): string {
  switch (reason) {
    case "checkmate":
      return "Checkmate";
    case "resignation":
      return viewerWon ? "Opponent forfeited" : "You forfeited";
    case "timeout":
      return viewerWon ? "Opponent ran out of time" : "You ran out of time";
    case "disconnect":
      return viewerWon
        ? "Opponent disconnected"
        : "You disconnected";
    default:
      return reason ? reason.replaceAll("_", " ") : "Game finished";
  }
}

function friendlyDrawReason(
  reason: DbEndReason | EndReason | null,
): string {
  switch (reason) {
    case "stalemate":
      return "Stalemate";
    case "threefold":
      return "Threefold repetition";
    case "fifty_move":
      return "Fifty-move rule";
    case "insufficient_material":
      return "Insufficient material";
    case "agreement":
      return "Draw by agreement";
    default:
      return reason ? reason.replaceAll("_", " ") : "Drawn game";
  }
}
