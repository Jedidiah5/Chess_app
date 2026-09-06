-- Phase 5: ratings, leaderboard, head-to-head, atomic finalise

create or replace view leaderboard as
select
  row_number() over (order by rating desc, games_played desc) as rank,
  id, username, avatar_url, rating, games_played, wins, losses, draws
from profiles
where games_played >= 5;

grant select on leaderboard to authenticated;
grant select on leaderboard to anon;

create or replace function head_to_head(me uuid, them uuid)
returns table (wins int, losses int, draws int, total int)
language sql
stable
security definer
set search_path = public
as $$
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

revoke all on function head_to_head(uuid, uuid) from public;
grant execute on function head_to_head(uuid, uuid) to authenticated;

-- Atomic finalise: row lock, idempotent, optional rating write.
create or replace function finalise_game(
  p_game_id uuid,
  p_result game_result,
  p_reason end_reason,
  p_white_delta integer,
  p_black_delta integer,
  p_expected_white_rating integer,
  p_expected_black_rating integer,
  p_white_ms integer default null,
  p_black_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g games%rowtype;
  white_prof profiles%rowtype;
  black_prof profiles%rowtype;
begin
  if p_white_delta + p_black_delta <> 0 then
    raise exception 'deltas_must_sum_to_zero';
  end if;

  select * into g from games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'game_not_found');
  end if;

  if g.status = 'abandoned' then
    return jsonb_build_object('ok', false, 'error', 'game_abandoned');
  end if;

  -- Already finalised with ratings (or unrated finish already recorded)
  if g.status = 'finished' and (
    g.white_rating_before is not null
    or g.rated = false
  ) and g.result is not null then
    -- Unrated finished: treat as idempotent success
    if g.rated = false then
      return jsonb_build_object(
        'ok', true,
        'already_finalised', true,
        'result', g.result,
        'reason', g.reason,
        'white_rating_delta', g.white_rating_delta,
        'black_rating_delta', g.black_rating_delta
      );
    end if;
    if g.white_rating_before is not null then
      return jsonb_build_object(
        'ok', true,
        'already_finalised', true,
        'result', g.result,
        'reason', g.reason,
        'white_rating_delta', g.white_rating_delta,
        'black_rating_delta', g.black_rating_delta
      );
    end if;
  end if;

  if g.status not in ('active', 'finished') then
    return jsonb_build_object('ok', false, 'error', 'game_not_active');
  end if;

  if g.black_id is null then
    return jsonb_build_object('ok', false, 'error', 'game_incomplete');
  end if;

  select * into white_prof from profiles where id = g.white_id for update;
  select * into black_prof from profiles where id = g.black_id for update;

  if g.rated then
    if white_prof.rating <> p_expected_white_rating
       or black_prof.rating <> p_expected_black_rating then
      return jsonb_build_object('ok', false, 'error', 'rating_changed');
    end if;
  end if;

  update games
  set
    status = 'finished',
    result = p_result,
    reason = p_reason,
    ended_at = coalesce(ended_at, now()),
    draw_offer_by = null,
    white_ms = coalesce(p_white_ms, white_ms),
    black_ms = coalesce(p_black_ms, black_ms),
    white_rating_before = case when rated then white_prof.rating else white_rating_before end,
    black_rating_before = case when rated then black_prof.rating else black_rating_before end,
    white_rating_delta = case when rated then p_white_delta else white_rating_delta end,
    black_rating_delta = case when rated then p_black_delta else black_rating_delta end
  where id = p_game_id;

  if g.rated then
    update profiles
    set
      rating = rating + p_white_delta,
      games_played = games_played + 1,
      wins = wins + case when p_result = 'white' then 1 else 0 end,
      losses = losses + case when p_result = 'black' then 1 else 0 end,
      draws = draws + case when p_result = 'draw' then 1 else 0 end
    where id = g.white_id;

    update profiles
    set
      rating = rating + p_black_delta,
      games_played = games_played + 1,
      wins = wins + case when p_result = 'black' then 1 else 0 end,
      losses = losses + case when p_result = 'white' then 1 else 0 end,
      draws = draws + case when p_result = 'draw' then 1 else 0 end
    where id = g.black_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_finalised', false,
    'result', p_result,
    'reason', p_reason,
    'white_rating_delta', case when g.rated then p_white_delta else null end,
    'black_rating_delta', case when g.rated then p_black_delta else null end
  );
end;
$$;

revoke all on function finalise_game(
  uuid, game_result, end_reason, integer, integer, integer, integer, integer, integer
) from public;

grant execute on function finalise_game(
  uuid, game_result, end_reason, integer, integer, integer, integer, integer, integer
) to service_role;

-- Abandoned games stay unrated and never touch Elo (§11 / Phase 5).
update games set rated = false where status = 'abandoned' and rated = true;

select cron.unschedule('sweep-dead-games');

select cron.schedule(
  'sweep-dead-games',
  '*/5 * * * *',
  $$
  update public.games
  set status = 'abandoned', rated = false, ended_at = now()
  where status = 'active'
    and greatest(
      coalesce(white_seen_at, started_at),
      coalesce(black_seen_at, started_at)
    ) < now() - interval '10 minutes';
  $$
);
