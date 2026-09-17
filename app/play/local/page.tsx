"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Board, findKingSquare } from "@/components/board/Board";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import {
  GameOverModal,
  localEndReasonLabel,
} from "@/components/game/GameOverModal";
import {
  buildAnimMoveFromCommit,
  useMoveAnimator,
} from "@/components/board/useMoveAnimator";
import { createEngine, isPromotionMove, tryMoveUci } from "@/lib/chess/engine";
import type { BoardOrientation, Promotion, Square } from "@/lib/chess/types";
import { displayColor } from "@/lib/chess/types";
import {
  clearActiveOfflineGame,
  getActiveOfflineGame,
  newOfflineId,
  saveActiveOfflineGame,
  saveFinishedOfflineGame,
  type OfflineMove,
} from "@/lib/offline/db";
import { uploadOfflineGame } from "@/lib/offline/upload";

type PendingPromotion = {
  from: Square;
  to: Square;
};

export default function LocalPlayPage() {
  const [engine, setEngine] = useState(() => createEngine());
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [dismissedOver, setDismissedOver] = useState(false);
  const [moves, setMoves] = useState<OfflineMove[]>([]);
  const [gameId, setGameId] = useState(() => newOfflineId());
  const [ready, setReady] = useState(false);

  const {
    motionPieces,
    busy,
    playMove,
    snapTo,
    setSelectedLift,
  } = useMoveAnimator({ orientation });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const active = await getActiveOfflineGame();
        if (!cancelled && active?.mode === "local") {
          const restored = createEngine(active.fen);
          setEngine(restored);
          setMoves(active.moves);
          setGameId(active.id === "current" ? newOfflineId() : active.id);
          snapTo(restored.board, null);
        } else if (!cancelled) {
          snapTo(engine.board, null);
        }
      } catch {
        if (!cancelled) snapTo(engine.board, null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistActive = useCallback(
    async (fen: string, historySan: string[], nextMoves: OfflineMove[]) => {
      try {
        await saveActiveOfflineGame({
          mode: "local",
          fen,
          historySan,
          moves: nextMoves,
          playerColor: "w",
          level: null,
        });
      } catch {
        // ignore
      }
    },
    [],
  );

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
      const uci = `${from}${to}${promotion ?? ""}`;
      const applied = tryMoveUci(engine.fen, uci);
      const san = applied.ok ? applied.san : "?";
      const nextMoves: OfflineMove[] = [
        ...moves,
        { ply: moves.length + 1, san, uci, fen_after: next.fen },
      ];

      const anim = buildAnimMoveFromCommit(prev, from, to, next.board, promotion);
      setEngine(next);
      setMoves(nextMoves);
      setSelectedSquare(null);
      setPendingPromotion(null);
      playMove(anim, next.board);
      void persistActive(next.fen, next.history, nextMoves);

      if (next.terminal.over && next.terminal.result && next.terminal.reason) {
        const finished = {
          id: gameId,
          mode: "local" as const,
          result: next.terminal.result,
          reason: next.terminal.reason,
          fen: next.fen,
          moves: nextMoves,
          playerColor: "w" as const,
          level: null,
          endedAt: new Date().toISOString(),
          uploaded: false,
        };
        void saveFinishedOfflineGame(finished).then(() =>
          uploadOfflineGame(finished),
        );
      }
      return true;
    },
    [engine.board, engine.fen, engine.history, gameId, moves, persistActive, playMove],
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
    setMoves([]);
    setGameId(newOfflineId());
    setSelectedSquare(null);
    setPendingPromotion(null);
    setDismissedOver(false);
    snapTo(fresh.board, null);
    void clearActiveOfflineGame();
  }, [snapTo]);

  const toggleOrientation = useCallback(() => {
    setOrientation((current) => (current === "white" ? "black" : "white"));
  }, []);

  const turnLabel = displayColor(engine.turn);
  const terminal = engine.terminal;
  const overCopy =
    terminal.over
      ? localEndReasonLabel(terminal.result, terminal.reason)
      : null;

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#ebe4d6] px-4 py-12 text-center text-stone-600">
        Loading…
      </main>
    );
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
              <p className="mt-1 text-stone-600">Game over · unrated</p>
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
            <Link
              href="/play"
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Menu
            </Link>
          </div>
        </section>

        <aside className="w-full rounded-lg border border-stone-200 bg-white p-4 lg:w-64">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Moves
          </h2>
          <MoveList history={engine.history.length ? engine.history : moves.map((m) => m.san)} />
        </aside>
      </div>

      {pendingPromotion && (
        <PromotionPicker
          color={engine.turn}
          onSelect={handlePromotionSelect}
          onCancel={() => setPendingPromotion(null)}
        />
      )}

      {overCopy && (
        <GameOverModal
          open={!dismissedOver}
          headline={overCopy.headline}
          reason={overCopy.reason}
          onDismiss={() => setDismissedOver(true)}
          dismissLabel="Close"
          actions={
            <button
              type="button"
              className="game-over-btn-primary"
              onClick={handleNewGame}
            >
              New game
            </button>
          }
        />
      )}
    </main>
  );
}
