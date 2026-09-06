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
  color?: "white" | "black" | "random";
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

  const timeControl = body.timeControl ?? "untimed";
  if (timeControl !== "blitz" && timeControl !== "rapid" && timeControl !== "untimed") {
    return errorResponse("invalid_time_control");
  }

  const { initialMs, incrementMs } = resolveTimeControl(timeControl);
  const db = getServiceClient();

  const { data: game, error: gameError } = await db
    .from("games")
    .insert({
      white_id: user.id,
      status: "waiting",
      rated: false,
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
