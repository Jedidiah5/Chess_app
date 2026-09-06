/**
 * Phase 5 remaining acceptance checks.
 * Usage: node scripts/phase5-acceptance.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { Chess } from "chess.js";
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

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? " — " + detail : ""}`);
}

async function sessionFor(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "email",
  });
  if (verified.error) throw verified.error;
  return verified.data.session;
}

async function invoke(name, jwt, body) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function profiles(ids) {
  const { data, error } = await admin
    .from("profiles")
    .select("id,username,rating,games_played,wins,losses,draws")
    .in("id", ids);
  if (error) throw error;
  return data;
}

async function createActiveGame({
  whiteId,
  blackId,
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  ply = 0,
  rated = true,
  initialMs = 0,
  whiteMs = 0,
  blackMs = 0,
  lastMoveAt = new Date().toISOString(),
  whiteSeenAt = new Date().toISOString(),
  blackSeenAt = new Date().toISOString(),
}) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("games")
    .insert({
      white_id: whiteId,
      black_id: blackId,
      status: "active",
      rated,
      current_fen: fen,
      ply,
      initial_ms: initialMs,
      increment_ms: 0,
      white_ms: whiteMs,
      black_ms: blackMs,
      started_at: now,
      last_move_at: lastMoveAt,
      white_seen_at: whiteSeenAt,
      black_seen_at: blackSeenAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function snap(list, id) {
  return list.find((p) => p.id === id);
}

async function assertRatedOnce(label, whiteId, blackId, before, afterGame, after, expectResult) {
  const wb = snap(before, whiteId);
  const bb = snap(before, blackId);
  const wa = snap(after, whiteId);
  const ba = snap(after, blackId);
  const wGain = wa.rating - wb.rating;
  const bGain = ba.rating - bb.rating;
  const deltaSum =
    (afterGame.white_rating_delta ?? 0) + (afterGame.black_rating_delta ?? 0);
  const ok =
    afterGame.status === "finished" &&
    afterGame.result === expectResult &&
    afterGame.white_rating_delta !== null &&
    afterGame.black_rating_delta !== null &&
    deltaSum === 0 &&
    wGain === afterGame.white_rating_delta &&
    bGain === afterGame.black_rating_delta &&
    wa.games_played - wb.games_played === 1 &&
    ba.games_played - bb.games_played === 1;
  if (ok) {
    pass(
      label,
      `Δ ${afterGame.white_rating_delta}/${afterGame.black_rating_delta} · ${wb.rating}→${wa.rating} / ${bb.rating}→${ba.rating}`,
    );
  } else {
    fail(
      label,
      JSON.stringify({ afterGame, wGain, bGain, wb, wa, bb, ba }, null, 0),
    );
  }
}

async function loadGame(id) {
  const { data, error } = await admin
    .from("games")
    .select(
      "id,status,result,reason,rated,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta,white_id,black_id",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 20 });
  const users = usersData.users;
  if (users.length < 2) throw new Error("need 2 users");

  // Stable pairing by email
  const a = users.find((u) => u.email === "jedidiahonotu@gmail.com") ?? users[0];
  const b = users.find((u) => u.id !== a.id);

  console.log(`Players: ${a.email} (${a.id}) vs ${b.email} (${b.id})\n`);

  const sessionA = await sessionFor(a.email);
  const sessionB = await sessionFor(b.email);
  const jwtA = sessionA.access_token;
  const jwtB = sessionB.access_token;

  // ---------- 1. Disconnect (priority) ----------
  {
    const before = await profiles([a.id, b.id]);
    const stale = new Date(Date.now() - 45_000).toISOString();
    const gameId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
      // White claims disconnect: opponent (black) silent > 30s
      blackSeenAt: stale,
      whiteSeenAt: new Date().toISOString(),
    });
    const res = await invoke("claim-result", jwtA, {
      gameId,
      claim: "disconnect",
    });
    const afterGame = await loadGame(gameId);
    const after = await profiles([a.id, b.id]);
    if (res.status !== 200 || !res.json.ok) {
      fail("disconnect ending", JSON.stringify(res));
    } else {
      // White wins on black disconnect
      await assertRatedOnce(
        "disconnect ending",
        a.id,
        b.id,
        before,
        afterGame,
        after,
        "white",
      );
    }
  }

  // ---------- 2. Timeout via claim-result ----------
  {
    const before = await profiles([a.id, b.id]);
    const gameId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      ply: 1,
      initialMs: 60_000,
      whiteMs: 60_000,
      blackMs: 5_000,
      // Black to move, clock already expired
      lastMoveAt: new Date(Date.now() - 30_000).toISOString(),
    });
    // White claims black timed out
    const res = await invoke("claim-result", jwtA, {
      gameId,
      claim: "timeout",
    });
    const afterGame = await loadGame(gameId);
    const after = await profiles([a.id, b.id]);
    if (res.status !== 200 || !res.json.ok) {
      fail("timeout ending", JSON.stringify(res));
    } else {
      await assertRatedOnce(
        "timeout ending",
        a.id,
        b.id,
        before,
        afterGame,
        after,
        "white",
      );
    }
  }

  // ---------- 3. Checkmate via submit-move ----------
  {
    const before = await profiles([a.id, b.id]);
    // Scholar's mate: Qxf7#
    const fen =
      "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    const gameId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
      fen,
      ply: 6,
    });
    const res = await invoke("submit-move", jwtA, {
      gameId,
      uci: "h5f7",
      expectedPly: 6,
    });
    const afterGame = await loadGame(gameId);
    const after = await profiles([a.id, b.id]);
    if (res.status !== 200 || !res.json.ok || res.json.reason !== "checkmate") {
      fail("checkmate ending", JSON.stringify(res));
    } else {
      await assertRatedOnce(
        "checkmate ending",
        a.id,
        b.id,
        before,
        afterGame,
        after,
        "white",
      );
    }
  }

  // ---------- 4. Stalemate via submit-move ----------
  {
    const before = await profiles([a.id, b.id]);
    // Classic: Ka8, Kb6, Qc4 → Qc7 stalemate
    const fen = "k7/8/1K6/8/2Q5/8/8/8 w - - 0 1";
    const gameId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
      fen,
      ply: 60,
    });
    const res = await invoke("submit-move", jwtA, {
      gameId,
      uci: "c4c7",
      expectedPly: 60,
    });
    const afterGame = await loadGame(gameId);
    const after = await profiles([a.id, b.id]);
    if (res.status !== 200 || !res.json.ok || res.json.reason !== "stalemate") {
      fail("stalemate ending", JSON.stringify(res));
    } else {
      await assertRatedOnce(
        "stalemate ending",
        a.id,
        b.id,
        before,
        afterGame,
        after,
        "draw",
      );
    }
  }

  // ---------- 5. Draw agreement (unequal ratings) ----------
  {
    // Make ratings unequal first
    await admin
      .from("profiles")
      .update({ rating: 1400 })
      .eq("id", a.id);
    await admin
      .from("profiles")
      .update({ rating: 1000 })
      .eq("id", b.id);

    const before = await profiles([a.id, b.id]);
    const gameId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
    });
    const offer = await invoke("claim-result", jwtA, {
      gameId,
      claim: "draw_offer",
    });
    const accept = await invoke("claim-result", jwtB, {
      gameId,
      claim: "draw_accept",
    });
    const afterGame = await loadGame(gameId);
    const after = await profiles([a.id, b.id]);

    if (offer.status !== 200 || accept.status !== 200 || !accept.json.ok) {
      fail("draw agreement ending", JSON.stringify({ offer, accept }));
    } else {
      const wa = snap(after, a.id);
      const ba = snap(after, b.id);
      const wb = snap(before, a.id);
      const bb = snap(before, b.id);
      const toward =
        wa.rating < wb.rating && ba.rating > bb.rating && // higher drops, lower rises
        afterGame.white_rating_delta + afterGame.black_rating_delta === 0 &&
        afterGame.result === "draw";
      if (toward) {
        pass(
          "draw agreement (unequal → toward each other)",
          `${wb.rating}→${wa.rating} (${afterGame.white_rating_delta}), ${bb.rating}→${ba.rating} (${afterGame.black_rating_delta})`,
        );
      } else {
        fail(
          "draw agreement (unequal → toward each other)",
          JSON.stringify({ before, after, afterGame }),
        );
      }
    }
  }

  // ---------- 6. Abandoned via cron-equivalent SQL ----------
  {
    const before = await profiles([a.id, b.id]);
    const gameId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
      rated: true,
    });
    // Same as pg_cron sweep in 0004
    const { error } = await admin
      .from("games")
      .update({
        status: "abandoned",
        rated: false,
        ended_at: new Date().toISOString(),
      })
      .eq("id", gameId);
    if (error) throw error;

    const afterGame = await loadGame(gameId);
    const after = await profiles([a.id, b.id]);
    const unchanged =
      snap(after, a.id).rating === snap(before, a.id).rating &&
      snap(after, b.id).rating === snap(before, b.id).rating &&
      snap(after, a.id).games_played === snap(before, a.id).games_played &&
      snap(after, b.id).games_played === snap(before, b.id).games_played &&
      afterGame.rated === false &&
      afterGame.status === "abandoned" &&
      afterGame.white_rating_delta === null;

    // finalise must refuse
    const { data: finaliseAttempt } = await admin.rpc("finalise_game", {
      p_game_id: gameId,
      p_result: "white",
      p_reason: "disconnect",
      p_white_delta: 10,
      p_black_delta: -10,
      p_expected_white_rating: snap(before, a.id).rating,
      p_expected_black_rating: snap(before, b.id).rating,
    });

    if (unchanged && finaliseAttempt?.error === "game_abandoned") {
      pass("abandoned game (cron path) changes nobody", `finalise refused: ${finaliseAttempt.error}`);
    } else {
      fail(
        "abandoned game (cron path) changes nobody",
        JSON.stringify({ afterGame, before, after, finaliseAttempt }),
      );
    }
  }

  // ---------- 7. Rematch swaps colours ----------
  {
    const finishedId = await createActiveGame({
      whiteId: a.id,
      blackId: b.id,
    });
    // Finish it via resign so rematchOf accepts
    await invoke("claim-result", jwtA, { gameId: finishedId, claim: "resign" });
    const rematch = await invoke("create-game", jwtA, {
      rematchOf: finishedId,
    });
    if (rematch.status !== 200 || !rematch.json.ok) {
      fail("rematch swaps colours", JSON.stringify(rematch));
    } else {
      const { data: ng } = await admin
        .from("games")
        .select("white_id,black_id,status")
        .eq("id", rematch.json.gameId)
        .single();
      if (
        ng.white_id === b.id &&
        ng.black_id === a.id &&
        ng.status === "active"
      ) {
        pass("rematch swaps colours", `${rematch.json.gameId}`);
      } else {
        fail("rematch swaps colours", JSON.stringify(ng));
      }
    }
  }

  // ---------- 8. Leaderboard <5 excluded; own rank outside top 20 ----------
  {
    // Reset our two to known state for this check
    await admin.from("profiles").update({ games_played: 3, rating: 1500 }).eq("id", a.id);
    await admin.from("profiles").update({ games_played: 2, rating: 1600 }).eq("id", b.id);

    const { data: under5 } = await admin
      .from("leaderboard")
      .select("id")
      .in("id", [a.id, b.id]);
    if ((under5 ?? []).length === 0) {
      pass("leaderboard excludes <5 rated games");
    } else {
      fail("leaderboard excludes <5 rated games", JSON.stringify(under5));
    }

    // Seed 22 dummy ranked players so A can be outside top 20
    const dummyIds = [];
    for (let i = 0; i < 22; i += 1) {
      const email = `lb-test-${Date.now()}-${i}@example.com`;
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `TestPass${i}!xxxx`,
      });
      if (error) {
        fail("leaderboard seed users", error.message);
        break;
      }
      dummyIds.push(created.user.id);
      await admin
        .from("profiles")
        .update({
          username: `lb${i}${String(Date.now()).slice(-4)}`,
          games_played: 5,
          rating: 2000 - i, // ranks 1..22
          wins: 5,
          losses: 0,
          draws: 0,
        })
        .eq("id", created.user.id);
    }

    await admin
      .from("profiles")
      .update({ games_played: 5, rating: 800, wins: 1, losses: 4, draws: 0 })
      .eq("id", a.id);

    const { data: top20 } = await admin
      .from("leaderboard")
      .select("id,rank,rating")
      .order("rank", { ascending: true })
      .limit(20);
    const { data: myRank } = await admin
      .from("leaderboard")
      .select("id,rank,rating")
      .eq("id", a.id)
      .maybeSingle();

    const aInTop20 = (top20 ?? []).some((r) => r.id === a.id);
    if (!aInTop20 && myRank && myRank.rank > 20) {
      pass(
        "rank shows outside top 20",
        `rank #${myRank.rank} rating ${myRank.rating}`,
      );
    } else {
      fail(
        "rank shows outside top 20",
        JSON.stringify({ aInTop20, myRank, top20len: top20?.length }),
      );
    }

    // Cleanup dummy users
    for (const id of dummyIds) {
      await admin.auth.admin.deleteUser(id);
    }
  }

  // ---------- 9. Replay game: castling, en passant, promotion ----------
  {
    const sans = [
      "e4",
      "e6",
      "e5",
      "d5",
      "exd6", // en passant
      "Nf6",
      "d4",
      "Bd6",
      "Nf3",
      "O-O", // black castles
      "Bd3",
      "Re8",
      "O-O", // white castles
      "a6",
      "d5",
      "b6",
      "dxe6",
      "c6",
      "e7",
      "g6",
      "exd8=N", // promotion
    ];

    const chess = new Chess();
    const moves = [];
    let ep = false;
    let castle = false;
    let promo = false;
    let okMoves = true;

    for (const san of sans) {
      const m = chess.move(san);
      if (!m) {
        okMoves = false;
        fail("replay seed moves", `illegal SAN ${san} at ply ${moves.length}`);
        break;
      }
      if (m.flags.includes("e")) ep = true;
      if (m.flags.includes("k") || m.flags.includes("q")) castle = true;
      if (m.promotion) promo = true;
      moves.push({
        ply: moves.length + 1,
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion ?? ""}`,
        fen_after: chess.fen(),
      });
    }

    if (okMoves) {
      const now = new Date().toISOString();
      const { data: game, error: gErr } = await admin
        .from("games")
        .insert({
          white_id: a.id,
          black_id: b.id,
          status: "finished",
          rated: false,
          result: "white",
          reason: "checkmate",
          current_fen: chess.fen(),
          ply: moves.length,
          initial_ms: 0,
          increment_ms: 0,
          white_ms: 0,
          black_ms: 0,
          started_at: now,
          ended_at: now,
          last_move_at: now,
        })
        .select("id")
        .single();
      if (gErr) throw gErr;

      const rows = moves.map((m) => ({
        game_id: game.id,
        ply: m.ply,
        san: m.san,
        uci: m.uci,
        fen_after: m.fen_after,
        ms_left: 0,
      }));
      const { error: mErr } = await admin.from("moves").insert(rows);
      if (mErr) throw mErr;

      const replay = new Chess();
      let replayOk = true;
      const { data: stored } = await admin
        .from("moves")
        .select("ply,san,uci,fen_after")
        .eq("game_id", game.id)
        .order("ply", { ascending: true });

      for (const row of stored) {
        const m = replay.move(row.san);
        if (!m || replay.fen() !== row.fen_after) {
          replayOk = false;
          fail(
            "replay castling/EP/promotion",
            `mismatch at ply ${row.ply} san=${row.san}`,
          );
          break;
        }
      }

      if (replayOk && ep && castle && promo) {
        pass(
          "replay castling/EP/promotion",
          `game ${game.id} · ${stored.length} moves · open /games/${game.id}`,
        );
        console.log(`\n  → Replay URL: http://localhost:3000/games/${game.id}\n`);
      } else if (replayOk) {
        fail(
          "replay castling/EP/promotion",
          `missing flags castle=${castle} ep=${ep} promo=${promo}`,
        );
      }
    }
  }

  console.log("\n========== SUMMARY ==========");
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(" -", f.name, f.detail);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
