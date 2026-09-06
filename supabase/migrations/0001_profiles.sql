-- Phase 2: profiles schema vocabulary (enums used by games in Phase 3)
create type game_status as enum ('waiting', 'active', 'finished', 'abandoned');
create type game_result as enum ('white', 'black', 'draw');
create type end_reason as enum (
  'checkmate', 'resignation', 'timeout', 'disconnect',
  'stalemate', 'threefold', 'fifty_move', 'insufficient_material', 'agreement'
);

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text,
  avatar_url    text,
  rating        integer not null default 1200,
  games_played  integer not null default 0,
  wins          integer not null default 0,
  losses        integer not null default 0,
  draws         integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint username_format check (
    username is null or username ~ '^[A-Za-z0-9_-]{3,20}$'
  ),
  constraint username_not_reserved check (
    username is null
    or lower(username) not in (
      'admin', 'login', 'play', 'profile', 'leaderboard', 'api', 'auth'
    )
  )
);

create unique index profiles_username_lower_idx on profiles (lower(username));

alter table profiles enable row level security;

create policy profiles_read on profiles
  for select using (true);

create policy profiles_update_self on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (rating, games_played, wins, losses, draws) on profiles from authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
