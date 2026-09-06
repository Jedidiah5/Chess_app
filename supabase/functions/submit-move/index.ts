import { getTurnFromFen, tryMoveUci } from "../_shared/chess/engine.ts";
import { mapTerminalToDb } from "../_shared/terminal.ts";
import {
  errorResponse,
  getServiceClient,
  getUserFromRequest,
  handleOptions,
  jsonResponse,
} from "../_shared/supabase.ts";

type SubmitMoveBody = {
  gameId?: string;
  uci?: string;
  expectedPly?: number;
};

type GameRow = {
  id: string;
  white_id: string;
  black_id: string | null;
  current_fen: string;
  ply: number;
  status: string;
  result: string | null;
  reason: string | null;
  initial_ms: number;
  increment_ms: number;
  white_ms: number;
  black_ms: number;
  last_move_at: string | null;
};

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

  let body: SubmitMoveBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_json");
  }

  const gameId = body.gameId;
  const uci = body.uci?.trim();
  const expectedPly = body.expectedPly;

  if (!gameId || !uci || typeof expectedPly !== "number") {
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

  const turn = getTurnFromFen(row.current_fen);
  if (!turn) {
    return errorResponse("invalid_position", 500);
  }

  const turnId = turn === "w" ? row.white_id : row.black_id;
  if (turnId !== user.id) {
    return errorResponse("not_your_turn");
  }

  if (expectedPly !== row.ply) {
    return errorResponse("stale_position");
  }

  const moveResult = tryMoveUci(row.current_fen, uci);
  if (!moveResult.ok) {
    return errorResponse("illegal_move");
  }

  // Clock — elapsed from server last_move_at only. Never trust the request body.
  const isWhite = user.id === row.white_id;
  let whiteMs = row.white_ms;
  let blackMs = row.black_ms;
  let msLeft = isWhite ? whiteMs : blackMs;

  if (row.initial_ms > 0) {
    if (!row.last_move_at) {
      return errorResponse("missing_clock", 500);
    }

    const now = Date.now();
    const elapsed = now - Date.parse(row.last_move_at);
    msLeft = (isWhite ? whiteMs : blackMs) - elapsed + row.increment_ms;

    if (msLeft <= 0) {
      const winner = isWhite ? "black" : "white";
      const { error: timeoutError } = await db
        .from("games")
        .update({
          status: "finished",
          result: winner,
          reason: "timeout",
          ended_at: new Date().toISOString(),
          draw_offer_by: null,
          white_ms: isWhite ? 0 : whiteMs,
          black_ms: isWhite ? blackMs : 0,
        })
        .eq("id", row.id)
        .eq("status", "active");

      if (timeoutError) {
        return errorResponse("timeout_finalise_failed", 500);
      }

      return jsonResponse({
        ok: true,
        fen: row.current_fen,
        ply: row.ply,
        status: "finished",
        result: winner,
        reason: "timeout",
        white_ms: isWhite ? 0 : whiteMs,
        black_ms: isWhite ? blackMs : 0,
      });
    }

    if (isWhite) {
      whiteMs = msLeft;
    } else {
      blackMs = msLeft;
    }
  }

  const newPly = row.ply + 1;
  const terminal = mapTerminalToDb(moveResult.terminal);
  const status = terminal ? "finished" : "active";

  const { error: applyError } = await db.rpc("apply_move", {
    p_game_id: row.id,
    p_san: moveResult.san,
    p_uci: moveResult.uci,
    p_fen_after: moveResult.fen,
    p_ms_left: msLeft,
    p_new_ply: newPly,
    p_status: status,
    p_result: terminal?.result ?? null,
    p_reason: terminal?.reason ?? null,
    p_white_ms: whiteMs,
    p_black_ms: blackMs,
  });

  if (applyError) {
    return errorResponse("apply_failed", 500);
  }

  return jsonResponse({
    ok: true,
    fen: moveResult.fen,
    ply: newPly,
    status,
    white_ms: whiteMs,
    black_ms: blackMs,
    ...(terminal
      ? { result: terminal.result, reason: terminal.reason }
      : {}),
  });
});
