# Chess App — System Architecture

**Version:** MVP 1.0
**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + Realtime + Edge Functions) · Stockfish WASM
**Deploy:** Vercel (web) + Supabase Cloud (backend)

---

## 1. Design principles

These four rules explain almost every decision below. When in doubt, come back here.

1. **The server owns the board.** A client may render a move instantly, but it never decides whether a move was legal or who won. Rated games and a public leaderboard mean any client-trusted result is a cheat vector.
2. **The server owns the clock.** Wall-clock time on a phone is unreliable and trivially spoofed. Clients count down from server-issued numbers; they never report elapsed time.
3. **Offline is unrated, therefore offline is simple.** Because no offline result touches a rating, there is no sync conflict, no reconciliation, no anti-cheat surface. This is the single biggest simplification in the design.
4. **One rules engine, two runtimes.** The same `chess.js` version runs in the browser and inside the Edge Function. Different engines would eventually disagree on some en-passant edge case at the worst possible moment.

---

## 2. Tech stack and why

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | Next.js (App Router) | Server components for leaderboard/profile pages, client components for the board |
| Language | TypeScript, strict mode | Shared types between client and Edge Functions |
| Styling | Tailwind CSS | — |
| Rules engine | `chess.js` | Runs identically in browser and Deno |
| Board UI | Custom CSS grid + SVG pieces | Full control over the lift/shadow choreography — see §19 |
| Landing page 3D | Three.js via React Three Fiber + drei | Marketing surface only, route-scoped, never in the app bundle |
| AI opponent | Stockfish WASM (Web Worker) | Runs fully on-device: zero server cost, works offline |
| Database | Supabase Postgres | Leaderboard, Elo and head-to-head are relational aggregate queries |
| Auth | Supabase Auth | Row-level security keys off `auth.uid()` |
| Realtime | Supabase Realtime (Postgres Changes + Presence) | Board sync and disconnect detection in one subscription |
| Trusted logic | Supabase Edge Functions (Deno) | Move validation, game finalisation, rating writes |
| Offline shell | `next-pwa` service worker + IndexedDB | Installable, launches with no connection |

**Why not Firebase.** Firestore would work, but the top-20 leaderboard with a minimum-games filter, and head-to-head records against a specific opponent, are both single SQL statements in Postgres. In Firestore they become denormalised counters that must be kept in sync on every game finalisation — more code and more ways to drift.

---

## 3. System layers

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT — Next.js PWA (Vercel)                          │
│                                                         │
│  Board UI (react-chessboard)                            │
│  Local rules engine (chess.js) — optimistic validation  │
│  Stockfish worker (WASM) — offline AI, unrated          │
│  Service worker — app shell cache                       │
│  IndexedDB — offline games, in-progress state           │
└──────────────┬──────────────────────────┬───────────────┘
               │ HTTPS                    │ WebSocket
               ▼                          ▼
┌──────────────────────────┐  ┌───────────────────────────┐
│  EDGE FUNCTIONS (Deno)   │  │  SUPABASE REALTIME        │
│                          │  │                           │
│  submit-move             │  │  Postgres Changes         │
│  claim-result            │  │   → moves inserted        │
│  create-game             │  │   → game status changed   │
│  accept-invite           │  │  Presence                 │
│                          │  │   → who is in this game   │
│  Holds service role key. │  │                           │
│  Only writer of ratings. │  │  Read-only to clients.    │
└──────────────┬───────────┘  └───────────┬───────────────┘
               │                          │
               ▼                          │
┌─────────────────────────────────────────┴───────────────┐
│  POSTGRES                                               │
│                                                         │
│  profiles · games · moves · game_invites                │
│  leaderboard (view) · head_to_head (function)           │
│  RLS on every table. pg_cron sweeper for dead games.    │
└─────────────────────────────────────────────────────────┘
```

**The key asymmetry:** clients **read** from Postgres directly (via RLS-protected `select`) and **listen** on Realtime, but they **never write** to `games`, `moves`, or `profiles`. All writes go through Edge Functions holding the service role key.

---

## 4. Data model

```sql
create type game_status  as enum ('waiting', 'active', 'finished', 'abandoned');
create type game_result  as enum ('white', 'black', 'draw');
create type end_reason   as enum (
  'checkmate', 'resignation', 'timeout', 'disconnect',
  'stalemate', 'threefold', 'fifty_move', 'insufficient_material', 'agreement'
);

-- ─────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique not null check (char_length(username) between 3 and 20),
  avatar_url    text,
  rating        integer not null default 1200,
  games_played  integer not null default 0,
  wins          integer not null default 0,
  losses        integer not null default 0,
  draws         integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
create table games (
  id               uuid primary key default gen_random_uuid(),
  white_id         uuid not null references profiles(id),
  black_id         uuid references profiles(id),      -- null until opponent joins

  current_fen      text not null
                   default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ply              integer not null default 0,

  status           game_status not null default 'waiting',
  result           game_result,
  reason           end_reason,
  rated            boolean not null default true,

  -- clock (all values in milliseconds)
  initial_ms       integer not null,
  increment_ms     integer not null default 0,
  white_ms         integer not null,
  black_ms         integer not null,
  last_move_at     timestamptz,

  -- disconnect tracking
  white_seen_at    timestamptz,
  black_seen_at    timestamptz,

  -- rating snapshot, written at finalisation
  white_rating_before integer,
  black_rating_before integer,
  white_rating_delta  integer,
  black_rating_delta  integer,

  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  ended_at         timestamptz,

  constraint distinct_players check (white_id <> black_id)
);

create index games_white_idx  on games(white_id);
create index games_black_idx  on games(black_id);
create index games_active_idx on games(status) where status = 'active';

-- ─────────────────────────────────────────────
create table moves (
  game_id     uuid not null references games(id) on delete cascade,
  ply         integer not null,
  san         text not null,          -- 'Nf3'  — for display and PGN
  uci         text not null,          -- 'g1f3' — for engine + animation
  fen_after   text not null,
  ms_left     integer not null,       -- mover's clock after this move
  created_at  timestamptz not null default now(),
  primary key (game_id, ply)
);

-- ─────────────────────────────────────────────
create table game_invites (
  code        text primary key,        -- short shareable code, e.g. 'K7M2Q9'
  game_id     uuid not null references games(id) on delete cascade,
  created_by  uuid not null references profiles(id),
  expires_at  timestamptz not null default now() + interval '24 hours'
);
```

### Derived reads — no extra tables

**Leaderboard.** A view, not a maintained table:

```sql
create view leaderboard as
select
  row_number() over (order by rating desc, games_played desc) as rank,
  id, username, avatar_url, rating, games_played, wins, losses, draws
from profiles
where games_played >= 5;
```

Top 20 is `select * from leaderboard limit 20`. Your own rank is `select rank from leaderboard where id = $1`, which still works when you're #340.

**Head-to-head.** A function, computed on demand:

```sql
create function head_to_head(me uuid, them uuid)
returns table (wins int, losses int, draws int, total int)
language sql stable as $$
  select
    count(*) filter (where (white_id = me and result = 'white')
                        or (black_id = me and result = 'black'))::int,
    count(*) filter (where (white_id = me and result = 'black')
                        or (black_id = me and result = 'white'))::int,
    count(*) filter (where result = 'draw')::int,
    count(*)::int
  from games
  where status = 'finished' and rated
    and ((white_id = me and black_id = them)
      or (white_id = them and black_id = me));
$$;
```

For two brothers with a few hundred games this is instant. Only denormalise if it ever becomes slow — it won't.

---

## 5. Security — row-level security

```sql
alter table profiles     enable row level security;
alter table games        enable row level security;
alter table moves        enable row level security;
alter table game_invites enable row level security;

-- Profiles are publicly readable (leaderboard needs this)
create policy profiles_read on profiles
  for select using (true);

-- You may only edit your own username/avatar. Note the WITH CHECK:
-- it blocks writing to rating and the W/L/D counters from the client.
create policy profiles_update_self on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (rating, games_played, wins, losses, draws) on profiles from authenticated;

-- You can read games you are playing in. No spectating in MVP.
create policy games_read_own on games
  for select using (auth.uid() in (white_id, black_id));

-- Moves are readable if the parent game is readable.
create policy moves_read_own on moves
  for select using (exists (
    select 1 from games g
    where g.id = moves.game_id and auth.uid() in (g.white_id, g.black_id)
  ));

-- Anyone signed in can look up an unexpired invite (that is how joining works).
create policy invites_read on game_invites
  for select using (expires_at > now());
```

There is deliberately **no insert or update policy** on `games` or `moves`. Clients cannot write them at all. The service role key inside Edge Functions bypasses RLS, and that is the only path in.

When spectating is added later, `games_read_own` becomes the place you widen — and the fact that it's one policy in one place is why this structure is worth setting up now.

---

## 6. Edge Functions — the API surface

Four functions. Each returns `{ ok: true, ... }` or `{ ok: false, error: string }`.

### `create-game`
**In:** `{ timeControl: 'blitz' | 'rapid' | 'untimed', color?: 'white' | 'black' | 'random' }`
**Out:** `{ gameId, inviteCode }`

Creates a `waiting` game with the caller as one player, generates a 6-character invite code.

### `accept-invite`
**In:** `{ code }`
**Out:** `{ gameId }`

Validates the code hasn't expired and the game is still `waiting`, fills in the empty player slot, flips status to `active`, sets `started_at` and `last_move_at`, deletes the invite.

### `submit-move`  ← the critical one
**In:** `{ gameId, uci, expectedPly }`
**Out:** `{ ok, fen, ply, status, result?, reason? }`

```ts
// supabase/functions/submit-move/index.ts
import { Chess } from 'npm:chess.js@1.0.0'

// 1. Load game with service role
const game = await db.from('games').select('*').eq('id', gameId).single()

// 2. Authorisation
if (game.status !== 'active')          return err('game_not_active')
if (!isPlayer(user.id, game))          return err('not_a_player')

// 3. Turn check — derived from the stored FEN, never from the request
const chess = new Chess(game.current_fen)
const turnId = chess.turn() === 'w' ? game.white_id : game.black_id
if (turnId !== user.id)                return err('not_your_turn')

// 4. Idempotency / stale client guard
if (expectedPly !== game.ply)          return err('stale_position')

// 5. Legality — this is the whole point of the function
const move = chess.move(uci)           // throws or returns null if illegal
if (!move)                             return err('illegal_move')

// 6. Clock — elapsed computed server-side from last_move_at
const now      = Date.now()
const elapsed  = now - Date.parse(game.last_move_at)
const isWhite  = user.id === game.white_id
const msBefore = isWhite ? game.white_ms : game.black_ms
const msLeft   = msBefore - elapsed + game.increment_ms

if (game.initial_ms > 0 && msLeft <= 0) {
  return finalise(game, { winner: opponentOf(user.id, game), reason: 'timeout' })
}

// 7. Terminal position check — chess.js gives us all of these
let outcome = null
if (chess.isCheckmate())                outcome = { winner: user.id, reason: 'checkmate' }
else if (chess.isStalemate())           outcome = { draw: true, reason: 'stalemate' }
else if (chess.isThreefoldRepetition()) outcome = { draw: true, reason: 'threefold' }
else if (chess.isDraw())                outcome = { draw: true, reason: 'fifty_move' }
else if (chess.isInsufficientMaterial())outcome = { draw: true, reason: 'insufficient_material' }

// 8. Single transaction: insert move + update game (+ ratings if terminal)
await rpc('apply_move', { ... })
```

Steps 3, 5 and 6 are the anti-cheat. A modified client can send anything it likes; it cannot make an illegal move legal, move out of turn, or invent time it didn't have.

### `claim-result`
**In:** `{ gameId, claim: 'timeout' | 'disconnect' | 'resign' | 'draw_offer' | 'draw_accept' }`
**Out:** `{ ok, result, reason }`

The surviving client *asks*; the server *decides*. For a disconnect claim the function checks `opponent_seen_at < now() - interval '30 seconds'` itself. A client claiming early simply gets `{ ok: false, error: 'grace_period_active' }`.

---

## 7. Realtime channels

One channel per game: `game:{gameId}`.

```ts
const channel = supabase.channel(`game:${gameId}`)

  // Board sync — fires when the Edge Function inserts a move
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'moves',
        filter: `game_id=eq.${gameId}` },
      ({ new: move }) => applyRemoteMove(move))

  // Game end — status flips to 'finished'
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games',
        filter: `id=eq.${gameId}` },
      ({ new: game }) => { if (game.status === 'finished') showResult(game) })

  // Presence — who is actually in the room right now
  .on('presence', { event: 'leave' }, () => startDisconnectCountdown())
  .on('presence', { event: 'join'  }, () => cancelDisconnectCountdown())

  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await channel.track({ userId })
  })
```

Realtime is **notification only**. It tells a client that something changed; the authoritative state is always the row in Postgres. On reconnect, the client refetches the game and replays `moves` from its last known ply rather than trusting whatever position its memory held.

---

## 8. Game lifecycle

```
  create-game
      │
      ▼
  ┌─────────┐  accept-invite   ┌────────┐
  │ waiting │ ───────────────► │ active │
  └─────────┘                  └────┬───┘
      │                             │
      │ invite expires              ├── checkmate / stalemate / draw  ─┐
      ▼                             ├── resign (claim-result)          │
  ┌───────────┐                     ├── timeout (submit or claim)      │
  │ abandoned │ ◄─── both gone ─────┤                                  │
  └───────────┘      (pg_cron)      └── disconnect + 30s (claim)  ─────┤
                                                                        ▼
                                                                 ┌──────────┐
                                                                 │ finished │
                                                                 └──────────┘
                                                                  ratings written
```

`abandoned` games are unrated and affect nobody's record. That's the escape hatch for the case where both players' connections die.

---

## 9. Clock model

Never send a duration from the client. The server stores:

- `white_ms` / `black_ms` — milliseconds remaining as of the last completed move
- `last_move_at` — server timestamp of that move

The client renders the active player's clock as `stored_ms - (Date.now() - last_move_at)`, purely for display. When a move arrives, the server recomputes elapsed time from its own clock and writes the real value.

**Flag fall** resolves in one of two places:
1. The player on the move submits a move after their time expired → `submit-move` catches it and finalises as a timeout loss.
2. The player on the move goes silent → the opponent's client notices the displayed clock hit zero and calls `claim-result`, which re-verifies server-side.

No background job is needed for the common case. `pg_cron` runs a sweep every 5 minutes purely to clean up games where *both* players disappeared:

```sql
select cron.schedule('sweep-dead-games', '*/5 * * * *', $$
  update games set status = 'abandoned', ended_at = now()
  where status = 'active'
    and greatest(coalesce(white_seen_at, started_at),
                 coalesce(black_seen_at, started_at)) < now() - interval '10 minutes';
$$);
```

---

## 10. Disconnect handling

Agreed rule: **opponent wins after a 30-second grace period.**

1. Presence `leave` fires on the surviving client.
2. UI shows "Opponent reconnecting…" and starts a 30s countdown. The disconnected player's clock keeps running throughout.
3. Presence `join` within 30s → countdown cancelled. The returning client refetches the game row and replays moves from its last ply, so it resumes on the true position rather than a stale one.
4. No return within 30s → surviving client calls `claim-result` with `disconnect`. The server independently verifies `opponent_seen_at` before awarding the win. Rated as a normal win.
5. Both gone → `pg_cron` marks it `abandoned`, unrated.

The 30s window matters more than it sounds. You two are on opposite sides of the world on mobile networks; a backgrounded tab or a tunnel drops the socket for 10–20 seconds routinely. Without the grace period you'd lose won positions to the London Underground.

---

## 11. Rating system

Standard Elo, computed **only** inside the finalisation path, inside the same transaction that writes the result.

```ts
function kFactor(gamesPlayed: number, rating: number): number {
  if (gamesPlayed < 30) return 40   // provisional — settles fast
  if (rating > 2400)    return 16   // established strong players
  return 32
}

function eloDelta(mine: number, theirs: number, score: 0 | 0.5 | 1, k: number) {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400))
  return Math.round(k * (score - expected))
}
```

- Everyone starts at **1200**
- Only `rated = true` online multiplayer games affect rating
- Vs-computer and pass-and-play are always `rated = false` — by your decision
- `rating_before` and `rating_delta` are snapshotted onto the game row, so game history can show "1204 → 1219 (+15)"
- A player must reach **5 rated games** before appearing on the leaderboard

---

## 12. Single player (offline AI)

Stockfish compiled to WASM, running in a Web Worker so the main thread never blocks:

```ts
const engine = new Worker('/stockfish.js')
engine.postMessage('uci')
engine.postMessage(`position fen ${fen}`)
engine.postMessage(`go depth ${depthForLevel(level)}`)
// listen for 'bestmove e2e4'
```

Difficulty maps to search depth plus Stockfish's own `Skill Level` option:

| Level | Depth | Skill Level | Roughly |
|---|---|---|---|
| Beginner | 1 | 0 | ~800 |
| Casual | 5 | 5 | ~1200 |
| Club | 10 | 12 | ~1600 |
| Strong | 15 | 20 | ~2000+ |

Because it runs on-device: zero server cost, zero latency, works with the phone in airplane mode. It also means the WASM binary (~1–2 MB) must be precached by the service worker at install time, not fetched on demand.

---

## 13. Offline and PWA strategy

**What works offline:** pass-and-play, vs-computer, browsing your local game archive, replaying finished games already cached.
**What doesn't:** online multiplayer, leaderboard, starting a rated game. These show a clear "you're offline" state rather than failing silently.

Service worker precaches the app shell, board assets, and the Stockfish WASM binary. IndexedDB stores:

- `offline_games` — completed pass-and-play and vs-computer games
- `active_offline_game` — the in-progress local game, written after every move so closing the tab loses nothing
- `cached_games` — read-only copies of finished online games for offline replay

**The sync story is deliberately trivial.** Offline games are unrated, so they never touch a rating, a leaderboard, or a head-to-head record. When connectivity returns, they upload to the archive as `rated = false` rows — or don't, and nothing breaks. There's no conflict resolution because there's nothing to conflict over. This is the payoff from decision 3 in section 1.

---

## 14. Client structure

```
app/
  (auth)/login/page.tsx
  (app)/
    play/
      page.tsx                 # mode picker: online / computer / pass-and-play
      [gameId]/page.tsx        # live online board
      computer/page.tsx        # Stockfish, offline-capable
      local/page.tsx           # pass-and-play, offline-capable
    leaderboard/page.tsx       # server component, top 20
    profile/[username]/page.tsx# stats, head-to-head, game archive
    game/[id]/page.tsx         # replay a finished game
  offline/page.tsx             # service worker fallback

components/
  board/Board.tsx              # CSS grid, 8x8, handles orientation
  board/Square.tsx             # paper tone, highlight ring, coordinates
  board/Piece.tsx              # SVG piece, transform-driven, shadow states
  board/useMoveAnimator.ts     # animation queue + catch-up snapping
  board/MoveList.tsx           # SAN notation, click to jump
  board/Clock.tsx              # renders from server values
  board/GameControls.tsx       # resign, draw, rematch
  board/DisconnectBanner.tsx   # the 30s countdown

lib/
  chess/engine.ts              # chess.js helpers, shared with Edge Functions
  chess/stockfish.ts           # Web Worker wrapper
  supabase/client.ts
  supabase/realtime.ts         # channel subscribe/teardown
  offline/db.ts                # IndexedDB (idb)
  elo.ts                       # shared with Edge Functions — same file, imported both sides

types/
  game.ts                      # generated from Supabase schema
```

Keep `lib/chess/engine.ts` and `lib/elo.ts` genuinely shared between client and Edge Functions. Two copies of the Elo formula will diverge.

---

## 15. Build order

Each phase ends somewhere usable rather than half-finished.

**Phase 1 — a board that works.** `chess.js` + a plain CSS grid board, pass-and-play on one device, full rules including castling, en passant, promotion, and all draw conditions. No backend, no 3D. *Done when: you can play a complete legal game against yourself.*

**Phase 1.5 — make it feel good.** Paper textures, SVG pieces, and the motion set in §19: lift, arc, overshoot, and the shadow that spreads and tightens. Pure presentation, no logic changes. *Done when: moving a piece feels satisfying enough that you keep doing it for no reason.*

**Phase 2 — accounts.** Supabase Auth, `profiles` table, username selection, RLS policies. *Done when: you and your brother both have accounts.*

**Phase 3 — the first real game.** `create-game`, `accept-invite`, `submit-move`, Realtime board sync. No clocks, no ratings. *Done when: you play him across the world for the first time in years.*

**Phase 4 — clocks and endings.** Server clock, timeout, resign, draw offers, disconnect grace period, `claim-result`. *Done when: games end properly without anyone refreshing.*

**Phase 5 — ratings and leaderboard.** Elo on finalisation, leaderboard view, head-to-head, profile stats, game archive with replay. *Done when: the score between you two is officially being kept again.*

**Phase 6 — offline.** PWA manifest, service worker, Stockfish WASM, IndexedDB, offline game archive. *Done when: the app opens and plays in airplane mode.*

Phase 3 is the emotional milestone; phase 5 is the one that settles the argument.

---

## 16. Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # Edge Functions ONLY — never in NEXT_PUBLIC_*
```

If the service role key ever ships to the browser, every RLS policy in section 5 becomes decorative. Check your bundle.

---

## 17. Decisions locked for MVP

| Decision | Choice |
|---|---|
| Correspondence mode | Out |
| Spectating | Out |
| Guest accounts | Out — sign-up required |
| Vs-computer rated | No |
| Leaderboard scope | Online multiplayer only |
| Disconnect | Opponent wins after 30s grace |
| Chat / reactions | Out |
| Leaderboard filters | All-time only |
| Starting rating | 1200 |
| Leaderboard minimum | 5 rated games |

## 18. Still open

1. **Do unrated games appear in the game archive?** Recommendation: yes, but filtered out by default and clearly badged "unrated". They're still your history.
2. **Rematch colour.** Standard is to swap — whoever had white gets black. Worth confirming so it isn't a surprise.
3. **Draw offers on an untimed game.** With no clock there's nothing forcing a decision, so a stalled opponent can leave a game open forever. Simplest fix: the 10-minute `pg_cron` sweep already handles it as `abandoned`.
4. **Username changes.** If allowed, the game archive should store player IDs (it does) and resolve names at read time (it does) — so this is free. Just decide whether to allow it.

---

## 19. Visual design and motion

Two separate concerns, deliberately kept apart:

| Surface | Tech | Weight |
|---|---|---|
| Landing / marketing page | Three.js — paper-craft pawns, 3D scene | Heavy, route-scoped, never in the app bundle |
| Game board | 2D CSS grid + transform animation | Light, offline-capable, runs on anything |

**This split removes almost every risk from a full-3D board.** No GLTF models in the offline bundle. No WebGL requirement to play a game. No occlusion making the back rank ambiguous. No frameloop tuning. And no 2D fallback to maintain, because 2D *is* the board.

### 19.1 Landing page — Three.js

- Lives only in `app/(marketing)/page.tsx`. Nothing under `(app)/` imports Three
- `next/dynamic(..., { ssr: false })` with a **static poster image as the fallback**, so the poster is the LCP element and the page paints before any WebGL initialises
- Scene budget: two to four pawns, one shared geometry, instanced. This is a hero visual, not a product feature
- Idle motion — slow rotation, or camera drift tied to scroll position. Nothing that demands interaction
- Below ~768px, consider serving the poster image instead of the scene entirely. It's a landing page; nobody scrolls it twice, and mobile is where the cost lands
- `prefers-reduced-motion` → freeze to a static pose

**The marketing route is not part of the PWA offline shell.** Do not precache Three.js or the models. §13's offline budget stays exactly as it was: Stockfish and the app shell.

### 19.2 The paper aesthetic

Getting "paper" right is mostly restraint plus shadows.

- **Texture:** one tiled grain PNG (30–60 KB) or an SVG `feTurbulence` filter at low opacity. Not a full-bleed scan of a sheet of paper — that's megabytes for something nobody consciously sees
- **Board squares:** two paper tones rather than black and white. Warm off-white against a muted ink wash reads far more like print
- **Pieces: SVG, not raster.** Ink-drawn or woodcut style. SVG scales to any square size, weighs almost nothing, and lets you animate stroke and fill directly. This also means no asset pipeline and no model loading
- **Deckled edges:** an SVG mask on the board container. Subtle — a few pixels of irregularity, not a torn-paper effect
- **Shadows are warm, never neutral grey.** A slightly brown-tinted shadow at low opacity is the difference between "paper" and "a website with a beige background"
- **Type:** something with letterpress or printed character, two weights maximum

### 19.3 The board — 2D that feels dimensional

Build the board yourself as a CSS grid rather than using `react-chessboard`. It's a good library, but you'd spend more time overriding its animation choreography than writing 64 divs.

```
.board            grid 8×8, position: relative
  .square × 64    background layer, highlight rings, coordinates
  .piece × N      absolutely positioned, transform-driven
```

Pieces are positioned by transform, never by grid placement:

```ts
const style = {
  transform: `translate3d(${file * 100}%, ${rank * 100}%, 0)`,
  transition: 'transform 280ms cubic-bezier(.2,.9,.3,1)'
}
```

Changing the transform *is* the animation. The browser interpolates it for you. You don't need an animation library for basic movement.

**Only ever animate `transform` and `opacity`.** Both are GPU-composited and cost nothing. Animating `top` or `left` triggers layout on every single frame and will visibly stutter on a mid-range phone.

The moves that sell the depth:

| Effect | How |
|---|---|
| Lift on pickup | `scale(1.08)` + shadow grows and softens + raise `z-index` |
| Travel | `translate3d` on `cubic-bezier(.2,.9,.3,1)`, ~280ms |
| Knight arc | Wrapper element animates `translateY` on its own curve while the inner element translates X/Z — gives a real arc, not a straight slide |
| Landing | Slight overshoot: `scale(1.04)` settling to `scale(1)` over the last ~60ms |
| Capture | Captured piece: `scale(.85)`, fade, 2° rotate over 160ms, then unmount |
| Check | The king's *square* pulses. Never the piece — it may be mid-animation |
| Castling | King moves; rook follows 100ms behind |
| Promotion | Pawn scales to 0 as the new piece scales from 0, same square, 200ms |

**The highest-leverage detail by a wide margin is the shadow.** A piece whose shadow spreads and softens as it lifts, then tightens as it lands, reads as three-dimensional even though nothing has rotated and there's no perspective transform anywhere. Get this right and the "make it look 3D" brief is basically done.

A light `perspective` on `.board` plus a few degrees of `rotateX` is worth trying if you want more — but test it early, because it makes the far rank smaller and slightly harder to read. Optional, and easy to back out of.

**Animation queue.** Same rule as before: moves arriving from Realtime play sequentially, and if the queue is more than two deep (a reconnect catch-up), **snap instead of animating**. Watching twelve moves replay while your opponent waits looks broken.

**Reduced motion:** positional changes become instant, highlights and the shadow stay, the lift/arc/overshoot drop out. The board must remain fully playable.

### 19.4 What this buys you

- The board runs on any device — no WebGL dependency to play a game
- Offline bundle stays at Stockfish plus the app shell; SVG pieces are kilobytes
- The position is always readable, from every angle, because there are no angles
- No separate fallback renderer to build or keep in sync
- Three.js is confined to one route and never ships to a logged-in player
