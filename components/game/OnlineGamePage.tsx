"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Board, findKingSquare } from "@/components/board/Board";
import { MoveList } from "@/components/board/MoveList";
import { PromotionPicker } from "@/components/board/PromotionPicker";
import { createEngine, isPromotionMove } from "@/lib/chess/engine";
import type { BoardOrientation, Promotion, Square } from "@/lib/chess/types";
import {
  displayColor,
  endReasonLabel,
  squaresToUci,
} from "@/lib/chess/types";
import { createClient } from "@/lib/supabase/client";
import { submitMove } from "@/lib/supabase/functions";
import {
  fetchGame,
  fetchInviteCode,
  fetchMoves,
  gameResultLabel,
} from "@/lib/supabase/games";
import { subscribeToGame, unsubscribeFromGame } from "@/lib/supabase/realtime";
import type { GameRow, MoveRow } from "@/types/game";

type OnlineGamePageProps = {
  gameId: string;
};

type PendingPromotion = {
  from: Square;
  to: Square;
};

export function OnlineGamePage({ gameId }: OnlineGamePageProps) {
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
  const [notFoundGame, setNotFoundGame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const confirmedPlyRef = useRef(0);
  const submittingRef = useRef(false);

  const orientation: BoardOrientation = useMemo(() => {
    if (!game || !userId) {
      return "white";
    }
    return userId === game.white_id ? "white" : "black";
  }, [game, userId]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) {
      return [];
    }
    return engine.legalMoves(selectedSquare);
  }, [engine, selectedSquare]);

  const inCheckSquare = useMemo(() => {
    if (!engine.inCheck) {
      return null;
    }
    return findKingSquare(engine.board, engine.turn);
  }, [engine]);

  const sanHistory = useMemo(() => moves.map((move) => move.san), [moves]);

  const isMyTurn = useMemo(() => {
    if (!game || !userId || game.status !== "active") {
      return false;
    }
    const turnId = engine.turn === "w" ? game.white_id : game.black_id;
    return turnId === userId;
  }, [engine.turn, game, userId]);

  const syncFromServer = useCallback(
    async (nextGame: GameRow, nextMoves: MoveRow[]) => {
      const nextEngine = createEngine(nextGame.current_fen);
      setGame(nextGame);
      setMoves(nextMoves);
      setEngine(nextEngine);
      setSelectedSquare(null);
      setPendingPromotion(null);
      confirmedPlyRef.current = nextGame.ply;
    },
    [],
  );

  const resync = useCallback(async () => {
    const [nextGame, nextMoves] = await Promise.all([
      fetchGame(supabase, gameId),
      fetchMoves(supabase, gameId),
    ]);

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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      setUserId(user.id);

      const [nextGame, nextMoves] = await Promise.all([
        fetchGame(supabase, gameId),
        fetchMoves(supabase, gameId),
      ]);

      if (cancelled) {
        return;
      }

      if (!nextGame) {
        setNotFoundGame(true);
        setLoading(false);
        return;
      }

      if (
        user.id !== nextGame.white_id &&
        user.id !== nextGame.black_id
      ) {
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

  useEffect(() => {
    if (!game || loading) {
      return;
    }

    const channel = subscribeToGame(supabase, gameId, {
      onMove: (move) => {
        if (move.ply <= confirmedPlyRef.current) {
          return;
        }
        void resync();
      },
      onGameUpdate: (updatedGame) => {
        if (updatedGame.status === "finished") {
          void resync();
        } else if (updatedGame.status === "active" && game.status === "waiting") {
          void resync();
        }
      },
    });

    return () => {
      unsubscribeFromGame(supabase, channel);
    };
  }, [game, gameId, loading, resync, supabase]);

  const commitMove = useCallback(
    async (from: Square, to: Square, promotion?: Promotion) => {
      if (!game || !isMyTurn || submittingRef.current || game.status !== "active") {
        return;
      }

      const expectedPly = game.ply;
      const uci = squaresToUci(from, to, promotion);
      const optimistic = createEngine(engine.fen);
      const localOutcome = optimistic.makeMove(from, to, promotion);

      if (!localOutcome.ok) {
        return;
      }

      submittingRef.current = true;
      setEngine(optimistic);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setStatusMessage(null);

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

      confirmedPlyRef.current = result.ply;
      const nextMoves = await fetchMoves(supabase, gameId);
      setMoves(nextMoves);
      setGame((current) =>
        current
          ? {
              ...current,
              ply: result.ply,
              current_fen: result.fen,
              status: result.status,
              result: result.result ?? current.result,
              reason: result.reason ?? current.reason,
            }
          : current,
      );
    },
    [engine.fen, game, gameId, isMyTurn, resync, supabase],
  );

  const handleSquareTap = useCallback(
    (square: Square) => {
      if (!game || game.status !== "active" || !isMyTurn || submittingRef.current) {
        return;
      }

      if (engine.terminal.over) {
        return;
      }

      const piece = engine.board.find((p) => p.square === square);

      if (selectedSquare === square) {
        setSelectedSquare(null);
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
        return;
      }

      setSelectedSquare(null);
    },
    [commitMove, engine, game, isMyTurn, selectedSquare],
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

  if (notFoundGame) {
    notFound();
  }

  if (loading || !game || !userId) {
    return (
      <main className="min-h-screen bg-stone-100 px-4 py-12">
        <p className="text-center text-stone-600">Loading game…</p>
      </main>
    );
  }

  let headerText = "";
  if (game.status === "waiting") {
    headerText = "Waiting for opponent…";
  } else if (game.status === "finished") {
    headerText =
      gameResultLabel(game.result, game.reason, userId, game.white_id) ??
      "Game over";
  } else if (isMyTurn) {
    headerText = `Your turn${engine.inCheck ? " — Check!" : ""}`;
  } else {
    headerText = `Opponent's turn (${displayColor(engine.turn)})`;
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="flex flex-1 flex-col items-center gap-4">
          <header className="text-center">
            <h1 className="text-2xl font-semibold text-stone-900">Online game</h1>
            <p className="mt-1 text-stone-600">{headerText}</p>
            {statusMessage && (
              <p className="mt-2 text-sm text-amber-700" role="alert">
                {statusMessage}
              </p>
            )}
          </header>

          {game.status === "waiting" && inviteCode && (
            <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <p className="font-medium text-stone-800">Share this invite link</p>
              <p className="mt-2 break-all font-mono text-stone-600">
                {origin ? `${origin}/join/${inviteCode}` : `/join/${inviteCode}`}
              </p>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="mt-3 rounded-md bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}

          {game.status !== "waiting" && (
            <Board
              pieces={engine.board}
              orientation={orientation}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              inCheckSquare={inCheckSquare}
              onSquareTap={handleSquareTap}
            />
          )}

          {game.status === "finished" && game.reason && (
            <p className="text-sm text-stone-600">
              {endReasonLabel(
                game.reason as
                  | "checkmate"
                  | "stalemate"
                  | "threefold"
                  | "fifty_move"
                  | "insufficient_material",
              )}
            </p>
          )}

          <Link
            href="/play"
            className="text-sm text-stone-600 underline-offset-2 hover:underline"
          >
            Back to play menu
          </Link>
        </section>

        <aside className="w-full rounded-lg border border-stone-200 bg-white p-4 lg:w-64">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Moves
          </h2>
          <MoveList history={sanHistory} />
        </aside>
      </div>

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
