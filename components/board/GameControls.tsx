"use client";

import { PaperButton } from "@/components/ui/PaperButton";

type GameControlsProps = {
  canAct: boolean;
  drawOfferPendingFromOpponent: boolean;
  drawOfferPendingFromMe: boolean;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
};

export function GameControls({
  canAct,
  drawOfferPendingFromOpponent,
  drawOfferPendingFromMe,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
}: GameControlsProps) {
  function handleResign() {
    if (!canAct) {
      return;
    }
    if (window.confirm("Resign this game?")) {
      onResign();
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <PaperButton variant="ghost" disabled={!canAct} onClick={handleResign}>
        Resign
      </PaperButton>

      {drawOfferPendingFromOpponent ? (
        <>
          <PaperButton variant="primary" disabled={!canAct} onClick={onAcceptDraw}>
            Accept draw
          </PaperButton>
          <PaperButton variant="ghost" disabled={!canAct} onClick={onDeclineDraw}>
            Decline
          </PaperButton>
        </>
      ) : (
        <PaperButton
          variant="ghost"
          disabled={!canAct || drawOfferPendingFromMe}
          onClick={onOfferDraw}
        >
          {drawOfferPendingFromMe ? "Draw offered" : "Offer draw"}
        </PaperButton>
      )}
    </div>
  );
}
