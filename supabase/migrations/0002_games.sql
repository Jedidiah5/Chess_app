-- Phase 3: online games (schema includes clock/rating columns for Phase 4/5)

create table games (
  id                    uuid primary key default gen_random_uuid(),
  white_id              uuid not null references profiles(id),
  black_id              uuid references profiles(id),

  current_fen           text not null
                        default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ply                   integer not null default 0,

  status                game_status not null default 'waiting',
  result                game_result,
  reason                end_reason,
  rated                 boolean not null default true,

  initial_ms            integer not null,
  increment_ms          integer not null default 0,
  white_ms              integer not null,
  black_ms              integer not null,
  last_move_at          timestamptz,

  white_seen_at         timestamptz,
  black_seen_at         timestamptz,

  white_rating_before   integer,
  black_rating_before   integer,
  white_rating_delta    integer,
  black_rating_delta    integer,

  created_at            timestamptz not null default now(),
  started_at            timestamptz,
  ended_at              timestamptz,

  constraint distinct_players check (white_id <> black_id)
);

create index games_white_idx on games(white_id);
create index games_black_idx on games(black_id);
create index games_active_idx on games(status) where status = 'active';

create table moves (
  game_id     uuid not null references games(id) on delete cascade,
  ply         integer not null,
  san         text not null,
  uci         text not null,
  fen_after   text not null,
  ms_left     integer not null,
  created_at  timestamptz not null default now(),
  primary key (game_id, ply)
);

create table game_invites (
  code        text primary key,
  game_id     uuid not null references games(id) on delete cascade,
  created_by  uuid not null references profiles(id),
  expires_at  timestamptz not null default now() + interval '24 hours'
);

alter table games enable row level security;
alter table moves enable row level security;
alter table game_invites enable row level security;

create policy games_read_own on games
  for select using (auth.uid() in (white_id, black_id));

create policy moves_read_own on moves
  for select using (exists (
    select 1 from games g
    where g.id = moves.game_id and auth.uid() in (g.white_id, g.black_id)
  ));

create policy invites_read on game_invites
  for select using (expires_at > now());

-- Atomic move + game update. Edge Functions call this with the service role.
create or replace function apply_move(
  p_game_id uuid,
  p_san text,
  p_uci text,
  p_fen_after text,
  p_ms_left integer,
  p_new_ply integer,
  p_status game_status,
  p_result game_result default null,
  p_reason end_reason default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into moves (game_id, ply, san, uci, fen_after, ms_left)
  values (p_game_id, p_new_ply, p_san, p_uci, p_fen_after, p_ms_left);

  update games
  set
    current_fen = p_fen_after,
    ply = p_new_ply,
    status = p_status,
    result = coalesce(p_result, result),
    reason = coalesce(p_reason, reason),
    last_move_at = case when p_status = 'active' then now() else last_move_at end,
    ended_at = case when p_status = 'finished' then now() else ended_at end
  where id = p_game_id;
end;
$$;

revoke all on function apply_move(
  uuid, text, text, text, integer, integer, game_status, game_result, end_reason
) from public;

grant execute on function apply_move(
  uuid, text, text, text, integer, integer, game_status, game_result, end_reason
) to service_role;

alter publication supabase_realtime add table public.moves;
alter publication supabase_realtime add table public.games;
