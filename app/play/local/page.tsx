"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Board, findKingSquare } from "@/components/board/Board";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import {
  buildAnimMoveFromCommit,
  useMoveAnimator,
} from "@/components/board/useMoveAnimator";
import { createEngine, isPromotionMove } from "@/lib/chess/engine";
import type { BoardOrientation, Promotion, Square } from "@/lib/chess/types";
import { displayColor, endReasonLabel } from "@/lib/chess/types";

type PendingPromotion = {
  from: Square;
  to: Square;
};

export default function LocalPlayPage() {
  const [engine, setEngine] = useState(() => createEngine());
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const {
    motionPieces,
    busy,
    playMove,
    snapTo,
    setSelectedLift,
  } = useMoveAnimator({ orientation });

  useEffect(() => {
    snapTo(engine.board, null);
    // initial only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || busy) {
      return [];
    }
    return engine.legalMoves(selectedSquare);
  }, [engine, selectedSquare, busy]);

  const inCheckSquare = useMemo(() => {
    if (!engine.inCheck) {
      return null;
    }
    return findKingSquare(engine.board, engine.turn);
  }, [engine]);

  const commitMove = useCallback(
    (from: Square, to: Square, promotion?: Promotion) => {
      const prev = engine.board;
      const next = createEngine(engine.fen);
      const outcome = next.makeMove(from, to, promotion);
      if (!outcome.ok) {
        return false;
      }
      const anim = buildAnimMoveFromCommit(prev, from, to, next.board, promotion);
      setEngine(next);
      setSelectedSquare(null);
      setPendingPromotion(null);
      playMove(anim, next.board);
      return true;
    },
    [engine.board, engine.fen, playMove],
  );

  const handleSquareTap = useCallback(
    (square: Square) => {
      if (engine.terminal.over || busy) {
        return;
      }

      const piece = engine.board.find((p) => p.square === square);

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setSelectedLift(engine.board, null);
        return;
      }

      if (
        selectedSquare &&
        engine.legalMoves(selectedSquare).includes(square)
      ) {
        if (isPromotionMove(engine, selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }
        commitMove(selectedSquare, square);
        return;
      }

      if (piece && piece.color === engine.turn) {
        setSelectedSquare(square);
        setSelectedLift(engine.board, square);
        return;
      }

      setSelectedSquare(null);
      setSelectedLift(engine.board, null);
    },
    [busy, commitMove, engine, selectedSquare, setSelectedLift],
  );

  const handlePromotionSelect = useCallback(
    (promotion: Promotion) => {
      if (!pendingPromotion) {
        return;
      }
      commitMove(pendingPromotion.from, pendingPromotion.to, promotion);
    },
    [commitMove, pendingPromotion],
  );

  const handleNewGame = useCallback(() => {
    const fresh = createEngine();
    setEngine(fresh);
    setSelectedSquare(null);
    setPendingPromotion(null);
    snapTo(fresh.board, null);
  }, [snapTo]);

  const toggleOrientation = useCallback(() => {
    setOrientation((current) => (current === "white" ? "black" : "white"));
  }, []);

  const turnLabel = displayColor(engine.turn);
  const terminal = engine.terminal;

  let resultText: string | null = null;
  if (terminal.over) {
    if (terminal.result === "draw") {
      resultText = `Draw — ${endReasonLabel(terminal.reason)}`;
    } else {
      const winner = terminal.result === "white" ? "White" : "Black";
      resultText = `${winner} wins — ${endReasonLabel(terminal.reason)}`;
    }
  }

  return (
    <main className="min-h-screen bg-[#ebe4d6] px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="flex flex-1 flex-col items-center gap-4">
          <header className="text-center">
            <h1 className="text-2xl font-semibold text-stone-900">
              Pass &amp; Play
            </h1>
            {!terminal.over ? (
              <p className="mt-1 text-stone-600">
                {turnLabel === "white" ? "White" : "Black"} to move
                {engine.inCheck ? " — Check!" : ""}
              </p>
            ) : (
              <p className="mt-1 text-lg font-medium text-stone-800">
                {resultText}
              </p>
            )}
          </header>

          <Board
            pieces={engine.board}
            motionPieces={motionPieces}
            orientation={orientation}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            inCheckSquare={inCheckSquare}
            onSquareTap={handleSquareTap}
          />

          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-md bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
              onClick={handleNewGame}
            >
              New game
            </button>
            <button
              type="button"
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              onClick={toggleOrientation}
            >
              Flip board
            </button>
          </div>
        </section>

        <aside className="w-full rounded-lg border border-stone-200 bg-white p-4 lg:w-64">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Moves
          </h2>
          <MoveList history={engine.history} />
        </aside>
      </div>

      {pendingPromotion && (
        <PromotionPicker
          color={engine.turn}
          onSelect={handlePromotionSelect}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </main>
  );
}
