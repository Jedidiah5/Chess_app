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

  // Phase 4: clock block goes here — compute elapsed from last_move_at,
  // subtract from mover's ms_left, flag on timeout before applying the move.

  const newPly = row.ply + 1;
  const terminal = mapTerminalToDb(moveResult.terminal);

  const status = terminal ? "finished" : "active";

  const { error: applyError } = await db.rpc("apply_move", {
    p_game_id: row.id,
    p_san: moveResult.san,
    p_uci: moveResult.uci,
    p_fen_after: moveResult.fen,
    p_ms_left: 0,
    p_new_ply: newPly,
    p_status: status,
    p_result: terminal?.result ?? null,
    p_reason: terminal?.reason ?? null,
  });

  if (applyError) {
    return errorResponse("apply_failed", 500);
  }

  return jsonResponse({
    ok: true,
    fen: moveResult.fen,
    ply: newPly,
    status,
    ...(terminal
      ? { result: terminal.result, reason: terminal.reason }
      : {}),
  });
});
