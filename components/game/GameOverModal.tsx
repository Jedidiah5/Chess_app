"use client";

import type { ReactNode } from "react";
import { PaperButton } from "@/components/ui/PaperButton";
import { PencilFrame } from "@/components/ui/PencilFrame";
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
        className="absolute inset-0 bg-[rgba(36,29,21,0.45)]"
        aria-label="Dismiss"
        onClick={onDismiss}
      />

      <div className="game-over-card relative w-full max-w-sm px-8 py-10 text-center">
        <PencilFrame
          className="pointer-events-none absolute inset-0 h-full w-full text-[var(--ink)]"
          strokeWidth={1.8}
          inset={6}
        />

        <div className="relative z-[1]">
          <p className="meta-caps">Game over</p>
          <h2
            id="game-over-title"
            className="game-over-headline mt-3 text-3xl font-semibold"
            style={{ color: "var(--ink)" }}
          >
            {headline}
          </h2>
          <p
            id="game-over-reason"
            className="mt-3 text-base leading-relaxed"
            style={{ color: "var(--ink-muted)" }}
          >
            {reason}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            {actions}
            {onDismiss && (
              <PaperButton variant="ghost" onClick={onDismiss}>
                {dismissLabel}
              </PaperButton>
            )}
          </div>
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
