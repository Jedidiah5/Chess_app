import { getTurnFromFen } from "../_shared/chess/engine.ts";
import {
  errorResponse,
  getServiceClient,
  getUserFromRequest,
  handleOptions,
  jsonResponse,
} from "../_shared/supabase.ts";

type Claim =
  | "resign"
  | "timeout"
  | "disconnect"
  | "draw_offer"
  | "draw_accept"
  | "draw_decline";

type ClaimBody = {
  gameId?: string;
  claim?: Claim;
};

type GameRow = {
  id: string;
  white_id: string;
  black_id: string | null;
  current_fen: string;
  status: string;
  initial_ms: number;
  white_ms: number;
  black_ms: number;
  last_move_at: string | null;
  white_seen_at: string | null;
  black_seen_at: string | null;
  started_at: string | null;
  draw_offer_by: string | null;
};

const GRACE_MS = 30_000;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) {
    return options;
  }

  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", 405);
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse("unauthorized", 401);
  }

  let body: ClaimBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_json");
  }

  const gameId = body.gameId;
  const claim = body.claim;

  if (!gameId || !claim) {
    return errorResponse("invalid_request");
  }

  const db = getServiceClient();

  const { data: game, error: gameError } = await db
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return errorResponse("game_not_found", 404);
  }

  const row = game as GameRow;

  if (row.status !== "active") {
    return errorResponse("game_not_active");
  }

  if (user.id !== row.white_id && user.id !== row.black_id) {
    return errorResponse("not_a_player");
  }

  if (!row.black_id) {
    return errorResponse("game_not_active");
  }

  const isWhite = user.id === row.white_id;
  const opponentId = isWhite ? row.black_id : row.white_id;

  if (claim === "resign") {
    const result = isWhite ? "black" : "white";
    const { error } = await db
      .from("games")
      .update({
        status: "finished",
        result,
        reason: "resignation",
        ended_at: new Date().toISOString(),
        draw_offer_by: null,
      })
      .eq("id", row.id)
      .eq("status", "active");

    if (error) {
      return errorResponse("claim_failed", 500);
    }

    return jsonResponse({ ok: true, result, reason: "resignation" });
  }

  if (claim === "timeout") {
    if (row.initial_ms <= 0) {
      return errorResponse("no_clock");
    }
    if (!row.last_move_at) {
      return errorResponse("missing_clock", 500);
    }

    const turn = getTurnFromFen(row.current_fen);
    if (!turn) {
      return errorResponse("invalid_position", 500);
    }

    const turnId = turn === "w" ? row.white_id : row.black_id;
    if (turnId === user.id) {
      return errorResponse("not_opponent_turn");
    }

    const opponentIsWhite = turn === "w";
    const storedMs = opponentIsWhite ? row.white_ms : row.black_ms;
    const elapsed = Date.now() - Date.parse(row.last_move_at);
    const remaining = storedMs - elapsed;

    if (remaining > 0) {
      return errorResponse("opponent_has_time");
    }

    const result = opponentIsWhite ? "black" : "white";
    const { error } = await db
      .from("games")
      .update({
        status: "finished",
        result,
        reason: "timeout",
        ended_at: new Date().toISOString(),
        draw_offer_by: null,
        white_ms: opponentIsWhite ? 0 : row.white_ms,
        black_ms: opponentIsWhite ? row.black_ms : 0,
      })
      .eq("id", row.id)
      .eq("status", "active");

    if (error) {
      return errorResponse("claim_failed", 500);
    }

    return jsonResponse({ ok: true, result, reason: "timeout" });
  }

  if (claim === "disconnect") {
    const opponentSeenAt = isWhite ? row.black_seen_at : row.white_seen_at;
    const baseline = opponentSeenAt ?? row.started_at;
    if (!baseline) {
      return errorResponse("grace_period_active");
    }

    const silentFor = Date.now() - Date.parse(baseline);
    if (silentFor < GRACE_MS) {
      return errorResponse("grace_period_active");
    }

    const result = isWhite ? "white" : "black";
    const { error } = await db
      .from("games")
      .update({
        status: "finished",
        result,
        reason: "disconnect",
        ended_at: new Date().toISOString(),
        draw_offer_by: null,
      })
      .eq("id", row.id)
      .eq("status", "active");

    if (error) {
      return errorResponse("claim_failed", 500);
    }

    return jsonResponse({ ok: true, result, reason: "disconnect" });
  }

  if (claim === "draw_offer") {
    if (row.draw_offer_by === user.id) {
      return jsonResponse({ ok: true, result: null, reason: null });
    }

    const { error } = await db
      .from("games")
      .update({ draw_offer_by: user.id })
      .eq("id", row.id)
      .eq("status", "active");

    if (error) {
      return errorResponse("claim_failed", 500);
    }

    return jsonResponse({ ok: true, result: null, reason: null });
  }

  if (claim === "draw_accept") {
    if (!row.draw_offer_by) {
      return errorResponse("no_draw_offer");
    }
    if (row.draw_offer_by === user.id) {
      return errorResponse("cannot_accept_own_offer");
    }
    if (row.draw_offer_by !== opponentId) {
      return errorResponse("no_draw_offer");
    }

    const { error } = await db
      .from("games")
      .update({
        status: "finished",
        result: "draw",
        reason: "agreement",
        ended_at: new Date().toISOString(),
        draw_offer_by: null,
      })
      .eq("id", row.id)
      .eq("status", "active");

    if (error) {
      return errorResponse("claim_failed", 500);
    }

    return jsonResponse({ ok: true, result: "draw", reason: "agreement" });
  }

  if (claim === "draw_decline") {
    if (!row.draw_offer_by) {
      return errorResponse("no_draw_offer");
    }
    if (row.draw_offer_by === user.id) {
      return errorResponse("cannot_decline_own_offer");
    }

    const { error } = await db
      .from("games")
      .update({ draw_offer_by: null })
      .eq("id", row.id)
      .eq("status", "active");

    if (error) {
      return errorResponse("claim_failed", 500);
    }

    return jsonResponse({ ok: true, result: null, reason: null });
  }

  return errorResponse("invalid_claim");
});
