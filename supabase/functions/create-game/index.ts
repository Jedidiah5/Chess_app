import { resolveTimeControl } from "../_shared/timeControl.ts";
import type { TimeControl } from "../_shared/timeControl.ts";
import { generateInviteCode } from "../_shared/invite.ts";
import {
  errorResponse,
  getServiceClient,
  getUserFromRequest,
  handleOptions,
  jsonResponse,
} from "../_shared/supabase.ts";

type CreateGameBody = {
  timeControl?: TimeControl;
  rematchOf?: string;
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

  let body: CreateGameBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_json");
  }

  const db = getServiceClient();

  if (body.rematchOf) {
    const { data: prior, error: priorError } = await db
      .from("games")
      .select(
        "id, white_id, black_id, status, initial_ms, increment_ms, rated",
      )
      .eq("id", body.rematchOf)
      .single();

    if (priorError || !prior) {
      return errorResponse("game_not_found", 404);
    }

    if (prior.status !== "finished") {
      return errorResponse("game_not_finished");
    }

    if (!prior.black_id) {
      return errorResponse("game_incomplete");
    }

    if (user.id !== prior.white_id && user.id !== prior.black_id) {
      return errorResponse("not_a_player");
    }

    const now = new Date().toISOString();
    // Colours swapped relative to the finished game.
    const { data: game, error: gameError } = await db
      .from("games")
      .insert({
        white_id: prior.black_id,
        black_id: prior.white_id,
        status: "active",
        rated: true,
        initial_ms: prior.initial_ms,
        increment_ms: prior.increment_ms,
        white_ms: prior.initial_ms,
        black_ms: prior.initial_ms,
        started_at: now,
        last_move_at: now,
        white_seen_at: now,
        black_seen_at: now,
      })
      .select("id")
      .single();

    if (gameError || !game) {
      return errorResponse("create_failed", 500);
    }

    return jsonResponse({ ok: true, gameId: game.id, inviteCode: null });
  }

  const timeControl = body.timeControl ?? "untimed";
  if (timeControl !== "blitz" && timeControl !== "rapid" && timeControl !== "untimed") {
    return errorResponse("invalid_time_control");
  }

  const { initialMs, incrementMs } = resolveTimeControl(timeControl);

  const { data: game, error: gameError } = await db
    .from("games")
    .insert({
      white_id: user.id,
      status: "waiting",
      rated: true,
      initial_ms: initialMs,
      increment_ms: incrementMs,
      white_ms: initialMs,
      black_ms: initialMs,
      white_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (gameError || !game) {
    return errorResponse("create_failed", 500);
  }

  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error: inviteError } = await db.from("game_invites").insert({
      code: inviteCode,
      game_id: game.id,
      created_by: user.id,
    });

    if (!inviteError) {
      return jsonResponse({ ok: true, gameId: game.id, inviteCode });
    }

    if (inviteError.code !== "23505") {
      return errorResponse("invite_failed", 500);
    }

    inviteCode = generateInviteCode();
  }

  return errorResponse("invite_failed", 500);
});
