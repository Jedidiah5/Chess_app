"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PaperButton } from "@/components/ui/PaperButton";
import { PaperCard } from "@/components/ui/PaperCard";

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
      <main className="paper-grain flex min-h-dvh items-center justify-center px-4">
        <p className="meta-caps">Loading</p>
      </main>
    );
  }

  return (
    <main className="paper-grain min-h-dvh px-5 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="flex flex-1 flex-col items-center gap-5">
          <header className="w-full max-w-[min(90vw,560px)]">
            <div className="flex items-baseline justify-between gap-4">
              <h1
                className="text-2xl font-semibold tracking-[-0.02em]"
                style={{ color: "var(--ink)" }}
              >
                Pass &amp; play
              </h1>
              <span className="meta-caps">One device · Unrated</span>
            </div>

            <div className="status-strip mt-3">
              <span className="meta-caps">
                {terminal.over
                  ? "Game over · unrated"
                  : `${turnLabel === "white" ? "White" : "Black"} to move${
                      engine.inCheck ? " · Check" : ""
                    }`}
              </span>
            </div>
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

          <div className="flex flex-wrap justify-center gap-3">
            <PaperButton variant="primary" onClick={handleNewGame}>
              New game
            </PaperButton>
            <PaperButton variant="ghost" onClick={toggleOrientation}>
              Flip board
            </PaperButton>
            <PaperButton href="/play" variant="ghost">
              Menu
            </PaperButton>
          </div>
        </section>

        <aside className="w-full lg:w-64">
          <PaperCard>
            <h2 className="meta-caps">Score sheet</h2>
            <div className="mt-3">
              {/*
                `moves` is the accumulated record. The engine is rebuilt from
                FEN on every commit, so engine.history only holds the last move.
              */}
              <MoveList history={moves.map((m) => m.san)} />
            </div>
          </PaperCard>
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
            <PaperButton variant="primary" onClick={handleNewGame}>
              New game
            </PaperButton>
          }
        />
      )}
    </main>
  );
}
