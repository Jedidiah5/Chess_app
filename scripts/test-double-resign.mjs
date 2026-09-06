/**
 * Phase 5 acceptance: fire claim-result resign twice; ratings move once.
 * Usage: node scripts/test-double-resign.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("Missing env in .env.local");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sessionForEmail(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;

  const tokenHash = data.properties.hashed_token;
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await anonClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (verified.error) throw verified.error;
  if (!verified.data.session?.access_token) {
    throw new Error("No access token for " + email);
  }
  return verified.data.session;
}

async function main() {
  const { data: usersData, error: usersError } =
    await admin.auth.admin.listUsers({ perPage: 20 });
  if (usersError) throw usersError;
  const users = usersData.users;
  if (users.length < 2) {
    throw new Error("Need at least two accounts");
  }

  const white = users.find((u) => u.email?.includes("jed")) ?? users[0];
  const black =
    users.find((u) => u.id !== white.id) ?? users[1];

  console.log("White:", white.email, white.id);
  console.log("Black:", black.email, black.id);

  const { data: beforeProfiles, error: beforeErr } = await admin
    .from("profiles")
    .select("id,username,rating,games_played,wins,losses,draws")
    .in("id", [white.id, black.id]);
  if (beforeErr) throw beforeErr;
  console.log("Ratings before:", beforeProfiles);

  const now = new Date().toISOString();
  const { data: game, error: gameErr } = await admin
    .from("games")
    .insert({
      white_id: white.id,
      black_id: black.id,
      status: "active",
      rated: true,
      initial_ms: 0,
      increment_ms: 0,
      white_ms: 0,
      black_ms: 0,
      started_at: now,
      last_move_at: now,
      white_seen_at: now,
      black_seen_at: now,
      ply: 0,
    })
    .select("id")
    .single();
  if (gameErr) throw gameErr;

  const gameId = game.id;
  console.log("Created active rated game:", gameId);

  const session = await sessionForEmail(white.email);
  const jwt = session.access_token;
  console.log("Got JWT for", white.email);

  const body = JSON.stringify({ gameId, claim: "resign" });
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
  const endpoint = `${url}/functions/v1/claim-result`;

  console.log("Firing two claim-result resigns in parallel…");
  const [a, b] = await Promise.all([
    fetch(endpoint, { method: "POST", headers, body }),
    fetch(endpoint, { method: "POST", headers, body }),
  ]);

  const aText = await a.text();
  const bText = await b.text();
  console.log("Response A:", a.status, aText);
  console.log("Response B:", b.status, bText);

  const { data: afterGame, error: afterGameErr } = await admin
    .from("games")
    .select(
      "id,status,result,reason,rated,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta",
    )
    .eq("id", gameId)
    .single();
  if (afterGameErr) throw afterGameErr;
  console.log("Game after:", afterGame);

  const { data: afterProfiles, error: afterErr } = await admin
    .from("profiles")
    .select("id,username,rating,games_played,wins,losses,draws")
    .in("id", [white.id, black.id]);
  if (afterErr) throw afterErr;
  console.log("Ratings after:", afterProfiles);

  const deltaSum =
    (afterGame.white_rating_delta ?? 0) + (afterGame.black_rating_delta ?? 0);
  const whiteBefore = beforeProfiles.find((p) => p.id === white.id);
  const blackBefore = beforeProfiles.find((p) => p.id === black.id);
  const whiteAfter = afterProfiles.find((p) => p.id === white.id);
  const blackAfter = afterProfiles.find((p) => p.id === black.id);

  const whiteGain = whiteAfter.rating - whiteBefore.rating;
  const blackGain = blackAfter.rating - blackBefore.rating;

  console.log("\n--- Verdict ---");
  console.log("status:", afterGame.status);
  console.log("result/reason:", afterGame.result, afterGame.reason);
  console.log("deltas on game:", afterGame.white_rating_delta, afterGame.black_rating_delta, "sum=", deltaSum);
  console.log("profile rating changes:", whiteGain, blackGain, "sum=", whiteGain + blackGain);
  console.log(
    "games_played delta white/black:",
    whiteAfter.games_played - whiteBefore.games_played,
    blackAfter.games_played - blackBefore.games_played,
  );

  const ok =
    afterGame.status === "finished" &&
    afterGame.reason === "resignation" &&
    afterGame.result === "black" &&
    deltaSum === 0 &&
    whiteGain + blackGain === 0 &&
    whiteAfter.games_played - whiteBefore.games_played === 1 &&
    blackAfter.games_played - blackBefore.games_played === 1 &&
    // Exactly one rating application: each player moved by the stored delta
    whiteGain === afterGame.white_rating_delta &&
    blackGain === afterGame.black_rating_delta;

  if (!ok) {
    console.error("FAIL: ratings may have applied twice or finalise failed");
    process.exit(1);
  }
  console.log("PASS: resign applied once; deltas sum to zero");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
