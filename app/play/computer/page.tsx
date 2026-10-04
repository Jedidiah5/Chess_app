"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Board, findKingSquare } from "@/components/board/Board";
import { CapturedPieces } from "@/components/board/CapturedPieces";
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
import { OptionPlate } from "@/components/ui/OptionPlate";
import { PaperButton } from "@/components/ui/PaperButton";
import { PaperCard } from "@/components/ui/PaperCard";
import type { BoardOrientation, Color, Promotion, Square } from "@/lib/chess/types";
import { STARTING_FEN, displayColor } from "@/lib/chess/types";
import {
  clearActiveOfflineGame,
  getActiveOfflineGame,
  newOfflineId,
  saveActiveOfflineGame,
  saveFinishedOfflineGame,
  type OfflineMove,
} from "@/lib/offline/db";
import { uploadOfflineGame } from "@/lib/offline/upload";
import {
  GameSettingsSheet,
  SettingsGearButton,
} from "@/components/settings/GameSettingsSheet";
import { useAppSettings } from "@/components/settings/useAppSettings";

type PendingPromotion = {
  from: Square;
  to: Square;
};

type SetupState = {
  level: StockfishLevel;
  playerColor: Color;
};

/** Games here always start from the initial position, so white owns even plies. */
function isPlayerPly(index: number, cfg: SetupState): boolean {
  return (index % 2 === 0) === (cfg.playerColor === "w");
}

function UndoIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${flip ? "-scale-x-100" : ""}`}
      aria-hidden
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

export default function ComputerPlayPage() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  /** Each undo pushes the slice it removed so redo restores it exactly. */
  const [redoStack, setRedoStack] = useState<OfflineMove[][]>([]);
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
      setRedoStack([]);
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
    if (!settings.showLegalMoves || !selectedSquare || busy || thinking || !setup)
      return [];
    if (engine.turn !== setup.playerColor) return [];
    return engine.legalMoves(selectedSquare);
  }, [busy, engine, selectedSquare, setup, thinking, settings.showLegalMoves]);

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

  const showPosition = useCallback(
    (nextMoves: OfflineMove[]) => {
      const next = createEngine(nextMoves.at(-1)?.fen_after ?? STARTING_FEN);
      setEngine(next);
      setMoves(nextMoves);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setDismissedOver(false);
      snapTo(next.board, null);
      return next;
    },
    [snapTo],
  );

  const lastPlayerPly = useMemo(() => {
    if (!setup) return -1;
    for (let i = moves.length - 1; i >= 0; i -= 1) {
      if (isPlayerPly(i, setup)) return i;
    }
    return -1;
  }, [moves.length, setup]);

  const canUndo = !busy && lastPlayerPly >= 0;
  const canRedo = !busy && !thinking && redoStack.length > 0;

  /** Takes back your last move and the computer's reply, so it's your turn again. */
  const handleUndo = useCallback(() => {
    if (!setup || !canUndo) return;
    if (thinking) {
      // A stopped search can still answer late; a fresh worker can't mix it up.
      thinkGen.current += 1;
      stockfishRef.current?.dispose();
      stockfishRef.current = null;
      setThinking(false);
    }
    if (engine.terminal.over) {
      // The finished game is already archived; a replayed ending is a new game.
      setGameId(newOfflineId());
    }
    setRedoStack((stack) => [...stack, moves.slice(lastPlayerPly)]);
    const kept = moves.slice(0, lastPlayerPly);
    const next = showPosition(kept);
    void persistActive(next.fen, kept.map((m) => m.san), kept, setup);
  }, [canUndo, engine.terminal.over, lastPlayerPly, moves, persistActive, setup, showPosition, thinking]);

  const handleRedo = useCallback(() => {
    if (!setup || !canRedo) return;
    const restored = [...moves, ...redoStack[redoStack.length - 1]];
    setRedoStack((stack) => stack.slice(0, -1));
    const next = showPosition(restored);
    if (next.terminal.over) {
      void clearActiveOfflineGame();
    } else {
      void persistActive(next.fen, restored.map((m) => m.san), restored, setup);
    }
  }, [canRedo, moves, persistActive, redoStack, setup, showPosition]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRedo, handleUndo]);

  const handleNewGame = useCallback(() => {
    thinkGen.current += 1;
    stockfishRef.current?.dispose();
    stockfishRef.current = null;
    setThinking(false);
    setSetup(null);
    setEngine(createEngine());
    setMoves([]);
    setRedoStack([]);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setDismissedOver(false);
    setGameId(newOfflineId());
    snapTo(createEngine().board, null);
    void clearActiveOfflineGame();
  }, [snapTo]);

  const handleQuit = useCallback(() => {
    thinkGen.current += 1;
    stockfishRef.current?.dispose();
    stockfishRef.current = null;
    void clearActiveOfflineGame();
    router.push("/profile");
  }, [router]);

  const startGame = useCallback(
    (level: StockfishLevel, playerColor: Color) => {
      const fresh = createEngine();
      const cfg = { level, playerColor };
      setSetup(cfg);
      setEngine(fresh);
      setMoves([]);
      setRedoStack([]);
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
      <main className="landing-paper flex min-h-dvh items-center justify-center px-4">
        <p className="meta-caps">Loading</p>
      </main>
    );
  }

  if (!setup) {
    return (
      <main className="landing-paper min-h-dvh px-5 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <header>
            <div className="flex items-center gap-4">
              <span className="print-rule" aria-hidden />
              <span className="meta-caps whitespace-nowrap">Set the game</span>
              <span className="print-rule" aria-hidden />
            </div>
            <h1
              className="mt-6 text-center text-4xl font-semibold tracking-[-0.03em]"
              style={{ color: "var(--ink)" }}
            >
              Vs computer
            </h1>
            <p className="meta-caps mt-3 text-center">
              On-device Stockfish · always unrated
            </p>
          </header>

          <div className="mt-8">
            <SetupForm onStart={startGame} />
          </div>

          <footer className="mt-8 text-center">
            <Link href="/profile" className="paper-link text-sm font-semibold">
              Back to profile
            </Link>
          </footer>
        </div>
      </main>
    );
  }

  const turnLabel = displayColor(engine.turn);

  return (
    <main className="landing-paper min-h-dvh px-5 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="flex flex-1 flex-col items-center gap-5">
          <header className="w-full max-w-[min(90vw,560px)]">
            <div className="flex items-baseline justify-between gap-4">
              <h1
                className="text-2xl font-semibold tracking-[-0.02em]"
                style={{ color: "var(--ink)" }}
              >
                Vs computer
              </h1>
              <div className="flex items-center gap-3">
                <span className="meta-caps">
                  {STOCKFISH_LEVELS.find((l) => l.id === setup.level)?.label} ·{" "}
                  {setup.playerColor === "w" ? "White" : "Black"}
                </span>
                <SettingsGearButton onClick={() => setSettingsOpen(true)} />
              </div>
            </div>

            <div className="status-strip mt-3">
              <span className="meta-caps">
                {terminal.over
                  ? "Game over · unrated"
                  : thinking
                    ? "Computer thinking"
                    : `${turnLabel === "white" ? "White" : "Black"} to move${
                        engine.inCheck ? " · Check" : ""
                      }`}
              </span>
            </div>
          </header>

          <div className="flex w-full max-w-[min(90vw,560px)] flex-col items-center gap-1.5">
            <CapturedPieces
              board={engine.board}
              side={setup.playerColor === "w" ? "b" : "w"}
            />
            <Board
              pieces={engine.board}
              motionPieces={motionPieces}
              orientation={orientation}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              inCheckSquare={inCheckSquare}
              onSquareTap={handleSquareTap}
            />
            <CapturedPieces board={engine.board} side={setup.playerColor} />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <PaperButton
              variant="ghost"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-keyshortcuts="Control+Z"
              title="Undo (Ctrl+Z)"
            >
              <span className="inline-flex items-center gap-2">
                <UndoIcon />
                Undo
              </span>
            </PaperButton>
            <PaperButton
              variant="ghost"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-keyshortcuts="Control+Y"
              title="Redo (Ctrl+Y)"
            >
              <span className="inline-flex items-center gap-2">
                Redo
                <UndoIcon flip />
              </span>
            </PaperButton>
            <PaperButton variant="primary" onClick={handleNewGame}>
              New game
            </PaperButton>
          </div>
        </section>

        {settings.showScoreSheet ? (
          <aside className="w-full lg:w-64">
            <PaperCard>
              <h2 className="meta-caps">Score sheet</h2>
              <div className="mt-3">
                <MoveList history={moves.map((m) => m.san)} />
              </div>
            </PaperCard>
          </aside>
        ) : null}
      </div>

      <GameSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onQuit={handleQuit}
      />

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
            <>
              <PaperButton variant="primary" onClick={handleNewGame}>
                New game
              </PaperButton>
              {canUndo && (
                <PaperButton variant="ghost" onClick={handleUndo}>
                  <span className="inline-flex items-center gap-2">
                    <UndoIcon />
                    Undo last move
                  </span>
                </PaperButton>
              )}
              <PaperButton variant="ghost" onClick={handleQuit}>
                Back to profile
              </PaperButton>
            </>
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
      onSubmit={(e) => {
        e.preventDefault();
        const playerColor: Color =
          color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;
        onStart(level, playerColor);
      }}
    >
      <PaperCard>
        <fieldset>
          <legend className="meta-caps">Difficulty</legend>
          <div className="mt-3 space-y-2.5">
            {STOCKFISH_LEVELS.map((l) => (
              <OptionPlate
                key={l.id}
                name="level"
                checked={level === l.id}
                onSelect={() => setLevel(l.id)}
                label={l.label}
                note={l.blurb}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="meta-caps">Your colour</legend>
          <div className="mt-3 space-y-2.5">
            {(
              [
                ["w", "White", "You move first"],
                ["b", "Black", "Engine opens"],
                ["random", "Random", "Drawn on start"],
              ] as const
            ).map(([value, label, note]) => (
              <OptionPlate
                key={value}
                name="color"
                checked={color === value}
                onSelect={() => setColor(value)}
                label={label}
                note={note}
              />
            ))}
          </div>
        </fieldset>

        <PaperButton type="submit" variant="primary" className="mt-7 w-full">
          Start game
        </PaperButton>
      </PaperCard>
    </form>
  );
}
