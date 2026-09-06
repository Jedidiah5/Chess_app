import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { computeEloPair } from "./elo.ts";

export type FinaliseResult = "white" | "black" | "draw";
export type FinaliseReason =
  | "checkmate"
  | "resignation"
  | "timeout"
  | "disconnect"
  | "stalemate"
  | "threefold"
  | "fifty_move"
  | "insufficient_material"
  | "agreement";

export type FinaliseArgs = {
  gameId: string;
  result: FinaliseResult;
  reason: FinaliseReason;
  whiteMs?: number;
  blackMs?: number;
};

export type FinaliseOutcome =
  | {
      ok: true;
      alreadyFinalised: boolean;
      result: FinaliseResult;
      reason: FinaliseReason;
      whiteRatingDelta: number | null;
      blackRatingDelta: number | null;
    }
  | { ok: false; error: string };

type GameSnap = {
  id: string;
  white_id: string;
  black_id: string | null;
  status: string;
  rated: boolean;
  result: string | null;
  reason: string | null;
  white_rating_before: number | null;
};

type ProfileSnap = {
  id: string;
  rating: number;
  games_played: number;
};

async function loadFinaliseContext(
  db: SupabaseClient,
  gameId: string,
): Promise<
  | { ok: true; game: GameSnap; white: ProfileSnap; black: ProfileSnap }
  | { ok: false; error: string }
> {
  const { data: game, error: gameError } = await db
    .from("games")
    .select(
      "id, white_id, black_id, status, rated, result, reason, white_rating_before",
    )
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return { ok: false, error: "game_not_found" };
  }

  const row = game as GameSnap;
  if (!row.black_id) {
    return { ok: false, error: "game_incomplete" };
  }

  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, rating, games_played")
    .in("id", [row.white_id, row.black_id]);

  if (profileError || !profiles || profiles.length !== 2) {
    return { ok: false, error: "profiles_missing" };
  }

  const white = profiles.find((p) => p.id === row.white_id) as ProfileSnap;
  const black = profiles.find((p) => p.id === row.black_id) as ProfileSnap;

  return { ok: true, game: row, white, black };
}

export async function finaliseGame(
  db: SupabaseClient,
  args: FinaliseArgs,
): Promise<FinaliseOutcome> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ctx = await loadFinaliseContext(db, args.gameId);
    if (!ctx.ok) {
      return ctx;
    }

    const { game, white, black } = ctx;

    if (
      game.status === "finished" &&
      (game.white_rating_before !== null || game.rated === false)
    ) {
      return {
        ok: true,
        alreadyFinalised: true,
        result: (game.result as FinaliseResult) ?? args.result,
        reason: (game.reason as FinaliseReason) ?? args.reason,
        whiteRatingDelta: null,
        blackRatingDelta: null,
      };
    }

    let whiteDelta = 0;
    let blackDelta = 0;

    if (game.rated) {
      const pair = computeEloPair({
        whiteRating: white.rating,
        blackRating: black.rating,
        whiteGamesPlayed: white.games_played,
        blackGamesPlayed: black.games_played,
        result: args.result,
      });
      whiteDelta = pair.whiteDelta;
      blackDelta = pair.blackDelta;
    }

    const { data, error } = await db.rpc("finalise_game", {
      p_game_id: args.gameId,
      p_result: args.result,
      p_reason: args.reason,
      p_white_delta: whiteDelta,
      p_black_delta: blackDelta,
      p_expected_white_rating: white.rating,
      p_expected_black_rating: black.rating,
      p_white_ms: args.whiteMs ?? null,
      p_black_ms: args.blackMs ?? null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const payload = data as {
      ok: boolean;
      error?: string;
      already_finalised?: boolean;
      result?: FinaliseResult;
      reason?: FinaliseReason;
      white_rating_delta?: number | null;
      black_rating_delta?: number | null;
    };

    if (!payload.ok) {
      if (payload.error === "rating_changed") {
        continue;
      }
      return { ok: false, error: payload.error ?? "finalise_failed" };
    }

    return {
      ok: true,
      alreadyFinalised: Boolean(payload.already_finalised),
      result: payload.result ?? args.result,
      reason: payload.reason ?? args.reason,
      whiteRatingDelta: payload.white_rating_delta ?? null,
      blackRatingDelta: payload.black_rating_delta ?? null,
    };
  }

  return { ok: false, error: "rating_changed" };
}
