"use client";

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
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={!canAct}
        onClick={handleResign}
        className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        Resign
      </button>

      {drawOfferPendingFromOpponent ? (
        <>
          <button
            type="button"
            disabled={!canAct}
            onClick={onAcceptDraw}
            className="rounded-md bg-stone-800 px-3 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Accept draw
          </button>
          <button
            type="button"
            disabled={!canAct}
            onClick={onDeclineDraw}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Decline
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={!canAct || drawOfferPendingFromMe}
          onClick={onOfferDraw}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {drawOfferPendingFromMe ? "Draw offered" : "Offer draw"}
        </button>
      )}
    </div>
  );
}
