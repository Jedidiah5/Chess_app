"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  STOCKFISH_LEVELS,
  createStockfish,
  type StockfishLevel,
} from "@/lib/chess/stockfish";
import { parseUci } from "@/lib/chess/uci";
import type { BoardOrientation, Color, Promotion, Square } from "@/lib/chess/types";
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

type SetupState = {
  level: StockfishLevel;
  playerColor: Color;
};

export default function ComputerPlayPage() {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [engine, setEngine] = useState(() => createEngine());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(
    null,
  );
  const [dismissedOver, setDismissedOver] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [moves, setMoves] = useState<OfflineMove[]>([]);
  const [gameId, setGameId] = useState(() => newOfflineId());
  const stockfishRef = useRef<ReturnType<typeof createStockfish> | null>(null);
  const thinkGen = useRef(0);

  const {
    motionPieces,
    busy,
    playMove,
    snapTo,
    setSelectedLift,
  } = useMoveAnimator({
    orientation: (setup?.playerColor === "b" ? "black" : "white") as BoardOrientation,
  });

  const orientation: BoardOrientation =
    setup?.playerColor === "b" ? "black" : "white";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const active = await getActiveOfflineGame();
        if (cancelled || !active || active.mode !== "computer") {
          return;
        }
        const restored = createEngine(active.fen);
        // Rebuild history via SAN is not stored as replayable engine history;
        // we keep SAN list separately for MoveList.
        setEngine(restored);
        setMoves(active.moves);
        setGameId(active.id === "current" ? newOfflineId() : active.id);
        setSetup({
          level: active.level ?? "casual",
          playerColor: active.playerColor,
        });
        snapTo(restored.board, null);
      } catch {
        // IndexedDB unavailable — start fresh
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      thinkGen.current += 1;
      stockfishRef.current?.dispose();
      stockfishRef.current = null;
    };
  }, []);

  const persistActive = useCallback(
    async (
      fen: string,
      historySan: string[],
      nextMoves: OfflineMove[],
      cfg: SetupState,
    ) => {
      try {
        await saveActiveOfflineGame({
          mode: "computer",
          fen,
          historySan,
          moves: nextMoves,
          playerColor: cfg.playerColor,
          level: cfg.level,
        });
      } catch {
        // ignore persistence errors
      }
    },
    [],
  );

  const finishGame = useCallback(
    async (
      nextEngine: ReturnType<typeof createEngine>,
      nextMoves: OfflineMove[],
      cfg: SetupState,
    ) => {
      const terminal = nextEngine.terminal;
      if (!terminal.over || !terminal.result || !terminal.reason) return;

      const finished = {
        id: gameId,
        mode: "computer" as const,
        result: terminal.result,
        reason: terminal.reason,
        fen: nextEngine.fen,
        moves: nextMoves,
        playerColor: cfg.playerColor,
        level: cfg.level,
        endedAt: new Date().toISOString(),
        uploaded: false,
      };
      try {
        await saveFinishedOfflineGame(finished);
      } catch {
        // ignore
      }
      void uploadOfflineGame(finished);
    },
    [gameId],
  );

  const applyEngineMove = useCallback(
    (
      from: Square,
      to: Square,
      promotion: Promotion | undefined,
      cfg: SetupState,
    ) => {
      const prev = engine.board;
      const next = createEngine(engine.fen);
      const outcome = next.makeMove(from, to, promotion);
      if (!outcome.ok) return false;

      const uci = `${from}${to}${promotion ?? ""}`;
      const applied = tryMoveUci(engine.fen, uci);
      const san = applied.ok ? applied.san : "?";
      const nextMoves: OfflineMove[] = [
        ...moves,
        {
          ply: moves.length + 1,
          san,
          uci,
          fen_after: next.fen,
        },
      ];

      const anim = buildAnimMoveFromCommit(prev, from, to, next.board, promotion);
      setEngine(next);
      setMoves(nextMoves);
      setSelectedSquare(null);
      setPendingPromotion(null);
      playMove(anim, next.board);
      void persistActive(next.fen, next.history, nextMoves, cfg);

      if (next.terminal.over) {
        void finishGame(next, nextMoves, cfg);
      }
      return true;
    },
    [engine.board, engine.fen, engine.history, finishGame, moves, persistActive, playMove],
  );

  const requestComputerMove = useCallback(
    async (fen: string, cfg: SetupState, currentMoves: OfflineMove[]) => {
      const gen = ++thinkGen.current;
      setThinking(true);
      try {
        if (!stockfishRef.current) {
          stockfishRef.current = createStockfish();
        }
        const sf = stockfishRef.current;
        const uci = await sf.getBestMove(fen, cfg.level);
        if (gen !== thinkGen.current || !uci) return;

        const parsed = parseUci(uci);
        if (!parsed) return;

        const prevBoard = createEngine(fen).board;
        const applied = tryMoveUci(fen, uci);
        if (!applied.ok) return;

        const next = createEngine(applied.fen);
        const nextMoves: OfflineMove[] = [
          ...currentMoves,
          {
            ply: currentMoves.length + 1,
            san: applied.san,
            uci: applied.uci,
            fen_after: applied.fen,
          },
        ];
        const anim = buildAnimMoveFromCommit(
          prevBoard,
          parsed.from,
          parsed.to,
          next.board,
          parsed.promotion,
        );
        setEngine(next);
        setMoves(nextMoves);
        playMove(anim, next.board);
        void persistActive(next.fen, next.history, nextMoves, cfg);
        if (next.terminal.over) {
          void finishGame(next, nextMoves, cfg);
        }
      } catch {
        // Engine failure — leave board playable for the human
      } finally {
        if (gen === thinkGen.current) {
          setThinking(false);
        }
      }
    },
    [finishGame, persistActive, playMove],
  );

  // Computer moves when it's the engine's turn after setup / human move.
  useEffect(() => {
    if (!setup || restoring) return;
    if (engine.terminal.over || busy || thinking) return;
    if (engine.turn === setup.playerColor) return;
    void requestComputerMove(engine.fen, setup, moves);
    // Only re-run when turn/fen changes into computer's turn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, restoring, engine.fen, engine.turn, engine.terminal.over, busy]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || busy || thinking || !setup) return [];
    if (engine.turn !== setup.playerColor) return [];
    return engine.legalMoves(selectedSquare);
  }, [busy, engine, selectedSquare, setup, thinking]);

  const inCheckSquare = useMemo(() => {
    if (!engine.inCheck) return null;
    return findKingSquare(engine.board, engine.turn);
  }, [engine]);

  const handleSquareTap = useCallback(
    (square: Square) => {
      if (!setup || engine.terminal.over || busy || thinking) return;
      if (engine.turn !== setup.playerColor) return;

      const piece = engine.board.find((p) => p.square === square);

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setSelectedLift(engine.board, null);
        return;
      }

      if (selectedSquare && engine.legalMoves(selectedSquare).includes(square)) {
        if (isPromotionMove(engine, selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }
        applyEngineMove(selectedSquare, square, undefined, setup);
        return;
      }

      if (piece && piece.color === setup.playerColor) {
        setSelectedSquare(square);
        setSelectedLift(engine.board, square);
        return;
      }

      setSelectedSquare(null);
      setSelectedLift(engine.board, null);
    },
    [
      applyEngineMove,
      busy,
      engine,
      selectedSquare,
      setSelectedLift,
      setup,
      thinking,
    ],
  );

  const handlePromotionSelect = useCallback(
    (promotion: Promotion) => {
      if (!pendingPromotion || !setup) return;
      applyEngineMove(
        pendingPromotion.from,
        pendingPromotion.to,
        promotion,
        setup,
      );
    },
    [applyEngineMove, pendingPromotion, setup],
  );

  const handleNewGame = useCallback(() => {
    thinkGen.current += 1;
    stockfishRef.current?.dispose();
    stockfishRef.current = null;
    setThinking(false);
    setSetup(null);
    setEngine(createEngine());
    setMoves([]);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setDismissedOver(false);
    setGameId(newOfflineId());
    snapTo(createEngine().board, null);
    void clearActiveOfflineGame();
  }, [snapTo]);

  const startGame = useCallback(
    (level: StockfishLevel, playerColor: Color) => {
      const fresh = createEngine();
      const cfg = { level, playerColor };
      setSetup(cfg);
      setEngine(fresh);
      setMoves([]);
      setGameId(newOfflineId());
      setDismissedOver(false);
      snapTo(fresh.board, null);
      void persistActive(fresh.fen, [], [], cfg);
    },
    [persistActive, snapTo],
  );

  const terminal = engine.terminal;
  const overCopy =
    terminal.over && terminal.result && terminal.reason
      ? (() => {
          if (!setup) {
            return localEndReasonLabel(terminal.result, terminal.reason);
          }
          if (terminal.result === "draw") {
            return localEndReasonLabel(terminal.result, terminal.reason);
          }
          const humanWon =
            (terminal.result === "white" && setup.playerColor === "w") ||
            (terminal.result === "black" && setup.playerColor === "b");
          return {
            headline: humanWon ? "You win" : "You lose",
            reason:
              terminal.reason === "checkmate"
                ? "Checkmate"
                : terminal.reason.replaceAll("_", " "),
          };
        })()
      : null;

  if (restoring) {
    return (
      <main className="min-h-screen bg-[#ebe4d6] px-4 py-12 text-center text-stone-600">
        Loading…
      </main>
    );
  }

  if (!setup) {
    return (
      <main className="min-h-screen bg-[#ebe4d6] px-4 py-12">
        <div className="mx-auto max-w-md space-y-6">
          <header className="text-center">
            <h1 className="text-2xl font-semibold text-stone-900">Vs computer</h1>
            <p className="mt-2 text-sm text-stone-600">
              On-device Stockfish · always unrated
            </p>
          </header>

          <SetupForm onStart={startGame} />

          <Link
            href="/play"
            className="block text-center text-sm text-stone-700 underline-offset-2 hover:underline"
          >
            Back to play menu
          </Link>
        </div>
      </main>
    );
  }

  const turnLabel = displayColor(engine.turn);

  return (
    <main className="min-h-screen bg-[#ebe4d6] px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="flex flex-1 flex-col items-center gap-4">
          <header className="text-center">
            <h1 className="text-2xl font-semibold text-stone-900">Vs computer</h1>
            {!terminal.over ? (
              <p className="mt-1 text-stone-600">
                {thinking
                  ? "Computer thinking…"
                  : `${turnLabel === "white" ? "White" : "Black"} to move${
                      engine.inCheck ? " — Check!" : ""
                    }`}
              </p>
            ) : (
              <p className="mt-1 text-stone-600">Game over · unrated</p>
            )}
            <p className="mt-1 text-xs text-stone-500">
              {STOCKFISH_LEVELS.find((l) => l.id === setup.level)?.label} · you play{" "}
              {setup.playerColor === "w" ? "White" : "Black"}
            </p>
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
          <MoveList history={moves.map((m) => m.san)} />
        </aside>
      </div>

      {pendingPromotion && (
        <PromotionPicker
          color={setup.playerColor}
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

function SetupForm({
  onStart,
}: {
  onStart: (level: StockfishLevel, color: Color) => void;
}) {
  const [level, setLevel] = useState<StockfishLevel>("casual");
  const [color, setColor] = useState<Color | "random">("w");

  return (
    <form
      className="space-y-5 rounded-lg border border-stone-200 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const playerColor: Color =
          color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;
        onStart(level, playerColor);
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-700">Difficulty</legend>
        {STOCKFISH_LEVELS.map((l) => (
          <label
            key={l.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
          >
            <input
              type="radio"
              name="level"
              checked={level === l.id}
              onChange={() => setLevel(l.id)}
            />
            <span className="font-medium">{l.label}</span>
            <span className="text-stone-500">{l.blurb}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-700">Your colour</legend>
        {(
          [
            ["w", "White"],
            ["b", "Black"],
            ["random", "Random"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
          >
            <input
              type="radio"
              name="color"
              checked={color === value}
              onChange={() => setColor(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <button
        type="submit"
        className="w-full rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        Start game
      </button>
    </form>
  );
}
