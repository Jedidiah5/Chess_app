"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Board, findKingSquare } from "@/components/board/Board";
import { Clock } from "@/components/board/Clock";
import { DisconnectBanner } from "@/components/board/DisconnectBanner";
import { GameControls } from "@/components/board/GameControls";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import {
  buildAnimMoveFromCommit,
  deriveAnimMove,
  useMoveAnimator,
} from "@/components/board/useMoveAnimator";
import { createEngine, isPromotionMove, tryMoveUci } from "@/lib/chess/engine";
import type { BoardOrientation, Promotion, Square } from "@/lib/chess/types";
import {
  displayColor,
  squaresToUci,
} from "@/lib/chess/types";
import { createClient } from "@/lib/supabase/client";
import { claimResult, submitMove } from "@/lib/supabase/functions";
import {
  fetchGame,
  fetchInviteCode,
  fetchMoves,
  fetchServerNow,
  touchPresence,
} from "@/lib/supabase/games";
import { RematchButton } from "@/components/game/RematchButton";
import { PaperButton } from "@/components/ui/PaperButton";
import { PaperCard } from "@/components/ui/PaperCard";
import {
  GameOverModal,
  onlineEndReasonLabel,
} from "@/components/game/GameOverModal";
import { subscribeToGame, unsubscribeFromGame } from "@/lib/supabase/realtime";
import type { GameRow, MoveRow } from "@/types/game";
import { getTimeControlLabel } from "@/lib/chess/timeControl";
import {
  GameSettingsSheet,
  SettingsGearButton,
} from "@/components/settings/GameSettingsSheet";
import { useAppSettings } from "@/components/settings/useAppSettings";

const GRACE_MS = 30_000;
const HEARTBEAT_MS = 10_000;

type OnlineGamePageProps = {
  gameId: string;
};

type PendingPromotion = {
  from: Square;
  to: Square;
};

function opponentSeenAt(game: GameRow, userId: string): string | null {
  return userId === game.white_id ? game.black_seen_at : game.white_seen_at;
}

function disconnectSecondsLeft(
  game: GameRow,
  userId: string,
  clockOffsetMs: number,
): number | null {
  const seen = opponentSeenAt(game, userId) ?? game.started_at;
  if (!seen) {
    return null;
  }
  const serverNow = Date.now() + clockOffsetMs;
  const remaining = GRACE_MS - (serverNow - Date.parse(seen));
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function OnlineGamePage({ gameId }: OnlineGamePageProps) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [game, setGame] = useState<GameRow | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [engine, setEngine] = useState(() => createEngine());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFoundGame, setNotFoundGame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [opponentPresent, setOpponentPresent] = useState(true);
  const [presenceReady, setPresenceReady] = useState(false);
  const [disconnectSeconds, setDisconnectSeconds] = useState<number | null>(null);
  const [dismissedOver, setDismissedOver] = useState(false);

  const confirmedPlyRef = useRef(0);
  const submittingRef = useRef(false);
  const claimingRef = useRef(false);
  const gameRef = useRef<GameRow | null>(null);
  const boardRef = useRef(engine.board);
  const fenRef = useRef(engine.fen);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    boardRef.current = engine.board;
    fenRef.current = engine.fen;
  }, [engine]);

  const orientation: BoardOrientation = useMemo(() => {
    if (!game || !userId) {
      return "white";
    }
    return userId === game.white_id ? "white" : "black";
  }, [game, userId]);

  const { motionPieces, busy, playMove, snapTo, setSelectedLift } =
    useMoveAnimator({ orientation });

  const legalTargets = useMemo(() => {
    if (!settings.showLegalMoves || !selectedSquare || busy) {
      return [];
    }
    return engine.legalMoves(selectedSquare);
  }, [engine, selectedSquare, busy, settings.showLegalMoves]);

  const inCheckSquare = useMemo(() => {
    if (!engine.inCheck) {
      return null;
    }
    return findKingSquare(engine.board, engine.turn);
  }, [engine]);

  const sanHistory = useMemo(() => moves.map((move) => move.san), [moves]);

  const lastMove = useMemo(() => {
    if (moves.length === 0) return null;
    const last = moves[moves.length - 1];
    const from = last.uci.slice(0, 2) as Square;
    const to = last.uci.slice(2, 4) as Square;
    return { from, to };
  }, [moves]);

  const isMyTurn = useMemo(() => {
    if (!game || !userId || game.status !== "active") {
      return false;
    }
    const turnId = engine.turn === "w" ? game.white_id : game.black_id;
    return turnId === userId;
  }, [engine.turn, game, userId]);

  const hasClock = (game?.initial_ms ?? 0) > 0;

  const syncFromServer = useCallback(
    async (nextGame: GameRow, nextMoves: MoveRow[]) => {
      const prevPly = confirmedPlyRef.current;
      const prevBoard = boardRef.current;
      const prevFen = fenRef.current;
      const nextEngine = createEngine(nextGame.current_fen);
      const delta = nextGame.ply - prevPly;

      setGame(nextGame);
      setMoves(nextMoves);
      setEngine(nextEngine);
      setSelectedSquare(null);
      setPendingPromotion(null);
      confirmedPlyRef.current = nextGame.ply;
      if (nextGame.status !== "finished") {
        setDismissedOver(false);
      }

      if (delta > 2 || delta < 0 || prevBoard.length === 0) {
        snapTo(nextEngine.board, null);
        return;
      }

      if (delta === 0) {
        snapTo(nextEngine.board, null);
        return;
      }

      const stepMoves = nextMoves
        .filter((m) => m.ply > prevPly && m.ply <= nextGame.ply)
        .sort((a, b) => a.ply - b.ply);

      if (stepMoves.length === 0 || stepMoves.length > 2) {
        snapTo(nextEngine.board, null);
        return;
      }

      let fen = prevFen;
      let board = prevBoard;
      for (const step of stepMoves) {
        const applied = tryMoveUci(fen, step.uci);
        if (!applied.ok) {
          snapTo(nextEngine.board, null);
          return;
        }
        const afterEngine = createEngine(applied.fen);
        const anim = deriveAnimMove(board, afterEngine.board);
        if (!anim) {
          snapTo(nextEngine.board, null);
          return;
        }
        playMove(anim, afterEngine.board);
        fen = applied.fen;
        board = afterEngine.board;
      }
    },
    [playMove, snapTo],
  );

  const resync = useCallback(async () => {
    const [nextGame, nextMoves, serverNow] = await Promise.all([
      fetchGame(supabase, gameId),
      fetchMoves(supabase, gameId),
      fetchServerNow(supabase),
    ]);

    setClockOffsetMs(serverNow - Date.now());

    if (!nextGame) {
      setNotFoundGame(true);
      return;
    }

    await syncFromServer(nextGame, nextMoves);

    if (nextGame.status === "waiting") {
      const code = await fetchInviteCode(supabase, gameId);
      setInviteCode(code);
    }
  }, [gameId, supabase, syncFromServer]);

  const runClaim = useCallback(
    async (claim: "resign" | "timeout" | "disconnect" | "draw_offer" | "draw_accept" | "draw_decline") => {
      if (claimingRef.current) {
        return;
      }
      claimingRef.current = true;
      try {
        const result = await claimResult(gameId, claim);
        if (!result.ok) {
          if (result.error !== "grace_period_active" && result.error !== "opponent_has_time") {
            setStatusMessage(result.error.replaceAll("_", " "));
          }
          await resync();
          return;
        }
        await resync();
      } catch {
        setStatusMessage("Claim failed — try again.");
        await resync();
      } finally {
        claimingRef.current = false;
      }
    },
    [gameId, resync],
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          return;
        }

        setUserId(user.id);

        const [nextGame, nextMoves, serverNow] = await Promise.all([
          fetchGame(supabase, gameId),
          fetchMoves(supabase, gameId),
          fetchServerNow(supabase),
        ]);

        if (cancelled) {
          return;
        }

        setClockOffsetMs(serverNow - Date.now());

        if (!nextGame) {
          setNotFoundGame(true);
          setLoading(false);
          return;
        }

        if (user.id !== nextGame.white_id && user.id !== nextGame.black_id) {
          setNotFoundGame(true);
          setLoading(false);
          return;
        }

        await syncFromServer(nextGame, nextMoves);

        if (nextGame.status === "waiting") {
          const code = await fetchInviteCode(supabase, gameId);
          setInviteCode(code);
        }

        setLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Could not load game.";
        setLoadError(message);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [gameId, supabase, syncFromServer]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void resync();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resync]);

  // Presence + heartbeats + postgres sync
  useEffect(() => {
    if (!game || !userId || loading) {
      return;
    }

    const opponentId =
      userId === game.white_id ? game.black_id : game.white_id;

    const channel = subscribeToGame(supabase, gameId, userId, {
      onMove: (move) => {
        if (move.ply <= confirmedPlyRef.current) {
          return;
        }
        void resync();
      },
      onGameUpdate: () => {
        void resync();
      },
      onPresenceSync: (ids) => {
        setPresenceReady(true);
        if (!opponentId) {
          setOpponentPresent(true);
          return;
        }
        setOpponentPresent(ids.includes(opponentId));
      },
      onPresenceJoin: (joinedId) => {
        if (joinedId === opponentId) {
          setOpponentPresent(true);
        }
      },
      onPresenceLeave: (leftId) => {
        if (leftId === opponentId) {
          setOpponentPresent(false);
        }
      },
    });

    setPresenceReady(false);
    void touchPresence(supabase, gameId).catch(() => undefined);
    const heartbeat = window.setInterval(() => {
      void touchPresence(supabase, gameId).catch(() => undefined);
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      unsubscribeFromGame(supabase, channel);
    };
  }, [game?.id, game?.white_id, game?.black_id, gameId, loading, resync, supabase, userId]);

  // Disconnect countdown derived from seen_at so refresh stays correct
  useEffect(() => {
    if (!game || !userId || game.status !== "active" || !game.black_id) {
      setDisconnectSeconds(null);
      return;
    }

    if (!presenceReady || opponentPresent) {
      setDisconnectSeconds(null);
      return;
    }

    function tick() {
      const current = gameRef.current;
      if (!current || !userId) {
        return;
      }
      const seconds = disconnectSecondsLeft(current, userId, clockOffsetMs);
      if (seconds === null) {
        setDisconnectSeconds(null);
        return;
      }
      setDisconnectSeconds(seconds);
      if (seconds <= 0 && !claimingRef.current) {
        void runClaim("disconnect");
      }
    }

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [clockOffsetMs, game, opponentPresent, presenceReady, runClaim, userId]);

  const commitMove = useCallback(
    async (from: Square, to: Square, promotion?: Promotion) => {
      if (!game || !isMyTurn || submittingRef.current || game.status !== "active") {
        return;
      }

      const expectedPly = game.ply;
      const uci = squaresToUci(from, to, promotion);
      const prev = engine.board;
      const optimistic = createEngine(engine.fen);
      const localOutcome = optimistic.makeMove(from, to, promotion);

      if (!localOutcome.ok) {
        return;
      }

      submittingRef.current = true;
      const anim = buildAnimMoveFromCommit(
        prev,
        from,
        to,
        optimistic.board,
        promotion,
      );
      setEngine(optimistic);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setStatusMessage(null);
      playMove(anim, optimistic.board);

      const result = await submitMove(gameId, uci, expectedPly);

      submittingRef.current = false;

      if (!result.ok) {
        setStatusMessage(
          result.error === "stale_position"
            ? "Out of sync — position restored."
            : "Move rejected — position restored.",
        );
        await resync();
        return;
      }

      await resync();
    },
    [engine.board, engine.fen, game, gameId, isMyTurn, playMove, resync],
  );

  const handleSquareTap = useCallback(
    (square: Square) => {
      if (
        !game ||
        game.status !== "active" ||
        !isMyTurn ||
        submittingRef.current ||
        busy
      ) {
        return;
      }

      if (engine.terminal.over) {
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
        void commitMove(selectedSquare, square);
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
    [
      busy,
      commitMove,
      engine,
      game,
      isMyTurn,
      selectedSquare,
      setSelectedLift,
    ],
  );

  const handleCopyInvite = useCallback(async () => {
    if (!inviteCode) {
      return;
    }
    const url = `${window.location.origin}/join/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [inviteCode]);

  const handleQuit = useCallback(() => {
    const leave = () => router.push("/play");
    const status = gameRef.current?.status;
    if (status === "active") {
      void runClaim("resign").finally(leave);
      return;
    }
    leave();
  }, [router, runClaim]);

  const handleOpponentFlag = useCallback(() => {
    if (!isMyTurn) {
      void runClaim("timeout");
    }
  }, [isMyTurn, runClaim]);

  if (notFoundGame) {
    notFound();
  }

  if (loadError) {
    return (
      <main className="paper-grain min-h-dvh px-5 py-12">
        <PaperCard className="mx-auto max-w-md">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Could not load game
          </h1>
          <p className="paper-alert mt-3" role="alert">
            {loadError}
          </p>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            If you just added Phase 4, run{" "}
            <code className="font-mono text-xs">supabase db push</code> and
            redeploy the Edge Functions.
          </p>
          <Link
            href="/play"
            className="paper-link mt-5 inline-block text-sm font-semibold"
          >
            Back to play menu
          </Link>
        </PaperCard>
      </main>
    );
  }

  if (loading || !game || !userId) {
    return (
      <main className="paper-grain flex min-h-dvh items-center justify-center px-4">
        <p className="meta-caps">Loading game</p>
      </main>
    );
  }

  const whiteActive =
    game.status === "active" && engine.turn === "w";
  const blackActive =
    game.status === "active" && engine.turn === "b";

  let headerText = "";
  if (game.status === "waiting") {
    headerText = "Waiting for opponent…";
  } else if (game.status === "finished" || game.status === "abandoned") {
    headerText =
      game.status === "abandoned" ? "Game abandoned" : "Game over";
  } else if (isMyTurn) {
    headerText = `Your turn${engine.inCheck ? " — Check!" : ""}`;
  } else {
    headerText = `Opponent's turn (${displayColor(engine.turn)})`;
  }

  const drawFromMe = game.draw_offer_by === userId;
  const drawFromOpponent =
    game.draw_offer_by !== null && game.draw_offer_by !== userId;

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
                Online game
              </h1>
              <div className="flex items-center gap-3">
                <span className="meta-caps">
                  Rated · {getTimeControlLabel(game.initial_ms ?? 0)}
                </span>
                <SettingsGearButton onClick={() => setSettingsOpen(true)} />
              </div>
            </div>

            <div className="status-strip mt-3">
              <span className="meta-caps">{headerText}</span>
            </div>

            {statusMessage && (
              <p className="paper-alert mt-3" role="alert">
                {statusMessage}
              </p>
            )}
          </header>

          {game.status === "waiting" && inviteCode && (
            <PaperCard className="w-full max-w-md">
              <p className="meta-caps">Share this invite link</p>
              <p
                className="mt-2 break-all font-mono text-sm"
                style={{ color: "var(--ink)" }}
              >
                {origin ? `${origin}/join/${inviteCode}` : `/join/${inviteCode}`}
              </p>
              <PaperButton
                variant="primary"
                onClick={handleCopyInvite}
                className="mt-4"
              >
                {copied ? "Copied" : "Copy link"}
              </PaperButton>
            </PaperCard>
          )}

          {disconnectSeconds !== null && game.status === "active" && (
            <DisconnectBanner secondsLeft={disconnectSeconds} />
          )}

          {game.status !== "waiting" && (
            <>
              <Clock
                label={orientation === "white" ? "Black" : "White"}
                storedMs={orientation === "white" ? game.black_ms : game.white_ms}
                lastMoveAt={game.last_move_at}
                isActive={orientation === "white" ? blackActive : whiteActive}
                clockOffsetMs={clockOffsetMs}
                hasClock={hasClock}
                onFlag={
                  (orientation === "white" ? blackActive : whiteActive) &&
                  userId !== (orientation === "white" ? game.black_id : game.white_id)
                    ? handleOpponentFlag
                    : undefined
                }
              />

              <Board
                pieces={engine.board}
                motionPieces={motionPieces}
                orientation={orientation}
                selectedSquare={selectedSquare}
                legalTargets={legalTargets}
                inCheckSquare={inCheckSquare}
                onSquareTap={handleSquareTap}
                lastMove={lastMove}
              />

              <Clock
                label={orientation === "white" ? "White" : "Black"}
                storedMs={orientation === "white" ? game.white_ms : game.black_ms}
                lastMoveAt={game.last_move_at}
                isActive={orientation === "white" ? whiteActive : blackActive}
                clockOffsetMs={clockOffsetMs}
                hasClock={hasClock}
                onFlag={
                  (orientation === "white" ? whiteActive : blackActive) &&
                  userId !== (orientation === "white" ? game.white_id : game.black_id)
                    ? handleOpponentFlag
                    : undefined
                }
              />

              {game.status === "active" && (
                <GameControls
                  canAct
                  drawOfferPendingFromOpponent={drawFromOpponent}
                  drawOfferPendingFromMe={drawFromMe}
                  onResign={() => void runClaim("resign")}
                  onOfferDraw={() => void runClaim("draw_offer")}
                  onAcceptDraw={() => void runClaim("draw_accept")}
                  onDeclineDraw={() => void runClaim("draw_decline")}
                />
              )}
            </>
          )}

          {game.status === "finished" && (
            <>
              {!dismissedOver &&
                (() => {
                  const copy = onlineEndReasonLabel(
                    game.result,
                    game.reason,
                    userId,
                    game.white_id,
                  );
                  return (
                    <GameOverModal
                      open
                      headline={copy.headline}
                      reason={copy.reason}
                      onDismiss={() => setDismissedOver(true)}
                      dismissLabel="Close"
                      actions={<RematchButton gameId={game.id} />}
                    />
                  );
                })()}
              {dismissedOver && (
                <div className="flex flex-col items-center gap-3">
                  <RematchButton gameId={game.id} />
                </div>
              )}
            </>
          )}

          <Link href="/play" className="paper-link text-sm font-semibold">
            Back to play menu
          </Link>
        </section>

        {settings.showScoreSheet ? (
          <aside className="w-full lg:w-64">
            <PaperCard>
              <h2 className="meta-caps">Score sheet</h2>
              <div className="mt-3">
                <MoveList history={sanHistory} />
              </div>
            </PaperCard>
          </aside>
        ) : null}
      </div>

      <GameSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onQuit={handleQuit}
        quitLabel={game.status === "active" ? "Resign & quit" : "Quit game"}
      />

      {pendingPromotion && (
        <PromotionPicker
          color={engine.turn}
          onSelect={(promotion) => {
            void commitMove(pendingPromotion.from, pendingPromotion.to, promotion);
          }}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </main>
  );
}
