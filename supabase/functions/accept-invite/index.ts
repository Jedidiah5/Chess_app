import {
  errorResponse,
  getServiceClient,
  getUserFromRequest,
  handleOptions,
  jsonResponse,
} from "../_shared/supabase.ts";

type AcceptInviteBody = {
  code?: string;
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

  let body: AcceptInviteBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_json");
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return errorResponse("invalid_code");
  }

  const db = getServiceClient();

  const { data: invite, error: inviteError } = await db
    .from("game_invites")
    .select("code, game_id, created_by, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    return errorResponse("lookup_failed", 500);
  }

  if (!invite || new Date(invite.expires_at) <= new Date()) {
    return errorResponse("invite_not_found");
  }

  if (invite.created_by === user.id) {
    return errorResponse("cannot_join_own_game");
  }

  const { data: game, error: gameError } = await db
    .from("games")
    .select("id, status, white_id, black_id")
    .eq("id", invite.game_id)
    .single();

  if (gameError || !game) {
    return errorResponse("game_not_found", 404);
  }

  if (game.status !== "waiting") {
    return errorResponse("game_not_waiting");
  }

  if (game.black_id !== null) {
    return errorResponse("game_full");
  }

  if (game.white_id === user.id) {
    return errorResponse("cannot_join_own_game");
  }

  const now = new Date().toISOString();

  const { error: updateError } = await db
    .from("games")
    .update({
      black_id: user.id,
      status: "active",
      started_at: now,
      last_move_at: now,
      black_seen_at: now,
    })
    .eq("id", game.id)
    .eq("status", "waiting");

  if (updateError) {
    return errorResponse("accept_failed", 500);
  }

  const { error: deleteError } = await db
    .from("game_invites")
    .delete()
    .eq("code", code);

  if (deleteError) {
    return errorResponse("accept_failed", 500);
  }

  return jsonResponse({ ok: true, gameId: game.id });
});
