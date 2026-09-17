import { createClient } from "@supabase/supabase-js";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

type UploadMove = {
  ply: number;
  san: string;
  uci: string;
  fen_after: string;
};

type UploadBody = {
  localId: string;
  mode: "local" | "computer";
  result: "white" | "black" | "draw";
  reason: string;
  fen: string;
  moves: UploadMove[];
  playerColor: "w" | "b";
  endedAt?: string;
};

const BOT_EMAIL = {
  computer: "bot-computer@chess.local",
  local: "bot-local@chess.local",
} as const;

const BOT_USERNAME = {
  computer: "Computer",
  local: "LocalOpp",
} as const;

function getServiceClient() {
  const { url } = requireSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("missing_service_role");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUserClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // ignore in route handlers when cookies are read-only
        }
      },
    },
  });
}

async function ensureBotUser(
  admin: ReturnType<typeof getServiceClient>,
  kind: "computer" | "local",
): Promise<string> {
  const username = BOT_USERNAME[kind];
  const email = BOT_EMAIL[kind];

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { bot: kind },
    });

  if (createError || !created.user) {
    // Race: profile may already exist from a parallel request
    const { data: again } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (again?.id) return again.id as string;
    throw new Error(createError?.message ?? "bot_create_failed");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ username })
    .eq("id", created.user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return created.user.id;
}

export async function POST(request: Request) {
  try {
    const userClient = await getUserClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: UploadBody;
    try {
      body = (await request.json()) as UploadBody;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    if (
      !body ||
      (body.mode !== "local" && body.mode !== "computer") ||
      !body.result ||
      !body.reason ||
      !body.fen ||
      !Array.isArray(body.moves) ||
      (body.playerColor !== "w" && body.playerColor !== "b")
    ) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const admin = getServiceClient();
    const botKind = body.mode === "computer" ? "computer" : "local";
    const botId = await ensureBotUser(admin, botKind);

    const whiteId = body.playerColor === "w" ? user.id : botId;
    const blackId = body.playerColor === "w" ? botId : user.id;

    if (whiteId === blackId) {
      return NextResponse.json({ ok: false, error: "same_player" }, { status: 400 });
    }

    const endedAt = body.endedAt ?? new Date().toISOString();
    const ply = body.moves.length;

    const { data: game, error: gameError } = await admin
      .from("games")
      .insert({
        white_id: whiteId,
        black_id: blackId,
        current_fen: body.fen,
        ply,
        status: "finished",
        result: body.result,
        reason: body.reason,
        rated: false,
        initial_ms: 0,
        increment_ms: 0,
        white_ms: 0,
        black_ms: 0,
        started_at: endedAt,
        ended_at: endedAt,
        last_move_at: endedAt,
      })
      .select("id")
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { ok: false, error: gameError?.message ?? "insert_failed" },
        { status: 500 },
      );
    }

    if (body.moves.length > 0) {
      const { error: movesError } = await admin.from("moves").insert(
        body.moves.map((m) => ({
          game_id: game.id,
          ply: m.ply,
          san: m.san,
          uci: m.uci,
          fen_after: m.fen_after,
          ms_left: 0,
        })),
      );

      if (movesError) {
        await admin.from("games").delete().eq("id", game.id);
        return NextResponse.json(
          { ok: false, error: movesError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      gameId: game.id,
      localId: body.localId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
