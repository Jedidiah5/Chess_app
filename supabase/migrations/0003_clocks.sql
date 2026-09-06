-- Phase 4: clocks, presence heartbeats, draw offers, dead-game sweep

alter table games
  add column draw_offer_by uuid references profiles(id);

-- Replace apply_move so it also writes clocks and clears any draw offer.
drop function if exists apply_move(
  uuid, text, text, text, integer, integer, game_status, game_result, end_reason
);

create or replace function apply_move(
  p_game_id uuid,
  p_san text,
  p_uci text,
  p_fen_after text,
  p_ms_left integer,
  p_new_ply integer,
  p_status game_status,
  p_result game_result default null,
  p_reason end_reason default null,
  p_white_ms integer default null,
  p_black_ms integer default null
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
    white_ms = coalesce(p_white_ms, white_ms),
    black_ms = coalesce(p_black_ms, black_ms),
    draw_offer_by = null,
    last_move_at = case when p_status = 'active' then now() else last_move_at end,
    ended_at = case when p_status = 'finished' then now() else ended_at end
  where id = p_game_id;
end;
$$;

revoke all on function apply_move(
  uuid, text, text, text, integer, integer, game_status, game_result, end_reason, integer, integer
) from public;

grant execute on function apply_move(
  uuid, text, text, text, integer, integer, game_status, game_result, end_reason, integer, integer
) to service_role;

-- Caller may update only their own seen_at on a game they play.
create or replace function touch_presence(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g games%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into g from games where id = p_game_id;
  if not found then
    raise exception 'game_not_found';
  end if;

  if g.status not in ('waiting', 'active') then
    return;
  end if;

  if g.white_id = uid then
    update games set white_seen_at = now() where id = p_game_id;
  elsif g.black_id = uid then
    update games set black_seen_at = now() where id = p_game_id;
  else
    raise exception 'not_a_player';
  end if;
end;
$$;

revoke all on function touch_presence(uuid) from public;
grant execute on function touch_presence(uuid) to authenticated;

-- Server clock for client display skew correction.
create or replace function server_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select now();
$$;

revoke all on function server_now() from public;
grant execute on function server_now() to authenticated;
grant execute on function server_now() to anon;

-- Sweep games where both players have been silent for 10 minutes.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'sweep-dead-games',
  '*/5 * * * *',
  $$
  update public.games
  set status = 'abandoned', ended_at = now()
  where status = 'active'
    and greatest(
      coalesce(white_seen_at, started_at),
      coalesce(black_seen_at, started_at)
    ) < now() - interval '10 minutes';
  $$
);
