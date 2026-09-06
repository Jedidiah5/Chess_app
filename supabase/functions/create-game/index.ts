import { generateInviteCode } from "../_shared/invite.ts";
import {
  errorResponse,
  getServiceClient,
  getUserFromRequest,
  handleOptions,
  jsonResponse,
} from "../_shared/supabase.ts";

type CreateGameBody = {
  timeControl?: "blitz" | "rapid" | "untimed";
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
  if (timeControl !== "untimed") {
    return errorResponse("time_control_not_supported");
  }

  const db = getServiceClient();

  // Schema requires white_id NOT NULL. Creator occupies white; joiner takes black.
  const { data: game, error: gameError } = await db
    .from("games")
    .insert({
      white_id: user.id,
      status: "waiting",
      rated: false,
      initial_ms: 0,
      increment_ms: 0,
      white_ms: 0,
      black_ms: 0,
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
